import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import { matchStudentPreferences } from "../services/recommendationMatchingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to DB for matching and explanation calculation...");
    await connectDB();

    // Standard preference payload for calculating explanations
    const samplePayload = {
      academicsWeight: 40,
      placementsWeight: 30,
      infrastructureWeight: 20,
      trustWeight: 10
    };

    console.log("Running matching engine with payload:", samplePayload);
    const matches = await matchStudentPreferences(samplePayload);

    console.log(`Generated matches for ${matches.length} colleges.`);

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "recommendation-explanations-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(matches, null, 2), "utf8");
    console.log("Explanations report written to:", reportPath);

    // Provide console summary of CBIT and one low-scoring college as requested
    const cbit = matches.find(m => m.collegeCode === "CBIT");
    const lowScoring = matches.find(m => m.matchScore < 50) || matches[matches.length - 1];

    if (cbit) {
      console.log("\n================ CBIT (Sample Output) ================");
      console.log(JSON.stringify(cbit, null, 2));
    } else {
      console.log("\n⚠️ CBIT college not found in matches.");
    }

    if (lowScoring) {
      console.log("\n================ Low-scoring College (Sample Output) ================");
      console.log(JSON.stringify(lowScoring, null, 2));
    } else {
      console.log("\n⚠️ Low-scoring college not found in matches.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error during calculation:", err);
    process.exit(1);
  }
};

run();
