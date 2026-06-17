import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the server root directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const runAudit = async () => {
  try {
    await connectDB();

    const totalColleges = await CollegeMaster.countDocuments({});

    // Verified: officialWebsite.verified = true OR discoveryStatus = "verified"
    const verified = await CollegeMaster.countDocuments({
      $or: [
        { "officialWebsite.verified": true },
        { discoveryStatus: "verified" }
      ]
    });

    // Pending Review: discoveryStatus = "review" OR (officialWebsite.url is not empty AND verified = false)
    const pendingReview = await CollegeMaster.countDocuments({
      $and: [
        { "officialWebsite.verified": { $ne: true } },
        { discoveryStatus: { $ne: "verified" } },
        {
          $or: [
            { discoveryStatus: "review" },
            {
              $and: [
                { "officialWebsite.url": { $exists: true } },
                { "officialWebsite.url": { $ne: "" } }
              ]
            }
          ]
        }
      ]
    });

    // Missing: officialWebsite.url is empty or missing OR discoveryStatus = "pending"
    // (and not covered by verified or pending review)
    const missing = await CollegeMaster.countDocuments({
      $and: [
        { "officialWebsite.verified": { $ne: true } },
        { discoveryStatus: { $ne: "verified" } },
        { discoveryStatus: { $ne: "review" } },
        {
          $or: [
            { "officialWebsite.url": { $exists: false } },
            { "officialWebsite.url": null },
            { "officialWebsite.url": "" },
            { discoveryStatus: "pending" }
          ]
        }
      ]
    });

    const coverage = totalColleges > 0 ? Number(((verified / totalColleges) * 100).toFixed(1)) : 0;

    console.log("------------------------------------------------");
    console.log("WEBSITE COVERAGE REPORT");
    console.log("------------------------------------------------\n");
    console.log(`Total Colleges: ${totalColleges}\n`);
    console.log(`Verified: ${verified}`);
    console.log(`Pending Review: ${pendingReview}`);
    console.log(`Missing: ${missing}\n`);
    console.log(`Coverage: ${coverage}%\n`);
    console.log("------------------------------------------------\n");

    const reportData = {
      totalColleges,
      verified,
      pendingReview,
      missing,
      coverage
    };

    const exportsDir = path.resolve(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const reportPath = path.join(exportsDir, "website-coverage-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf-8");
    console.log(`Saved coverage report to: ${reportPath}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during website coverage audit:", error);
    process.exit(1);
  }
};

runAudit();
