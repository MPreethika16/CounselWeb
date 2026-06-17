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

    const targetCodes = ["CBIT", "VJEC", "CVRH", "GRRR"];
    const colleges = await CollegeMaster.find({ collegeCode: { $in: targetCodes } });
    console.log(`Found ${colleges.length} colleges to verify.`);

    const reportPath = path.resolve(__dirname, "../../reports/placement-consistency-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found at: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    console.log("Loaded placement-consistency-report.json");

    const assertions = {
      sourceSummaryMatchesWinningLineage: true,
      recruitersCountMatchesLength: true,
      outlierPackagesFlagged: true,
      noSourceTypeConflicts: true
    };
    const errors = [];

    // Verify each target college
    for (const col of colleges) {
      const plc = col.officialData?.placements;
      if (!plc) continue;

      console.log(`\nVerifying college: [${col.collegeCode}]`);
      console.log(`  Highest: ${plc.highestPackage}, Average: ${plc.averagePackage}`);
      console.log(`  recruitersCount: ${plc.recruitersCount}, recruiters.length: ${plc.recruiters.length}`);
      console.log(`  primarySourceType: "${plc.sourceSummary?.primarySourceType}", primarySourceUrl: "${plc.sourceSummary?.primarySourceUrl}"`);

      // 1. Verify recruitersCount matches recruiters.length
      if (plc.recruitersCount !== plc.recruiters.length) {
        errors.push(`[${col.collegeCode}] recruitersCount (${plc.recruitersCount}) does not match recruiters.length (${plc.recruiters.length})`);
        assertions.recruitersCountMatchesLength = false;
      }

      // 2. Verify sourceSummary matches winning lineage and no sourceType conflicts
      if (plc.sourceSummary) {
        const { primarySourceType, primarySourceUrl } = plc.sourceSummary;
        
        const metrics = [
          "highestPackage",
          "averagePackage",
          "medianPackage",
          "placementPercentage",
          "totalOffers",
          "totalPlacedStudents",
          "placementYear"
        ];

        let bestMetric = null;
        let highestConf = -1;
        let matchFound = false;
        let hasMetrics = false;

        for (const m of metrics) {
          if (plc[m] !== null) {
            hasMetrics = true;
            const lin = plc.lineage?.[m];
            if (lin && lin.sourceUrl === primarySourceUrl && lin.sourceType === primarySourceType) {
              matchFound = true;
            }
          }
        }

        if (hasMetrics && !matchFound) {
          errors.push(`[${col.collegeCode}] sourceSummary does not match any lineage metric (primarySourceUrl: ${primarySourceUrl}, primarySourceType: ${primarySourceType})`);
          assertions.sourceSummaryMatchesWinningLineage = false;
          assertions.noSourceTypeConflicts = false;
        }
      } else {
        errors.push(`[${col.collegeCode}] sourceSummary is missing`);
        assertions.sourceSummaryMatchesWinningLineage = false;
      }

      // 3. Verify outlier packages flagged
      if (col.collegeCode === "CBIT") {
        if (plc.highestPackage > 75) {
          if (!plc.suspicious || !plc.reviewRequired || !plc.reviewReason) {
            errors.push(`[${col.collegeCode}] Outlier highest package (${plc.highestPackage} LPA > 75 LPA) was not flagged for review`);
            assertions.outlierPackagesFlagged = false;
          } else {
            console.log(`  ✓ Outlier flagged: ${plc.reviewReason}`);
          }
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
        collegesChecked: targetCodes.length
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const verificationPath = path.join(reportsDir, "placement-consistency-verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log(`PLACEMENT CONSISTENCY VERIFICATION COMPLETE: ${status}`);
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
