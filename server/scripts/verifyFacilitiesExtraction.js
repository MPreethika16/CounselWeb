import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import { FACILITY_KEYWORDS } from "../services/facilitiesExtractor.js";

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
    let totalFacilitiesEnabledCount = 0;

    let cbitChecked = false;
    let cbitAssertionsPassed = true;

    for (const college of colleges) {
      const code = college.collegeCode;
      const facilities = college.officialData?.facilities || {};
      const facilitiesCount = college.officialData?.facilitiesCount || 0;

      totalCollegesChecked++;
      console.log(`Verifying facilities extraction for [${code}]...`);

      const value = facilities.value || {};
      const confidence = facilities.confidence || {};
      const sourceUrls = facilities.sourceUrls || [];
      const evidence = facilities.evidence || [];

      // 1. Assert facilitiesCount matches enabled facilities
      let calculatedCount = 0;
      const enabledList = [];
      Object.entries(value).forEach(([facility, val]) => {
        // Verify key is in valid catalog
        if (!Object.keys(FACILITY_KEYWORDS).includes(facility)) {
          errors.push(`❌ Unknown Facility Key: College "${code}" has unknown facility key: "${facility}"`);
        }
        if (val) {
          calculatedCount++;
          enabledList.push(facility);
        }
      });
      totalFacilitiesEnabledCount += calculatedCount;

      if (calculatedCount !== facilitiesCount) {
        errors.push(`❌ Count Mismatch: College "${code}" has facilitiesCount ${facilitiesCount} but calculated count is ${calculatedCount}`);
      }

      // 2. Assert confidence exists and is valid for each enabled facility
      enabledList.forEach(facility => {
        const conf = confidence[facility];
        if (conf === undefined || conf === null) {
          errors.push(`❌ Missing Confidence: College "${code}" has enabled facility "${facility}" but missing confidence score`);
        } else if (conf <= 0 || conf > 100) {
          errors.push(`❌ Invalid Confidence: College "${code}" has enabled facility "${facility}" with invalid confidence score: ${conf}`);
        }
      });

      // 3. Assert evidence exists when any facility is enabled
      if (calculatedCount > 0) {
        if (evidence.length === 0) {
          errors.push(`❌ Missing Evidence: College "${code}" has ${calculatedCount} enabled facilities but evidence array is empty`);
        }
        // 4. Assert source URLs are recorded
        if (sourceUrls.length === 0) {
          errors.push(`❌ Missing Source URLs: College "${code}" has ${calculatedCount} enabled facilities but sourceUrls array is empty`);
        }
      } else {
        if (evidence.length > 0) {
          errors.push(`❌ Stray Evidence: College "${code}" has 0 enabled facilities but evidence array has items: ${JSON.stringify(evidence)}`);
        }
        if (sourceUrls.length > 0) {
          errors.push(`❌ Stray Source URLs: College "${code}" has 0 enabled facilities but sourceUrls array has items: ${JSON.stringify(sourceUrls)}`);
        }
      }

      // CBIT specific checks
      if (code === "CBIT") {
        cbitChecked = true;
        // Assert that CBIT has at least 5 facilities
        if (calculatedCount < 5) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Expected at least 5 facilities, found only ${calculatedCount}`);
        }
        // Assert library is enabled
        if (!value.library) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: 'library' facility is not enabled for CBIT`);
        }
      }
    }

    const assertions = {
      cbitAssertionsPassed,
      facilitiesCountMatchesEnabled: errors.filter(e => e.includes("Count Mismatch")).length === 0,
      confidenceScoreValid: errors.filter(e => e.includes("Confidence")).length === 0,
      evidenceExistsForEnabled: errors.filter(e => e.includes("Missing Evidence") || e.includes("Stray Evidence")).length === 0,
      sourceUrlsStored: errors.filter(e => e.includes("Source URLs") || e.includes("Stray Source")).length === 0,
      noStrayKeysFound: errors.filter(e => e.includes("Unknown Facility")).length === 0
    };

    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: totalCollegesChecked,
        totalFacilitiesEnabledCount,
        cbitChecked
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "facilities-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("FACILITIES EXTRACTION VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ CBIT assertions passed: ${assertions.cbitAssertionsPassed ? "PASS" : "FAIL"}`);
    console.log(`✓ Count matches enabled: ${assertions.facilitiesCountMatchesEnabled ? "PASS" : "FAIL"}`);
    console.log(`✓ Confidence scores valid: ${assertions.confidenceScoreValid ? "PASS" : "FAIL"}`);
    console.log(`✓ Evidence exists for enabled: ${assertions.evidenceExistsForEnabled ? "PASS" : "FAIL"}`);
    console.log(`✓ Source URLs stored correctly: ${assertions.sourceUrlsStored ? "PASS" : "FAIL"}`);
    console.log(`✓ No stray facility keys: ${assertions.noStrayKeysFound ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Facilities verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during facilities verification script:", error);
    process.exit(1);
  }
};

run();
