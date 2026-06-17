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
    const VALID_CATEGORIES = ["campus", "building", "hostel", "library", "laboratory", "auditorium", "sports", "classroom", "other"];

    let totalGalleriesExtracted = colleges.length;
    let totalImagesChecked = 0;
    let coverImagesFound = 0;
    let totalDuplicates = 0;
    let totalLogos = 0;
    let totalIcons = 0;
    let totalGifs = 0;

    for (const college of colleges) {
      const code = college.collegeCode;
      const gallery = college.officialData?.gallery?.value || [];
      const coverImage = college.officialData?.coverImage;

      if (gallery.length > 0) {
        totalImagesChecked += gallery.length;

        // Check cover image is assigned
        if (!coverImage || coverImage.trim().length === 0) {
          errors.push(`❌ Missing Cover Image: College "${code}" has a gallery of size ${gallery.length} but no cover image assigned.`);
        } else {
          coverImagesFound++;
        }

        // Check for duplicates, logos, icons, gifs
        const seenUrls = new Set();
        for (const item of gallery) {
          const urlLower = item.url.toLowerCase();
          
          // 1. Duplicates check
          if (seenUrls.has(urlLower)) {
            totalDuplicates++;
            errors.push(`❌ Duplicate Image: College "${code}" has duplicate URL in gallery: "${item.url}"`);
          }
          seenUrls.add(urlLower);

          // 2. Logos check
          if (urlLower.includes("logo")) {
            totalLogos++;
            errors.push(`❌ Logo Found: College "${code}" has logo file in gallery: "${item.url}"`);
          }

          // 3. Icons/Favicons check
          if (urlLower.includes("icon") || urlLower.includes("favicon")) {
            totalIcons++;
            errors.push(`❌ Icon Found: College "${code}" has icon file in gallery: "${item.url}"`);
          }

          // 4. GIFs check
          if (urlLower.endsWith(".gif") || urlLower.includes(".gif")) {
            totalGifs++;
            errors.push(`❌ GIF Found: College "${code}" has GIF file in gallery: "${item.url}"`);
          }

          // 5. Valid Category check
          if (!VALID_CATEGORIES.includes(item.category)) {
            errors.push(`❌ Invalid Category: College "${code}" has invalid category "${item.category}" for URL: "${item.url}"`);
          }
        }
      }
    }

    const collegesWithNonEmptyGallery = colleges.filter(c => (c.officialData?.gallery?.value || []).length > 0).length;

    const assertions = {
      noLogosStored: totalLogos === 0,
      noIconsStored: totalIcons === 0,
      noGifsStored: totalGifs === 0,
      coverImageAssigned: coverImagesFound === collegesWithNonEmptyGallery,
      categoriesPopulated: totalImagesChecked > 0,
      duplicatesRemoved: totalDuplicates === 0
    };

    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: totalGalleriesExtracted,
        totalImagesChecked,
        coverImagesFound,
        totalDuplicates,
        totalLogos,
        totalIcons,
        totalGifs
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "gallery-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("GALLERY EXTRACTION VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ No logos stored: ${assertions.noLogosStored ? "PASS" : "FAIL"}`);
    console.log(`✓ No icons/favicons stored: ${assertions.noIconsStored ? "PASS" : "FAIL"}`);
    console.log(`✓ No GIFs stored: ${assertions.noGifsStored ? "PASS" : "FAIL"}`);
    console.log(`✓ Cover image assigned: ${assertions.coverImageAssigned ? "PASS" : "FAIL"}`);
    console.log(`✓ Categories populated: ${assertions.categoriesPopulated ? "PASS" : "FAIL"}`);
    console.log(`✓ Duplicates removed: ${assertions.duplicatesRemoved ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during gallery verification script:", error);
    process.exit(1);
  }
};

run();
