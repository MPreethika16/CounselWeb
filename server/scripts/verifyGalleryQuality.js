import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import { calculateImageScore } from "../services/galleryExtractor.js";

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
    const DISALLOWED_COVER_KEYWORDS = ["poster", "event", "admission", "banner"];

    let totalImagesChecked = 0;
    let totalScoreFailures = 0;
    let totalPromoFailures = 0;
    let totalCoverDisallowedFailures = 0;

    for (const college of colleges) {
      const code = college.collegeCode;
      const gallery = college.officialData?.gallery?.value || [];
      const coverImage = college.officialData?.coverImage || "";

      // Fetch crawled pages of this college for page title context (for scoring validation)
      const pages = await RawCollegePage.find({ collegeCode: code });

      for (const item of gallery) {
        totalImagesChecked++;
        const urlLower = item.url.toLowerCase();
        
        // 1. Assert no promotional keywords exist in accepted images
        const matchesPromo = PROMOTIONAL_KEYWORDS.some(kw => 
          urlLower.includes(kw) || 
          (item.alt || "").toLowerCase().includes(kw)
        );
        if (matchesPromo) {
          totalPromoFailures++;
          errors.push(`❌ Promotional Image Accepted: College "${code}" has promotional image: "${item.url}"`);
        }

        // 2. Assert score >= 30
        const sourcePageDoc = pages.find(p => p.url === item.sourcePage);
        const pageTitle = sourcePageDoc ? sourcePageDoc.title : "";
        const score = calculateImageScore(item.url, item.alt || "", pageTitle, item.sourcePage || "");
        if (score < 30) {
          totalScoreFailures++;
          errors.push(`❌ Low Score Image Accepted: College "${code}" has image with score ${score} (< 30): "${item.url}"`);
        }
      }

      // 3. Assert cover image does not contain disallowed keywords
      if (coverImage) {
        const coverLower = coverImage.toLowerCase();
        const matchesDisallowedCover = DISALLOWED_COVER_KEYWORDS.some(kw => coverLower.includes(kw));
        if (matchesDisallowedCover) {
          totalCoverDisallowedFailures++;
          errors.push(`❌ Disallowed Cover Image: College "${code}" has cover image containing disallowed keywords: "${coverImage}"`);
        }
      }
    }

    const assertions = {
      noPromotionalImagesAccepted: totalPromoFailures === 0,
      allGalleryImagesScoredAbove30: totalScoreFailures === 0,
      noDisallowedCoverImages: totalCoverDisallowedFailures === 0
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
        totalPromoFailures,
        totalScoreFailures,
        totalCoverDisallowedFailures
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "gallery-quality-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("GALLERY QUALITY VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ No promotional images accepted: ${assertions.noPromotionalImagesAccepted ? "PASS" : "FAIL"}`);
    console.log(`✓ All gallery images score >= 30: ${assertions.allGalleryImagesScoredAbove30 ? "PASS" : "FAIL"}`);
    console.log(`✓ No disallowed cover images: ${assertions.noDisallowedCoverImages ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Quality verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during gallery quality verification script:", error);
    process.exit(1);
  }
};

run();
