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
    console.log("Connecting to database...");
    await connectDB();

    console.log("Resetting trustScore fields in CollegeMaster to avoid type cast conflicts...");
    await CollegeMaster.updateMany({}, {
      $unset: { "officialData.trustScore": "" }
    });

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.`);

    const details = [];
    let processed = 0;

    for (const college of colleges) {
      const trust = calculateTrustScore(college);
      
      college.officialData = college.officialData || {};
      college.officialData.trustScore = trust;
      college.markModified("officialData");
      await college.save();

      console.log(`[${college.collegeCode}] Trust Score: ${trust.score}/100, Flags: ${trust.reviewFlags.join(", ") || "None"}`);

      details.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        trustScore: trust
      });
      processed++;
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed: processed,
        averageScore: colleges.length > 0 ? (details.reduce((sum, d) => sum + d.trustScore.score, 0) / colleges.length) : 0
      },
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "trust-score-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("TRUST SCORE CALCULATION COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during trust score calculation:", error);
    process.exit(1);
  }
};

run();
