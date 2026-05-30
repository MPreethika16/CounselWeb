import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import College from "../models/College.js";
import connectDB from "../config/db.js";

const runMigration = async () => {
  try {
    await connectDB();

    console.log("Starting migration to set year to 2024 for existing records...");

    // Find documents missing the 'year' field or where 'year' is null/undefined
    const query = {
      $or: [
        { year: { $exists: false } },
        { year: null }
      ]
    };

    const countMissing = await College.countDocuments(query);
    console.log(`Found ${countMissing} documents missing 'year' field.`);

    if (countMissing > 0) {
      const result = await College.updateMany(query, { $set: { year: 2024 } });
      console.log(`Migration successful! Updated ${result.modifiedCount} documents to year: 2024 ✅`);
    } else {
      console.log("No documents missing the 'year' field were found. No updates needed. ✅");
    }

    // Explicitly sync/rebuild indexes in the background to ensure unique index is created properly
    console.log("Syncing database indexes...");
    await College.syncIndexes();
    console.log("Indexes synced successfully! ✅");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed with error:", error);
    process.exit(1);
  }
};

runMigration();
