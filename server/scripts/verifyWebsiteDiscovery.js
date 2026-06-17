import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the server root directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Aggregator domains to check against
const AGGREGATOR_DOMAINS = [
  "collegedunia.com",
  "shiksha.com",
  "careers360.com",
  "getmyuni.com",
  "collegebatch.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "wikipedia.org",
  "justdial.com",
  "sulekha.com",
  "tgche.cgg.gov.in",
  "tseamcet.nic.in"
];

const verifyDiscovery = async () => {
  try {
    console.log("Connecting to the database...");
    await connectDB();
    console.log("Database connected. Starting post-discovery verification...\n");

    const errors = [];

    // Fetch all CollegeMaster records
    const masters = await CollegeMaster.find({});
    
    // 1. Check for duplicate URLs and duplicate college codes
    const seenUrls = new Map();
    const seenCodes = new Set();

    // 6. Coverage percentage calculation variables
    let totalColleges = masters.length;
    let verifiedCount = 0;

    for (const college of masters) {
      const code = college.collegeCode.toUpperCase().trim();
      
      // Check for duplicate college codes
      if (seenCodes.has(code)) {
        errors.push(`❌ Duplicate CollegeMaster Code: Code "${code}" appears multiple times in database.`);
      }
      seenCodes.add(code);

      const urlObj = college.officialWebsite;
      const url = urlObj?.url?.trim();
      const status = college.discoveryStatus;

      // Track verified for coverage calculation
      if (status === "verified" || urlObj?.verified === true) {
        verifiedCount++;
      }

      if (url) {
        // 1. No duplicate URLs
        const lowerUrl = url.toLowerCase();
        if (seenUrls.has(lowerUrl)) {
          errors.push(`❌ Duplicate URL Found: Website "${url}" is assigned to both "${code}" and "${seenUrls.get(lowerUrl)}"`);
        } else {
          seenUrls.set(lowerUrl, code);
        }

        // 3. No aggregator domains saved
        const hasAggregator = AGGREGATOR_DOMAINS.some(domain => lowerUrl.includes(domain));
        if (hasAggregator) {
          errors.push(`❌ Aggregator Domain Saved: College "${code}" has an aggregator URL "${url}"`);
        }

        // 4. Every URL has confidence
        if (urlObj.confidence === undefined || urlObj.confidence === null) {
          errors.push(`❌ Missing URL Confidence: College "${code}" has website but is missing confidence score`);
        } else if (urlObj.confidence <= 0) {
          errors.push(`❌ Zero/Negative URL Confidence: College "${code}" has website with invalid confidence score of ${urlObj.confidence}`);
        }

        // 5. Every URL has discovery status
        if (!status) {
          errors.push(`❌ Missing Discovery Status: College "${code}" has website but is missing discoveryStatus`);
        }
      } else {
        // If website URL is missing, verify discovery status is "pending" or "not_found"
        if (status !== "pending" && status !== "not_found") {
          errors.push(`❌ Invalid Discovery Status: College "${code}" has no website but has discoveryStatus "${status}"`);
        }
      }
    }

    // Verify coverage percentage logic matches count
    const calculatedCoverage = totalColleges > 0 ? Number(((verifiedCount / totalColleges) * 100).toFixed(1)) : 0;
    console.log(`Calculated DB Coverage: ${verifiedCount}/${totalColleges} verified (${calculatedCoverage}%)`);

    // Report results
    console.log("------------------------------------------------");
    console.log("WEBSITE DISCOVERY INTEGRITY VALIDATION");
    console.log("------------------------------------------------");
    if (errors.length === 0) {
      console.log("✅ All discovery validations passed successfully!");
      console.log(`- Total CollegeMaster documents checked: ${masters.length}`);
      console.log(`- Total unique websites saved: ${seenUrls.size}`);
      console.log(`- Total verified websites: ${verifiedCount}`);
      console.log(`- Verified website coverage: ${calculatedCoverage}%`);
      console.log("- No duplicate website URLs");
      console.log("- No aggregator URLs saved in database");
      console.log("- No duplicate college codes");
      console.log("- All website records have valid confidence and status values");
      console.log("------------------------------------------------\n");
      process.exit(0);
    } else {
      console.error(`❌ Validation failed with ${errors.length} error(s):\n`);
      errors.forEach(err => console.error(err));
      console.log("------------------------------------------------\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error during validation:", error);
    process.exit(1);
  }
};

verifyDiscovery();
