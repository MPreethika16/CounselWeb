import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import {
  extractPlacementYear,
  finalizePlacementRecord,
  flagSuspiciousPlacements
} from "../services/placementsExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const errors = [];
    const assertions = {
      confidenceRecalibrated: false,
      yearNormalized: false,
      recruiterEvidenceStored: false,
      pdfParsingWorks: false,
      suspiciousDataFlagged: false,
      cbitAssertionsPassed: false
    };

    // -------------------------------------------------------------------------
    // Unit Assertions 1: Year Normalization
    // -------------------------------------------------------------------------
    console.log("Running unit checks for Placement Year Hardening...");
    const yearTests = [
      { text: "Placements for the year 2025", expected: 2025 },
      { text: "Placement statistics for AY 2024-25 in our cell", expected: 2025 },
      { text: "AY 2023-24 placements list", expected: 2024 },
      { text: "AY 2024-2025 placements", expected: 2025 },
      { text: "Batch of 2025 graduation details", expected: 2025 },
      { text: "Batch 2023 placements", expected: 2023 },
      { text: "AY 2024-25 and Batch of 2025", expected: 2025 }
    ];

    let yearTestsPassed = true;
    for (const test of yearTests) {
      const result = extractPlacementYear(test.text);
      if (result !== test.expected) {
        errors.push(`❌ Year Extraction: Expected "${test.expected}" for "${test.text}", but got "${result}"`);
        yearTestsPassed = false;
      }
    }
    assertions.yearNormalized = yearTestsPassed;

    // -------------------------------------------------------------------------
    // Unit Assertions 2: Confidence Recalibration
    // -------------------------------------------------------------------------
    console.log("Running unit checks for Confidence Recalibration...");
    const confTests = [
      // 95 cases: any pkg or percentage found
      { merged: { highestPackage: 12, averagePackage: null, placementPercentage: null, recruiters: [], hasPlacementPage: false }, expected: 95 },
      { merged: { highestPackage: null, averagePackage: 6, placementPercentage: null, recruiters: [], hasPlacementPage: false }, expected: 95 },
      { merged: { highestPackage: null, averagePackage: null, placementPercentage: 90, recruiters: [], hasPlacementPage: false }, expected: 95 },
      // 80 cases: recruiters + placement page
      { merged: { highestPackage: null, averagePackage: null, placementPercentage: null, recruiters: [{ name: "TCS" }], hasPlacementPage: true }, expected: 80 },
      // 60 cases: recruiters only
      { merged: { highestPackage: null, averagePackage: null, placementPercentage: null, recruiters: [{ name: "TCS" }], hasPlacementPage: false }, expected: 60 },
      // 0 cases: no evidence
      { merged: { highestPackage: null, averagePackage: null, placementPercentage: null, recruiters: [], hasPlacementPage: false }, expected: 0 }
    ];

    let confTestsPassed = true;
    for (const test of confTests) {
      const record = finalizePlacementRecord(test.merged);
      if (record.confidence !== test.expected) {
        errors.push(`❌ Confidence Recalibration: Expected confidence ${test.expected} for ${JSON.stringify(test.merged)}, but got ${record.confidence}`);
        confTestsPassed = false;
      }
    }
    assertions.confidenceRecalibrated = confTestsPassed;

    // -------------------------------------------------------------------------
    // Unit Assertions 3: Suspicious Data Detection
    // -------------------------------------------------------------------------
    console.log("Running unit checks for Suspicious Data Detection...");
    const suspTests = [
      {
        record: { highestPackage: 10, averagePackage: 12, placementPercentage: 90 },
        expectedSuspicious: true,
        expectedReason: "Average Package > Highest Package"
      },
      {
        record: { highestPackage: 10, averagePackage: 5, placementPercentage: 105 },
        expectedSuspicious: true,
        expectedReason: "Placement Percentage > 100"
      },
      {
        record: { highestPackage: 160, averagePackage: 10, placementPercentage: 90 },
        expectedSuspicious: true,
        expectedReason: "Highest Package Unrealistic (>150 LPA)"
      },
      {
        record: { highestPackage: 100, averagePackage: 45, placementPercentage: 90 },
        expectedSuspicious: true,
        expectedReason: "Average Package Unrealistic (>40 LPA)"
      },
      {
        record: { highestPackage: 15, averagePackage: 6, placementPercentage: 90 },
        expectedSuspicious: false,
        expectedReason: ""
      }
    ];

    let suspTestsPassed = true;
    for (const test of suspTests) {
      const record = flagSuspiciousPlacements(test.record);
      if (record.suspicious !== test.expectedSuspicious) {
        errors.push(`❌ Suspicious Check: Expected suspicious=${test.expectedSuspicious} for ${JSON.stringify(test.record)}, but got suspicious=${record.suspicious}`);
        suspTestsPassed = false;
      }
      if (test.expectedSuspicious && !record.reviewRequired) {
        errors.push(`❌ Suspicious Check: Expected reviewRequired=true for ${JSON.stringify(test.record)}`);
        suspTestsPassed = false;
      }
      if (test.expectedSuspicious && !record.reviewReason?.includes(test.expectedReason)) {
        errors.push(`❌ Suspicious Check: Expected reviewReason to contain "${test.expectedReason}", got "${record.reviewReason}"`);
        suspTestsPassed = false;
      }
    }
    assertions.suspiciousDataFlagged = suspTestsPassed;

    // -------------------------------------------------------------------------
    // Integration Assertions: Read Database records
    // -------------------------------------------------------------------------
    console.log("Reading extraction records from Database...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    let cbitChecked = false;
    let recruiterEvidenceValid = true;
    let pdfParsingValid = false;

    for (const college of colleges) {
      const code = college.collegeCode;
      const plc = college.officialData?.placements || {};

      console.log(`Verifying Database Record for [${code}]...`);

      // 1. Recruiters structure validation
      if (Array.isArray(plc.recruiters)) {
        if (plc.recruiters.length > 0) {
          for (const rec of plc.recruiters) {
            if (typeof rec !== "object" || !rec.name || typeof rec.confidence !== "number" || !rec.sourceUrl || !rec.evidenceText) {
              errors.push(`❌ Recruiter Structure: College [${code}] has invalid recruiter item format: ${JSON.stringify(rec)}`);
              recruiterEvidenceValid = false;
            }
          }
        }
      } else {
        errors.push(`❌ Recruiters Field: College [${code}] recruiters is not an array`);
        recruiterEvidenceValid = false;
      }

      // 2. CBIT-specific validations
      if (code === "CBIT") {
        cbitChecked = true;
        
        // Assert mock PDF parsing works:
        // We seeded mock PDF to yield: Highest Package: 52, Average Package: 8.5, Placement Rate: 98
        if (plc.highestPackage === 52 && plc.averagePackage === 8.5 && plc.placementPercentage === 98) {
          pdfParsingValid = true;
        } else {
          errors.push(`❌ PDF Parsing: CBIT did not parse PDF values correctly. Got highest=${plc.highestPackage}, avg=${plc.averagePackage}, percentage=${plc.placementPercentage}`);
        }

        // Confidence should be 95 since pkg stats are found
        if (plc.confidence !== 95) {
          errors.push(`❌ CBIT Confidence: Expected 95, got ${plc.confidence}`);
        }

        // Schema type checks
        if (typeof plc.reviewRequired !== "boolean") {
          errors.push(`❌ Schema Types: reviewRequired should be boolean, got ${typeof plc.reviewRequired}`);
        }
      }
    }

    assertions.recruiterEvidenceStored = recruiterEvidenceValid;
    assertions.pdfParsingWorks = pdfParsingValid;

    if (cbitChecked && pdfParsingValid && recruiterEvidenceValid) {
      assertions.cbitAssertionsPassed = true;
    }

    // Status compilation
    const status = errors.length === 0 ? "PASSED" : "FAILED";
    const metrics = {
      collegesChecked: colleges.length,
      cbitChecked
    };

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "placement-hardening-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("PLACEMENT HARDENING VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ Confidence Recalibrated:         ${assertions.confidenceRecalibrated ? "PASS" : "FAIL"}`);
    console.log(`✓ Year Normalized:                  ${assertions.yearNormalized ? "PASS" : "FAIL"}`);
    console.log(`✓ PDF Parsing Works:                ${assertions.pdfParsingWorks ? "PASS" : "FAIL"}`);
    console.log(`✓ Recruiter Evidence Stored:        ${assertions.recruiterEvidenceStored ? "PASS" : "FAIL"}`);
    console.log(`✓ Suspicious Data Flagged:          ${assertions.suspiciousDataFlagged ? "PASS" : "FAIL"}`);
    console.log(`✓ CBIT Assertions Passed:           ${assertions.cbitAssertionsPassed ? "PASS" : "FAIL"}`);
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during placement hardening verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Placement hardening verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during placement hardening verification:", error);
    process.exit(1);
  }
};

run();
