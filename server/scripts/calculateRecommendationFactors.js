import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import {
  computeRecommendationFactors,
  computeReadinessSummary,
} from "../services/recommendationEngineService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to DB for recommendation factors calculation...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.`);

    const details = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const college of colleges) {
      try {
        const factors = computeRecommendationFactors(college);
        const readiness = computeReadinessSummary(factors);

        // Persist recommendation factors under officialData.recommendationFactors
        college.officialData = college.officialData || {};
        college.officialData.recommendationFactors = {
          academicStrength: factors.academicStrength,
          placementStrength: factors.placementStrength,
          infrastructureStrength: factors.infrastructureStrength,
          trustStrength: factors.trustStrength,
          affordabilityStrength: factors.affordabilityStrength,
          locationStrength: factors.locationStrength,
        };
        await college.save();

        details.push({
          collegeCode: college.collegeCode,
          collegeName: college.collegeName,
          factors,
          readiness,
        });
        totalProcessed++;
      } catch (err) {
        console.error(`Error processing ${college.collegeCode}:`, err.message);
        details.push({
          collegeCode: college.collegeCode,
          collegeName: college.collegeName,
          error: err.message,
        });
        totalErrors++;
      }
    }

    // Summary stats
    const summary = {
      totalColleges: colleges.length,
      totalProcessed,
      totalErrors,
      averageReadiness: details.length
        ? Math.round(
            details
              .filter((d) => d.readiness)
              .reduce((sum, d) => sum + d.readiness.readinessPercent, 0) /
              details.filter((d) => d.readiness).length
          )
        : 0,
    };

    // Write report
    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, "recommendation-factors-report.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        { timestamp: new Date().toISOString(), summary, details },
        null,
        2
      ),
      "utf8"
    );

    console.log(`\nRecommendation factors calculation complete.`);
    console.log(`  Processed: ${totalProcessed}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log(`  Report: ${reportPath}`);
    process.exit(0);
  } catch (err) {
    console.error("Error during recommendation factors calculation:", err);
    process.exit(1);
  }
};

run();
