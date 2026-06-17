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
      const facilitiesCoverage = college.officialData?.facilitiesCoverage || {};
      const coverageDetails = college.officialData?.coverageDetails || {};
      const facilityCoverageScore = college.officialData?.facilityCoverageScore ?? null;
      const facilityQualityScore = college.officialData?.facilityQualityScore ?? null;
      const facilityStrengthScore = college.officialData?.facilityStrengthScore ?? null;

      totalCollegesChecked++;
      console.log(`Verifying facilities coverage and scoring for [${code}]...`);

      // 1. Assert no duplicate facilityStrengthScore storage inside facilities sub-document
      if (facilities.facilityStrengthScore !== undefined) {
        errors.push(`❌ Duplicate Score Storage: College "${code}" has duplicate facilityStrengthScore inside officialData.facilities sub-document`);
      }

      // 2. Assert page coverage recorded & check keys
      const requiredCoverageKeys = ["facilitiesPage", "infrastructurePage", "hostelPage", "libraryPage", "sportsPage"];
      requiredCoverageKeys.forEach(key => {
        if (typeof facilitiesCoverage[key] !== "boolean") {
          errors.push(`❌ Invalid/Missing Coverage Flag: College "${code}" has missing or non-boolean coverage flag for "${key}": ${facilitiesCoverage[key]}`);
        }
      });

      // 3. Assert coverage details are present
      if (typeof coverageDetails.attemptedPages !== "number" || 
          typeof coverageDetails.successfulPages !== "number" || 
          typeof coverageDetails.failedPages !== "number") {
        errors.push(`❌ Missing/Invalid Coverage Details: College "${code}" has invalid coverageDetails properties`);
      } else {
        // Assert attemptedPages matches successful + failed pages
        const calculatedAttempted = coverageDetails.successfulPages + coverageDetails.failedPages;
        if (coverageDetails.attemptedPages !== calculatedAttempted) {
          errors.push(`❌ Attempted Pages Mismatch: College "${code}" has attemptedPages ${coverageDetails.attemptedPages} but calculated sum is ${calculatedAttempted}`);
        }

        // Assert attemptedPages does not exceed 5 (prevent category inflation)
        if (coverageDetails.attemptedPages > 5) {
          errors.push(`❌ Attempted Pages Inflation: College "${code}" has attemptedPages ${coverageDetails.attemptedPages} (> 5)`);
        }
      }

      // 4. Assert coverage score calculated correctly based on successfulPages
      const expectedCoverageScore = (coverageDetails.successfulPages || 0) * 20;
      if (facilityCoverageScore !== expectedCoverageScore) {
        errors.push(`❌ Coverage Score Mismatch: College "${code}" has coverage score ${facilityCoverageScore} but expected is ${expectedCoverageScore}`);
      }

      // 5. Assert quality score matches average confidence of detected facilities
      let detectedCount = 0;
      let sumConfidences = 0;
      Object.keys(FACILITY_KEYWORDS).forEach(facility => {
        const facDetail = facilities[facility] || {};
        if (facDetail.detected) {
          detectedCount++;
          sumConfidences += facDetail.confidence || 0;

          // Nested verification for detected facility
          const evidence = facDetail.evidence || {};
          if (!evidence.text || !evidence.sourceUrl || !evidence.matchedKeyword) {
            errors.push(`❌ Missing Evidence Details: College "${code}", facility "${facility}" is detected but has missing detailed evidence fields`);
          }
        }
      });

      totalFacilitiesEnabledCount += detectedCount;

      const expectedQualityScore = detectedCount > 0 ? Math.round(sumConfidences / detectedCount) : 0;
      if (facilityQualityScore !== expectedQualityScore) {
        errors.push(`❌ Quality Score Mismatch: College "${code}" has quality score ${facilityQualityScore} but expected is ${expectedQualityScore}`);
      }

      // 6. Assert final strength score calculated correctly using weighted formula
      const quantityScore = (detectedCount / 18) * 100;
      const expectedStrengthScore = detectedCount > 0
        ? Math.round((quantityScore * 0.5) + (expectedQualityScore * 0.3) + (expectedCoverageScore * 0.2))
        : 0;

      if (facilityStrengthScore !== expectedStrengthScore) {
        errors.push(`❌ Strength Score Mismatch: College "${code}" has strength score ${facilityStrengthScore} but expected is ${expectedStrengthScore}`);
      }

      // 7. Assert facilitiesCount matches detected facilities
      if (detectedCount !== facilitiesCount) {
        errors.push(`❌ Count Mismatch: College "${code}" has facilitiesCount ${facilitiesCount} but calculated count is ${detectedCount}`);
      }

      // CBIT specific assertions
      if (code === "CBIT") {
        cbitChecked = true;
        if (detectedCount < 5) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Expected at least 5 facilities, found only ${detectedCount}`);
        }
        if (facilityStrengthScore === 0) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Expected facilityStrengthScore > 0, found ${facilityStrengthScore}`);
        }
        if (facilitiesCoverage.facilitiesPage !== true) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Expected facilitiesPage to be true, found false`);
        }
        if (coverageDetails.successfulPages !== 3) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Expected successfulPages to be 3, found ${coverageDetails.successfulPages}`);
        }
      }

      // Offline colleges specific assertions (KPRC, KPRT)
      if (code === "KPRC" || code === "KPRT") {
        if (facilityCoverageScore !== 0 || coverageDetails.successfulPages !== 0) {
          errors.push(`❌ Offline College Coverage Error: College "${code}" is offline but has non-zero coverage: score=${facilityCoverageScore}, successful=${coverageDetails.successfulPages}`);
        }
        if (detectedCount !== 0 || facilityStrengthScore !== 0 || facilityQualityScore !== 0) {
          errors.push(`❌ Offline College Scoring Error: College "${code}" is offline but has non-zero stats: detected=${detectedCount}, strength=${facilityStrengthScore}, quality=${facilityQualityScore}`);
        }
      }
    }

    const assertions = {
      noDuplicateScoreStorage: errors.filter(e => e.includes("Duplicate Score")).length === 0,
      pageCoverageRecorded: errors.filter(e => e.includes("Coverage Flag")).length === 0,
      coverageScoreCalculated: errors.filter(e => e.includes("Coverage Score")).length === 0,
      qualityScoreCalculated: errors.filter(e => e.includes("Quality Score")).length === 0,
      finalStrengthScoreCalculated: errors.filter(e => e.includes("Strength Score")).length === 0,
      noAttemptedPageInflation: errors.filter(e => e.includes("Inflation") || e.includes("Mismatch")).length === 0,
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
        totalFacilitiesEnabledCount,
        cbitChecked
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "facility-coverage-fix-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("FACILITIES COVERAGE FIX VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ No duplicate score storage: ${assertions.noDuplicateScoreStorage ? "PASS" : "FAIL"}`);
    console.log(`✓ Page coverage recorded: ${assertions.pageCoverageRecorded ? "PASS" : "FAIL"}`);
    console.log(`✓ Coverage score calculated: ${assertions.coverageScoreCalculated ? "PASS" : "FAIL"}`);
    console.log(`✓ Quality score calculated: ${assertions.qualityScoreCalculated ? "PASS" : "FAIL"}`);
    console.log(`✓ Strength score calculated: ${assertions.finalStrengthScoreCalculated ? "PASS" : "FAIL"}`);
    console.log(`✓ No attempted-page inflation: ${assertions.noAttemptedPageInflation ? "PASS" : "FAIL"}`);
    console.log(`✓ CBIT assertions passed: ${assertions.cbitAssertionsPassed ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Facilities coverage verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during facilities verification script:", error);
    process.exit(1);
  }
};

run();
