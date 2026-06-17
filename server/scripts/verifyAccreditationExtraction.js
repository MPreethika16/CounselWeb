import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import { NORMALIZED_NAAC_GRADES, NORMALIZED_AFFILIATIONS } from "../services/accreditationExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching colleges with active raw page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    console.log(`Found ${colleges.length} college(s) to verify.`);

    const errors = [];
    let totalCollegesChecked = 0;
    let cbitChecked = false;
    let cbitAssertionsPassed = true;

    for (const college of colleges) {
      const code = college.collegeCode;
      const acc = college.officialData?.accreditation || {};

      totalCollegesChecked++;
      console.log(`Verifying accreditation details for [${code}]...`);

      // Assert NAAC grade normalized
      if (acc.naacGrade && !NORMALIZED_NAAC_GRADES.includes(acc.naacGrade)) {
        errors.push(`❌ Invalid NAAC Grade: College "${code}" has unnormalized grade: "${acc.naacGrade}"`);
      }

      // Assert affiliation normalized
      if (acc.affiliation && !NORMALIZED_AFFILIATIONS.includes(acc.affiliation)) {
        errors.push(`❌ Invalid Affiliation: College "${code}" has unnormalized affiliation: "${acc.affiliation}"`);
      }

      // Assert autonomous is boolean
      if (typeof acc.autonomous !== "boolean") {
        errors.push(`❌ Invalid Autonomous Flag: College "${code}" autonomous property is not a boolean: ${acc.autonomous}`);
      }

      // Assert AICTE is boolean
      if (typeof acc.aicteApproved !== "boolean") {
        errors.push(`❌ Invalid AICTE Flag: College "${code}" aicteApproved property is not a boolean: ${acc.aicteApproved}`);
      }

      // Assert confidence limits
      if (typeof acc.confidence !== "number" || acc.confidence < 0 || acc.confidence > 100) {
        errors.push(`❌ Invalid Confidence: College "${code}" has invalid confidence: ${acc.confidence}`);
      }

      // Assert sourceUrl and evidenceText if confidence > 0
      if (acc.confidence > 0) {
        if (!acc.sourceUrl || typeof acc.sourceUrl !== "string" || !acc.sourceUrl.startsWith("http")) {
          errors.push(`❌ Missing/Invalid Source URL: College "${code}" has confidence ${acc.confidence} but no valid sourceUrl: "${acc.sourceUrl}"`);
        }
        if (!acc.evidenceText || typeof acc.evidenceText !== "string" || acc.evidenceText.trim() === "") {
          errors.push(`❌ Missing Evidence Text: College "${code}" has confidence ${acc.confidence} but evidenceText is empty`);
        }
      }

      // CBIT specific checks
      if (code === "CBIT") {
        cbitChecked = true;

        if (acc.naacGrade !== "A++") {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Assertion Mismatch: Expected NAAC Grade 'A++', found '${acc.naacGrade}'`);
        }

        if (acc.affiliation !== "OU") {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Assertion Mismatch: Expected Affiliation 'OU', found '${acc.affiliation}'`);
        }

        if (acc.autonomous !== true) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Assertion Mismatch: Expected Autonomous 'true', found '${acc.autonomous}'`);
        }

        if (acc.confidence !== 95) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Assertion Mismatch: Expected Confidence 95, found ${acc.confidence}`);
        }

        if (acc.ugcRecognized !== true) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Assertion Mismatch: Expected UGC Recognized 'true', found '${acc.ugcRecognized}'`);
        }

        if (acc.nbaAccredited !== true) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Assertion Mismatch: Expected NBA Accredited 'true', found '${acc.nbaAccredited}'`);
        }
      }
    }

    const assertions = {
      naacGradeNormalized: errors.filter(e => e.includes("Invalid NAAC Grade")).length === 0,
      affiliationNormalized: errors.filter(e => e.includes("Invalid Affiliation")).length === 0,
      autonomousStatusExtracted: errors.filter(e => e.includes("Autonomous Flag")).length === 0,
      aicteStatusExtracted: errors.filter(e => e.includes("AICTE Flag")).length === 0,
      confidenceStored: errors.filter(e => e.includes("Invalid Confidence")).length === 0,
      evidenceStored: errors.filter(e => e.includes("Evidence Text")).length === 0,
      sourceUrlStored: errors.filter(e => e.includes("Source URL")).length === 0,
      cbitAssertionsPassed
    };

    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: totalCollegesChecked,
        cbitChecked
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "accreditation-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("ACCREDITATION VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ NAAC Grade Normalized: ${assertions.naacGradeNormalized ? "PASS" : "FAIL"}`);
    console.log(`✓ Affiliation Normalized: ${assertions.affiliationNormalized ? "PASS" : "FAIL"}`);
    console.log(`✓ Autonomous Status Extracted: ${assertions.autonomousStatusExtracted ? "PASS" : "FAIL"}`);
    console.log(`✓ AICTE Status Extracted: ${assertions.aicteStatusExtracted ? "PASS" : "FAIL"}`);
    console.log(`✓ Confidence Stored Correctly: ${assertions.confidenceStored ? "PASS" : "FAIL"}`);
    console.log(`✓ Evidence Stored Correctly: ${assertions.evidenceStored ? "PASS" : "FAIL"}`);
    console.log(`✓ Source URL Stored Correctly: ${assertions.sourceUrlStored ? "PASS" : "FAIL"}`);
    console.log(`✓ CBIT Assertions Passed: ${assertions.cbitAssertionsPassed ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Accreditation verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during accreditation verification script:", error);
    process.exit(1);
  }
};

run();
