import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { calculateTrustScore } from "../services/trustScoreService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database for verification...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges to verify.`);

    const reportPath = path.resolve(__dirname, "../../reports/trust-score-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found at: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    console.log("Loaded trust-score-report.json");

    const assertions = {
      scoreInValidRange: true,
      breakdownEqualsScore: true,
      verifiedCollegesScoreHigher: true,
      reviewFlagsGeneratedCorrectly: true,
      staleDataLosesFreshness: true
    };
    const errors = [];

    let cbitScore = null;
    let otherScores = [];

    for (const col of colleges) {
      const ts = col.officialData?.trustScore;
      if (!ts) {
        errors.push(`[${col.collegeCode}] trustScore object is missing`);
        continue;
      }

      // 1. Assert score between 0 and 100
      if (ts.score < 0 || ts.score > 100) {
        errors.push(`[${col.collegeCode}] Trust score (${ts.score}) is out of range 0-100`);
        assertions.scoreInValidRange = false;
      }

      // 2. Assert breakdown totals equal score
      const breakdownSum = Object.values(ts.breakdown || {}).reduce((s, v) => s + v, 0);
      if (breakdownSum !== ts.score) {
        errors.push(`[${col.collegeCode}] Trust breakdown sum (${breakdownSum}) does not match score (${ts.score})`);
        assertions.breakdownEqualsScore = false;
      }

      // 3. Assert review flags generated correctly
      const flags = ts.reviewFlags || [];
      const plc = col.officialData?.placements || {};
      const isPlcOutlier = plc.reviewRequired === true || plc.suspicious === true;
      if (isPlcOutlier && !flags.includes("placement_outlier")) {
        errors.push(`[${col.collegeCode}] Placement outlier flag is missing despite placement outlier condition being true`);
        assertions.reviewFlagsGeneratedCorrectly = false;
      }

      const acc = col.officialData?.accreditation || {};
      if (acc.reviewRequired === true && !flags.includes("affiliation_conflict")) {
        errors.push(`[${col.collegeCode}] Affiliation conflict flag is missing despite accreditation reviewRequired true`);
        assertions.reviewFlagsGeneratedCorrectly = false;
      }

      if (col.officialWebsite?.health?.healthy === false && !flags.includes("website_unhealthy")) {
        errors.push(`[${col.collegeCode}] Website unhealthy flag is missing despite health.healthy false`);
        assertions.reviewFlagsGeneratedCorrectly = false;
      }

      if (col.collegeCode === "CBIT") {
        cbitScore = ts.score;
        console.log(`CBIT Trust Score: ${cbitScore}, Flags: ${flags.join(", ") || "None"}`);
      } else {
        otherScores.push(ts.score);
      }
    }

    // 4. Assert verified colleges score higher
    if (cbitScore !== null) {
      for (const score of otherScores) {
        const matchingCol = colleges.find(c => c.officialData?.trustScore?.score === score);
        if (matchingCol && !matchingCol.officialWebsite?.verified && cbitScore <= score) {
          errors.push(`CBIT trust score (${cbitScore}) is not higher than unverified college [${matchingCol.collegeCode}] score (${score})`);
          assertions.verifiedCollegesScoreHigher = false;
        }
      }
    } else {
      errors.push("CBIT was not found in CollegeMaster to run verified comparison");
      assertions.verifiedCollegesScoreHigher = false;
    }

    // 5. Assert stale data loses freshness points
    const testCol = colleges[0];
    if (testCol) {
      console.log(`Mocking stale data for [${testCol.collegeCode}] to test freshness...`);
      const origNormalizedAt = testCol.metadata?.normalizedAt;
      
      testCol.metadata = testCol.metadata || {};
      testCol.metadata.normalizedAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      
      const staleTrust = calculateTrustScore(testCol);
      console.log(`  Stale trust freshness score: ${staleTrust.breakdown.dataFreshness} (expected < 10)`);
      if (staleTrust.breakdown.dataFreshness >= 10) {
        errors.push(`[${testCol.collegeCode}] Stale data did not lose freshness points: got ${staleTrust.breakdown.dataFreshness}`);
        assertions.staleDataLosesFreshness = false;
      }
      
      testCol.metadata.normalizedAt = origNormalizedAt;
    } else {
      errors.push("No college found to test stale data freshness points");
      assertions.staleDataLosesFreshness = false;
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

    const verificationPath = path.join(reportsDir, "trust-score-verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log(`TRUST SCORE VERIFICATION COMPLETE: ${status}`);
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
