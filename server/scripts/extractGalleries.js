import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import {
  extractImagesFromHtml,
  filterImageByMetadata,
  checkImageDimensions,
  classifyImage,
  calculateImageScore
} from "../services/galleryExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching colleges with raw crawled page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    console.log(`Found raw pages for ${activeCollegeCodes.length} college(s): ${activeCollegeCodes.join(", ")}`);

    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    let collegesProcessed = 0;
    let imagesScannedTotal = 0;
    let imagesRejectedTotal = 0;
    let imagesAcceptedTotal = 0;
    let coverImagesAssignedTotal = 0;
    let postersRemovedTotal = 0;
    const coverImagesChanged = [];

    const categoriesBreakdown = {
      campus: 0,
      building: 0,
      hostel: 0,
      library: 0,
      laboratory: 0,
      auditorium: 0,
      sports: 0,
      classroom: 0,
      other: 0
    };

    const acceptedByCategory = {};
    const acceptedByPageType = {};

    const details = [];

    for (const college of colleges) {
      const code = college.collegeCode;
      console.log(`\n------------------------------------------------`);
      console.log(`Extracting gallery for [${code}] ${college.collegeName}...`);
      console.log(`------------------------------------------------`);

      collegesProcessed++;
      const oldCoverImage = college.officialData?.coverImage || "";

      // Fetch all crawled page documents for this college
      const pages = await RawCollegePage.find({ collegeCode: code });
      console.log(`Found ${pages.length} raw pages in database.`);

      // Map to keep unique candidate images by URL
      const candidatesMap = new Map();

      for (const page of pages) {
        const pageUrl = page.url;
        const pageType = page.pageType || "unknown";
        
        // 1. Gather pre-extracted images from page record
        if (page.images && Array.isArray(page.images)) {
          page.images.forEach(imgUrl => {
            if (imgUrl) {
              const normalized = imgUrl.trim();
              if (!candidatesMap.has(normalized)) {
                candidatesMap.set(normalized, { url: normalized, alt: "", sourcePage: pageUrl, pageType });
              }
            }
          });
        }

        // 2. Parse HTML content for additional images (img, picture tags, backgrounds)
        if (page.html) {
          const parsed = extractImagesFromHtml(page.html, page.finalUrl || page.url);
          parsed.forEach(img => {
            if (img.url) {
              const normalized = img.url.trim();
              const existing = candidatesMap.get(normalized);
              if (!existing) {
                candidatesMap.set(normalized, { url: normalized, alt: img.alt || "", sourcePage: pageUrl, pageType });
              } else if (img.alt && !existing.alt) {
                existing.alt = img.alt;
              }
            }
          });
        }
      }

      console.log(`Total unique image links found across pages: ${candidatesMap.size}`);
      imagesScannedTotal += candidatesMap.size;

      const acceptedGallery = [];
      let collegeRejectedCount = 0;
      let collegePostersRemoved = 0;

      // Quality filter & probe dimensions
      for (const [url, info] of candidatesMap.entries()) {
        const sourcePageDoc = pages.find(p => p.url === info.sourcePage);
        const pageTitle = sourcePageDoc ? sourcePageDoc.title : "";

        // A. Filter by metadata (including early promotional filter)
        const metaFilter = filterImageByMetadata(url, info.alt, pageTitle);
        if (!metaFilter.accepted) {
          collegeRejectedCount++;
          imagesRejectedTotal++;
          if (metaFilter.reason === "promotional_rejected") {
            collegePostersRemoved++;
            postersRemovedTotal++;
          }
          continue;
        }

        // B. Probe image dimensions
        const dimResult = await checkImageDimensions(url, 3000);
        if (!dimResult.valid) {
          collegeRejectedCount++;
          imagesRejectedTotal++;
          continue;
        }

        // C. Filter by image quality/relevance score
        const score = calculateImageScore(url, info.alt, pageTitle, info.sourcePage);
        if (score < 30) {
          collegeRejectedCount++;
          imagesRejectedTotal++;
          // console.log(`Rejected ${url} due to low score: ${score}`);
          continue;
        }

        // D. Classify image and score confidence
        const classification = classifyImage(url, info.alt, pageTitle);

        acceptedGallery.push({
          url,
          category: classification.category,
          confidence: classification.confidence,
          score, // Also save score for internal tracking
          sourcePage: info.sourcePage,
          pageType: info.pageType || "unknown"
        });

        // Update category breakdown
        categoriesBreakdown[classification.category]++;
        acceptedByCategory[classification.category] = (acceptedByCategory[classification.category] || 0) + 1;
        acceptedByPageType[info.pageType || "unknown"] = (acceptedByPageType[info.pageType || "unknown"] || 0) + 1;
        imagesAcceptedTotal++;
      }

      console.log(`Accepted images: ${acceptedGallery.length} (Rejected: ${collegeRejectedCount}, Posters Removed: ${collegePostersRemoved})`);

      // Cover image selection with priority building, campus, library, auditorium, hostel, sports
      let coverImage = "";
      if (acceptedGallery.length > 0) {
        const priorityCategories = ["building", "campus", "library", "auditorium", "hostel", "sports"];
        const neverAllowCoverKeywords = ["poster", "event", "admission", "banner"];
        let selectedCoverItem = null;

        for (const priorityCategory of priorityCategories) {
          // Filter out cover images containing disallowed promotional terms
          const matchingItems = acceptedGallery.filter(item => {
            if (item.category !== priorityCategory) return false;
            
            const urlLower = item.url.toLowerCase();
            const altLower = (item.alt || "").toLowerCase();
            const sourcePageDoc = pages.find(p => p.url === item.sourcePage);
            const pageTitle = sourcePageDoc ? sourcePageDoc.title.toLowerCase() : "";
            
            const isDisallowed = neverAllowCoverKeywords.some(kw => 
              urlLower.includes(kw) || 
              altLower.includes(kw) || 
              pageTitle.includes(kw)
            );
            return !isDisallowed;
          });

          if (matchingItems.length > 0) {
            // Sort by confidence descending
            matchingItems.sort((a, b) => b.confidence - a.confidence);
            selectedCoverItem = matchingItems[0];
            break;
          }
        }

        // Fallback to highest confidence image of any category (still excluding promotional keywords)
        if (!selectedCoverItem) {
          const matchingFallback = acceptedGallery.filter(item => {
            const urlLower = item.url.toLowerCase();
            const altLower = (item.alt || "").toLowerCase();
            const sourcePageDoc = pages.find(p => p.url === item.sourcePage);
            const pageTitle = sourcePageDoc ? sourcePageDoc.title.toLowerCase() : "";
            
            const isDisallowed = neverAllowCoverKeywords.some(kw => 
              urlLower.includes(kw) || 
              altLower.includes(kw) || 
              pageTitle.includes(kw)
            );
            return !isDisallowed;
          });
          
          if (matchingFallback.length > 0) {
            matchingFallback.sort((a, b) => b.confidence - a.confidence);
            selectedCoverItem = matchingFallback[0];
          }
        }

        if (selectedCoverItem) {
          coverImage = selectedCoverItem.url;
          coverImagesAssignedTotal++;
          console.log(`Selected cover image [Category: ${selectedCoverItem.category}, Conf: ${selectedCoverItem.confidence}%]: ${coverImage}`);
        }
      }

      // Check if cover image changed
      if (oldCoverImage !== coverImage) {
        coverImagesChanged.push({
          collegeCode: code,
          collegeName: college.collegeName,
          oldCoverImage,
          newCoverImage: coverImage
        });
        console.log(`Cover image changed for ${code}`);
      }

      // Update CollegeMaster
      college.officialData = {
        gallery: {
          value: acceptedGallery.map(({ url, category, confidence, sourcePage }) => ({
            url, category, confidence, sourcePage
          })),
          sourceUrl: college.officialWebsite.canonicalUrl || college.officialWebsite.url,
          extractedAt: new Date()
        },
        coverImage
      };

      await college.save();
      console.log(`Saved officialData.gallery and coverImage for [${code}]`);

      // Count categories and pageTypes for this college specifically
      const collegeCategories = {};
      const collegePageTypes = {};
      acceptedGallery.forEach(item => {
        collegeCategories[item.category] = (collegeCategories[item.category] || 0) + 1;
        collegePageTypes[item.pageType || "unknown"] = (collegePageTypes[item.pageType || "unknown"] || 0) + 1;
      });

      details.push({
        collegeCode: code,
        collegeName: college.collegeName,
        galleryCount: acceptedGallery.length,
        rejectedCount: collegeRejectedCount,
        postersRemoved: collegePostersRemoved,
        coverImage,
        categories: collegeCategories,
        pageTypes: collegePageTypes
      });
    }

    // Generate quality report
    const qualityReport = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed,
        imagesScanned: imagesScannedTotal,
        imagesRejected: imagesRejectedTotal,
        imagesAccepted: imagesAcceptedTotal,
        postersRemoved: postersRemovedTotal,
        coverImagesAssigned: coverImagesAssignedTotal,
        coverImagesChangedCount: coverImagesChanged.length,
        categoryBreakdown: categoriesBreakdown
      },
      coverImagesChanged,
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Save under the requested new name
    const reportPath = path.join(reportsDir, "gallery-quality-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(qualityReport, null, 2), "utf8");

    const averageImagesPerCollege = collegesProcessed > 0 ? (imagesAcceptedTotal / collegesProcessed) : 0;

    const coverageReport = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed,
        imagesScanned: imagesScannedTotal,
        imagesRejected: imagesRejectedTotal,
        imagesAccepted: imagesAcceptedTotal,
        averageImagesPerCollege,
        postersRemoved: postersRemovedTotal,
        coverImagesAssigned: coverImagesAssignedTotal,
        acceptedByCategory,
        acceptedByPageType
      },
      details
    };

    const coverageReportPath = path.join(reportsDir, "gallery-coverage-report.json");
    fs.writeFileSync(coverageReportPath, JSON.stringify(coverageReport, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("GALLERY QUALITY HARDENING & OPTIMIZATION COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Colleges Processed: ${collegesProcessed}`);
    console.log(`Images Scanned: ${imagesScannedTotal}`);
    console.log(`Images Rejected: ${imagesRejectedTotal}`);
    console.log(`Images Accepted: ${imagesAcceptedTotal}`);
    console.log(`Average Images Per College: ${averageImagesPerCollege.toFixed(2)}`);
    console.log(`Posters/Promotional Removed: ${postersRemovedTotal}`);
    console.log(`Cover Images Changed: ${coverImagesChanged.length}`);
    console.log("Categories Breakdown:");
    console.log(JSON.stringify(categoriesBreakdown, null, 2));
    console.log(`Quality Report generated at: ${reportPath}`);
    console.log(`Coverage Report generated at: ${coverageReportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during gallery quality hardening pipeline:", error);
    process.exit(1);
  }
};

run();
