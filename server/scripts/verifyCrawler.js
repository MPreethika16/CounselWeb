import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import RawCollegePage from "../models/RawCollegePage.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Starting crawler verification assertions...");

    const totalPages = await RawCollegePage.countDocuments({});
    console.log(`- Total RawCollegePage documents: ${totalPages}`);

    const successPages = await RawCollegePage.countDocuments({ crawlStatus: "success" });
    const failedPages = await RawCollegePage.countDocuments({ crawlStatus: "failed" });
    console.log(`- Successful pages: ${successPages}`);
    console.log(`- Failed pages: ${failedPages}`);

    const errors = [];

    // 1. RawCollegePage documents created
    if (totalPages === 0) {
      errors.push("❌ No RawCollegePage documents exist in the database.");
    }

    // 2. Images captured
    const pagesWithImages = await RawCollegePage.find({
      crawlStatus: "success",
      "images.0": { $exists: true }
    });
    console.log(`- Pages with images: ${pagesWithImages.length}`);
    if (successPages > 0 && pagesWithImages.length === 0) {
      errors.push("❌ No images captured across any successful pages.");
    }

    // 3. HTML stored & 4. Text stored
    const sampleSuccess = await RawCollegePage.findOne({ crawlStatus: "success" });
    if (sampleSuccess) {
      if (!sampleSuccess.html || sampleSuccess.html.trim().length === 0) {
        errors.push(`❌ Sample success page [${sampleSuccess.collegeCode}] ${sampleSuccess.url} is missing HTML content.`);
      }
      if (!sampleSuccess.text || sampleSuccess.text.trim().length === 0) {
        errors.push(`❌ Sample success page [${sampleSuccess.collegeCode}] ${sampleSuccess.url} is missing text content.`);
      }
    }

    // 5. Shared domains cached (Sister Colleges Domain Cache check)
    // Find if there are sister colleges in the database (e.g. KPRC and KPRT, or KUCE group)
    const sisterPairs = [
      ["KPRC", "KPRT"],
      ["KUCE", "KUCESF", "KUEWSF", "KUWL"],
      ["KITS", "KITW"],
      ["TCEK", "TCTK"]
    ];

    let cacheVerified = false;
    for (const group of sisterPairs) {
      const pageCounts = await Promise.all(group.map(code => RawCollegePage.countDocuments({ collegeCode: code })));
      // If any of the sister colleges in the group have crawled pages:
      const totalGroupPages = pageCounts.reduce((a, b) => a + b, 0);
      if (totalGroupPages > 0) {
        // Verify that they have matching page URLs and content hashes
        const sampleUrl = "/";
        const pageDocs = await RawCollegePage.find({
          collegeCode: { $in: group },
          pageType: "home"
        });

        if (pageDocs.length > 1) {
          const hashes = new Set(pageDocs.map(p => p.contentHash));
          if (hashes.size === 1) {
            console.log(`- Shared domain cache verified for sister group ${group.join(", ")} (identical content hashes found)`);
            cacheVerified = true;
          } else {
            errors.push(`❌ Domain cache mismatch: Sister group ${group.join(", ")} has differing content hashes for their homepage.`);
          }
        }
      }
    }

    if (!cacheVerified && successPages > 0) {
      // If we ran a crawl but could not verify caching, check if any duplicates exist in database
      const countByDomain = await RawCollegePage.aggregate([
        { $group: { _id: "$canonicalDomain", colleges: { $addToSet: "$collegeCode" } } },
        { $match: { "colleges.1": { $exists: true } } }
      ]);
      if (countByDomain.length > 0) {
        console.log(`- Caching verified: multiple colleges share domain(s): ${countByDomain.map(d => d._id).join(", ")}`);
        cacheVerified = true;
      }
    }

    // Determine status
    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions: {
        rawCollegePagesCreated: totalPages > 0,
        imagesCaptured: pagesWithImages.length > 0,
        htmlStored: sampleSuccess ? (sampleSuccess.html && sampleSuccess.html.trim().length > 0) : false,
        textStored: sampleSuccess ? (sampleSuccess.text && sampleSuccess.text.trim().length > 0) : false,
        sharedDomainsCached: cacheVerified,
        failedPagesLogged: failedPages > 0
      },
      errors,
      metrics: {
        totalPages,
        successPages,
        failedPages,
        pagesWithImages: pagesWithImages.length
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "crawl-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("CRAWLER VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ RawCollegePages created: ${report.assertions.rawCollegePagesCreated ? "PASS" : "FAIL"}`);
    console.log(`✓ Images captured: ${report.assertions.imagesCaptured ? "PASS" : "FAIL"}`);
    console.log(`✓ HTML stored: ${report.assertions.htmlStored ? "PASS" : "FAIL"}`);
    console.log(`✓ Text stored: ${report.assertions.textStored ? "PASS" : "FAIL"}`);
    console.log(`✓ Shared domains cached: ${report.assertions.sharedDomainsCached ? "PASS" : "FAIL"}`);
    console.log(`✓ Failed pages logged: ${report.assertions.failedPagesLogged ? "PASS" : "FAIL"}`);
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

  } catch (err) {
    console.error("Error running verifyCrawler:", err);
    process.exit(1);
  }
};

run();
