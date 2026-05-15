import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import College from "../models/College.js";
import connectDB from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to normalized data
const DATA_FILE = path.join(
  __dirname,
  "../../college_scraper/data/normalized_colleges.json"
);

const updateColleges = async () => {
  try {
    await connectDB();

    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const colleges = JSON.parse(raw);

    let updated = 0;
    let notFound = 0;

    for (const item of colleges) {
      if (!item.collegeCode) continue;

      const updateData = {
        placements: item.placements || {},
        facilities: item.facilities || {},
        ranking: item.ranking || {},
        sourceUrl: item.sourceUrl || null,
        lastScrapedAt: new Date()
      };

      if (Array.isArray(item.reviews) && item.reviews.length > 0) {
        updateData.reviews = item.reviews;
      }

      if (Array.isArray(item.gallery) && item.gallery.length > 0) {
        updateData.gallery = item.gallery;
      }

      const result = await College.updateMany(
        { collegeCode: item.collegeCode },
        { $set: updateData }
      );

      if (result.matchedCount > 0) {
        updated += result.matchedCount;
        console.log(
          `✅ Updated ${item.collegeCode} (${result.matchedCount} documents)`
        );
      } else {
        notFound++;
        console.log(`⚠️ College not found: ${item.collegeCode}`);
      }
    }

    console.log("\n🎉 Update Completed");
    console.log(`Updated documents: ${updated}`);
    console.log(`College codes not found: ${notFound}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

updateColleges();