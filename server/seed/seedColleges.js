import mongoose from "mongoose";
import dotenv from "dotenv";
import College from "../models/College.js";
import colleges from "../data/colleges.json" assert { type: "json" };

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Extract year from CLI argument e.g. --year=2025 or default to 2025
    let year = 2025;
    const yearArg = process.argv.find((arg) => arg.startsWith("--year="));
    if (yearArg) {
      year = Number(yearArg.split("=")[1]);
    }

    const maxSupportedYear = (new Date()).getFullYear() + 1;
    if (!Number.isInteger(year) || year < 1900 || year > maxSupportedYear) {
      throw new Error("Invalid year specified. Please use --year=<number> with an integer between 1900 and " + maxSupportedYear);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log(`Pruning existing college records for year: ${year}...`);
      // Delete existing records only for the target year
      await College.deleteMany({ year }, { session });

      console.log(`Preparing to import ${colleges.length} records for year: ${year}...`);
      // Map each college record to include the year field
      const collegeDocs = colleges.map((c) => ({
        ...c,
        year,
      }));

      await College.insertMany(collegeDocs, { session });

      await session.commitTransaction();
      console.log(`Colleges inserted successfully for year ${year} ✅`);
      process.exit(0);
    } catch (txnError) {
      await session.abortTransaction();
      throw txnError;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("❌ Seeding failed with error:", err);
    process.exit(1);
  }
};

seedData();