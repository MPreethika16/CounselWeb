import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/db.js";
import College from "../models/College.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(
  __dirname,
  "../../college_scraper/data/college_codes.json"
);

const exportCollegeCodes = async () => {
  try {
    await connectDB();

    const colleges = await College.aggregate([
      {
        $group: {
          _id: "$collegeCode",
          collegeCode: { $first: "$collegeCode" },
          name: { $first: "$name" },
          place: { $first: "$place" },
          district: { $first: "$district" },
          affiliated: { $first: "$affiliated" },
          fees: { $first: "$fees" },
          branches: { $addToSet: "$branchCode" }
        }
      },
      {
        $project: {
          _id: 0,
          collegeCode: 1,
          name: 1,
          place: 1,
          district: 1,
          affiliated: 1,
          fees: 1,
          branches: 1
        }
      },
      {
        $sort: {
          name: 1
        }
      }
    ]);

    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(colleges, null, 2),
      "utf-8"
    );

    console.log(`✅ Exported ${colleges.length} unique colleges`);
    console.log(`📁 Saved to ${OUTPUT_FILE}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Export failed:", err.message);
    process.exit(1);
  }
};

exportCollegeCodes();