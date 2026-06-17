import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import College from "../models/College.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the server root directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const verify = async () => {
  try {
    console.log("Connecting to the database...");
    await connectDB();
    console.log("Database connected. Starting verification...\n");

    const errors = [];

    // Fetch unique college codes from College
    const collegeCodes = await College.distinct("collegeCode");
    const collegeCodesSet = new Set(collegeCodes.map(c => c.toUpperCase().trim()));

    // Fetch all CollegeMaster documents
    const masters = await CollegeMaster.find({});
    
    // Track codes to detect duplicate CollegeMaster records
    const masterCodesSeen = new Map();

    const validDiscoveryStatus = new Set(["pending", "discovered", "verified", "not_found"]);

    for (const master of masters) {
      const code = master.collegeCode.toUpperCase().trim();
      
      // 2. No duplicate college codes
      if (masterCodesSeen.has(code)) {
        errors.push(`❌ Duplicate CollegeMaster: Code "${code}" is present multiple times in CollegeMaster collection (IDs: ${masterCodesSeen.get(code)}, ${master._id})`);
      } else {
        masterCodesSeen.set(code, master._id.toString());
      }

      // 3. No orphan CollegeMaster records
      if (!collegeCodesSet.has(code)) {
        errors.push(`❌ Orphan CollegeMaster: Code "${code}" exists in CollegeMaster but not in raw College collection`);
      }

      // 4. No duplicate aliases
      if (master.aliases && Array.isArray(master.aliases)) {
        const uniqueAliases = new Set(master.aliases);
        if (uniqueAliases.size !== master.aliases.length) {
          errors.push(`❌ Duplicate Aliases: CollegeMaster "${code}" contains duplicate aliases: [${master.aliases.join(", ")}]`);
        }
      } else {
        errors.push(`❌ Invalid Aliases Field: CollegeMaster "${code}" has non-array aliases field`);
      }

      // 5. All officialWebsite objects exist
      if (!master.officialWebsite) {
        errors.push(`❌ Missing Website Object: CollegeMaster "${code}" is missing officialWebsite object`);
      } else {
        const keys = ["url", "confidence", "verified", "healthStatus"];
        for (const key of keys) {
          if (master.officialWebsite[key] === undefined) {
            errors.push(`❌ Missing Website Key: CollegeMaster "${code}" is missing officialWebsite.${key}`);
          }
        }
      }

      // 6. All discoveryStatus values valid
      if (!master.discoveryStatus) {
        errors.push(`❌ Missing Discovery Status: CollegeMaster "${code}" is missing discoveryStatus`);
      } else if (!validDiscoveryStatus.has(master.discoveryStatus)) {
        errors.push(`❌ Invalid Discovery Status: CollegeMaster "${code}" has invalid discoveryStatus "${master.discoveryStatus}"`);
      }
    }

    // 1. Every college code in College has exactly one CollegeMaster
    for (const code of collegeCodes) {
      const upperCode = code.toUpperCase().trim();
      if (!masterCodesSeen.has(upperCode)) {
        errors.push(`❌ Missing CollegeMaster: College code "${code}" from College collection has no CollegeMaster record`);
      }
    }

    // Report results
    console.log("------------------------------------------");
    console.log("POST-NORMALIZATION VALIDATION REPORT");
    console.log("------------------------------------------");
    if (errors.length === 0) {
      console.log("✅ All validations passed successfully!");
      console.log(`- Total CollegeMaster documents checked: ${masters.length}`);
      console.log(`- Unique codes in College matched: ${collegeCodes.length}`);
      console.log("- No duplicate college codes");
      console.log("- No orphan profiles");
      console.log("- No duplicate aliases");
      console.log("- Website schemas healthy");
      console.log("- Discovery statuses valid");
      console.log("------------------------------------------\n");
      process.exit(0);
    } else {
      console.error(`❌ Validation failed with ${errors.length} error(s):\n`);
      errors.forEach(err => console.error(err));
      console.log("------------------------------------------\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error during validation:", error);
    process.exit(1);
  }
};

verify();
