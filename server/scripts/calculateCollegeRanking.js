import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { computeRanking } from "../services/rankingEngineService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to DB for ranking calculation...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.`);

    const details = [];
    for (const college of colleges) {
      const ranking = computeRanking(college);
      // Persist ranking under officialData.ranking
      college.officialData = college.officialData || {};
      college.officialData.ranking = ranking;
      await college.save();
      details.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        ranking,
      });
    }

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, "college-ranking-report.json");
    fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), details }, null, 2), "utf8");

    console.log("Ranking calculation complete. Report written to:", reportPath);
    process.exit(0);
  } catch (err) {
    console.error("Error during ranking calculation:", err);
    process.exit(1);
  }
};

run();
