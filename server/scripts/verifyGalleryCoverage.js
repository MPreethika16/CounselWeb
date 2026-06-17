import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching colleges with officialData...");
    const colleges = await CollegeMaster.find({
      "officialData.gallery": { $exists: true }
    });

    console.log(`Found ${colleges.length} college(s) with extracted galleries.`);

    const errors = [];
    const PROMOTIONAL_KEYWORDS = [
      "poster", "webposter", "seminar", "conference", "workshop", 
      "placement-drive", "recruitment", "admission", "event", 
      "notification", "gate", "hackathon", "webinar", "results", "exam"
    ];

    let cbitHasImagesRange = false;
    let cbitImageCount = 0;
    let noPromoAccepted = true;
    let noDuplicates = true;
    let totalImagesChecked = 0;

    for (const college of colleges) {
      const code = college.collegeCode;
      const gallery = college.officialData?.gallery?.value || [];
      const imageCount = gallery.length;
      totalImagesChecked += imageCount;

      console.log(`Checking [${code}] with ${imageCount} gallery images...`);

      // 1. Check CBIT image range (10 - 30)
      if (code === "CBIT") {
        cbitImageCount = imageCount;
        if (imageCount >= 10 && imageCount <= 30) {
          cbitHasImagesRange = true;
        } else {
          errors.push(`❌ CBIT Image Count Assertion Failed: expected 10-30 images, found ${imageCount}`);
        }
      }

      const urlsSeen = new Set();
      for (const item of gallery) {
        const urlLower = item.url.toLowerCase();
        const altLower = (item.alt || "").toLowerCase();

        // 2. Check no promotional images accepted
        const matchesPromo = PROMOTIONAL_KEYWORDS.some(kw => 
          urlLower.includes(kw) || 
          altLower.includes(kw)
        );
        if (matchesPromo) {
          noPromoAccepted = false;
          errors.push(`❌ Promotional Image Accepted: College "${code}" has promotional image: "${item.url}"`);
        }

        // 3. Check zero duplicates
        if (urlsSeen.has(item.url)) {
          noDuplicates = false;
          errors.push(`❌ Duplicate Image Found: College "${code}" has duplicate image URL: "${item.url}"`);
        }
        urlsSeen.add(item.url);
      }
    }

    const assertions = {
      cbitHasImagesRange,
      noPromotionalImagesAccepted: noPromoAccepted,
      noDuplicatesFound: noDuplicates
    };

    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: colleges.length,
        totalImagesChecked,
        cbitImageCount
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "gallery-coverage-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("GALLERY COVERAGE VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ CBIT image count (10-30): ${assertions.cbitHasImagesRange ? "PASS" : "FAIL"} (${cbitImageCount} images)`);
    console.log(`✓ No promotional images accepted: ${assertions.noPromotionalImagesAccepted ? "PASS" : "FAIL"}`);
    console.log(`✓ Zero duplicate URLs: ${assertions.noDuplicatesFound ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Coverage verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during gallery coverage verification script:", error);
    process.exit(1);
  }
};

run();
