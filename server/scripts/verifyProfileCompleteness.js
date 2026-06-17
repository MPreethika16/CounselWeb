import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database for verification...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges to verify.`);

    const reportPath = path.resolve(__dirname, "../../reports/profile-completeness-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found at: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    console.log("Loaded profile-completeness-report.json");

    const assertions = {
      scoreInValidRange: true,
      breakdownEqualsScore: true,
      missingSectionsAccurate: true,
      verifiedCollegesScoreHigher: true,
      offlineCollegesScoreAppropriatelyLower: true
    };
    const errors = [];

    // Find specific colleges for comparative checks
    let cbitScore = null;
    let offlineScores = [];
    let incompleteScores = [];

    for (const col of colleges) {
      const pc = col.officialData?.profileCompleteness;
      if (!pc) {
        errors.push(`[${col.collegeCode}] profileCompleteness object is missing`);
        continue;
      }

      // 1. Assert score between 0 and 100
      if (pc.score < 0 || pc.score > 100) {
        errors.push(`[${col.collegeCode}] Score (${pc.score}) is out of range 0-100`);
        assertions.scoreInValidRange = false;
      }

      // 2. Assert breakdown totals equal score
      const breakdownSum = Object.values(pc.breakdown || {}).reduce((s, v) => s + v, 0);
      if (breakdownSum !== pc.score) {
        errors.push(`[${col.collegeCode}] Breakdown sum (${breakdownSum}) does not match score (${pc.score})`);
        assertions.breakdownEqualsScore = false;
      }

      // 3. Assert missingSections accurate
      const maxPoints = {
        website: 10,
        gallery: 15,
        contact: 15,
        address: 10,
        facilities: 15,
        accreditation: 15,
        placements: 15,
        health: 5
      };
      
      const missingList = pc.missingSections || [];
      for (const [section, maxVal] of Object.entries(maxPoints)) {
        const scoreVal = pc.breakdown?.[section] || 0;
        const shouldBeMissing = scoreVal < maxVal;
        const isMissing = missingList.includes(section);
        
        if (section === "facilities") {
          const expectedMissing = scoreVal < 12;
          if (expectedMissing !== isMissing) {
            errors.push(`[${col.collegeCode}] missingSections mismatch for facilities: score=${scoreVal}, expectedMissing=${expectedMissing}, isMissing=${isMissing}`);
            assertions.missingSectionsAccurate = false;
          }
        } else {
          if (shouldBeMissing !== isMissing) {
            errors.push(`[${col.collegeCode}] missingSections mismatch for ${section}: score=${scoreVal}, max=${maxVal}, expectedMissing=${shouldBeMissing}, isMissing=${isMissing}`);
            assertions.missingSectionsAccurate = false;
          }
        }
      }

      // Track college scores for comparisons
      if (col.collegeCode === "CBIT") {
        cbitScore = pc.score;
      } else {
        const isOffline = col.officialWebsite?.health?.healthy === false;
        if (isOffline) {
          offlineScores.push(pc.score);
        } else {
          incompleteScores.push(pc.score);
        }
      }
    }

    // 4. Assert verified colleges score higher than incomplete/offline colleges
    if (cbitScore !== null) {
      console.log(`CBIT Completeness Score: ${cbitScore}`);
      for (const score of incompleteScores) {
        if (cbitScore <= score) {
          errors.push(`CBIT score (${cbitScore}) is not higher than incomplete college score (${score})`);
          assertions.verifiedCollegesScoreHigher = false;
        }
      }
      for (const score of offlineScores) {
        if (cbitScore <= score) {
          errors.push(`CBIT score (${cbitScore}) is not higher than offline college score (${score})`);
          assertions.verifiedCollegesScoreHigher = false;
        }
      }
    } else {
      errors.push("CBIT was not found in CollegeMaster records to run verified comparison");
      assertions.verifiedCollegesScoreHigher = false;
    }

    // 5. Assert offline colleges score appropriately lower
    if (offlineScores.length > 0) {
      console.log(`Offline college scores: [${offlineScores.join(", ")}]`);
      for (const score of offlineScores) {
        if (score >= 85) {
          errors.push(`Offline college score (${score}) is not appropriately lower (< 85)`);
          assertions.offlineCollegesScoreAppropriatelyLower = false;
        }
      }
    }

    const allPassed = Object.values(assertions).every(Boolean) && errors.length === 0;
    const status = allPassed ? "PASSED" : "FAILED";

    const verificationResult = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: colleges.length,
        cbitScore
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const verificationPath = path.join(reportsDir, "profile-completeness-verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log(`PROFILE COMPLETENESS VERIFICATION COMPLETE: ${status}`);
    console.log("------------------------------------------------");
    if (errors.length > 0) {
      console.error("Errors found:");
      errors.forEach(e => console.error(` - ${e}`));
    } else {
      console.log("All assertions passed successfully!");
    }
    console.log(`Results written to: ${verificationPath}`);
    console.log("------------------------------------------------\n");

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error("Error during verification run:", err);
    process.exit(1);
  }
};

run();
