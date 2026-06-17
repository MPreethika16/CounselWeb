import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { calculateProfileCompleteness } from "../services/profileCompletenessService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Resetting profileCompleteness fields in CollegeMaster to avoid type cast conflicts...");
    await CollegeMaster.updateMany({}, {
      $unset: { "officialData.profileCompleteness": "" }
    });

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.`);

    const details = [];
    let processed = 0;

    for (const college of colleges) {
      const completeness = calculateProfileCompleteness(college);
      
      college.officialData = college.officialData || {};
      college.officialData.profileCompleteness = completeness;
      college.markModified("officialData");
      await college.save();

      console.log(`[${college.collegeCode}] Score: ${completeness.score}/100, Missing: ${completeness.missingSections.join(", ") || "None"}`);

      details.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        profileCompleteness: completeness
      });
      processed++;
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed: processed,
        averageScore: colleges.length > 0 ? (details.reduce((sum, d) => sum + d.profileCompleteness.score, 0) / colleges.length) : 0
      },
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "profile-completeness-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("PROFILE COMPLETENESS CALCULATION COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during profile completeness calculation:", error);
    process.exit(1);
  }
};

run();
