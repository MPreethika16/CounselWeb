import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import { extractFacilitiesFromPage, FACILITY_KEYWORDS } from "../services/facilitiesExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Resetting facilities fields in CollegeMaster to avoid schema casting conflicts...");
    await CollegeMaster.updateMany({}, {
      $unset: {
        "officialData.facilities": "",
        "officialData.facilitiesCount": "",
        "officialData.facilityCoverageScore": "",
        "officialData.facilityQualityScore": "",
        "officialData.facilityStrengthScore": "",
        "officialData.facilitiesCoverage": "",
        "officialData.coverageDetails": ""
      }
    });

    console.log("Fetching colleges with raw crawled page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    console.log(`Found raw pages for ${activeCollegeCodes.length} college(s): ${activeCollegeCodes.join(", ")}`);

    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    let collegesProcessed = 0;
    let totalFacilitiesFoundCount = 0;
    const facilitiesDistribution = {};

    // Initialize distribution keys
    Object.keys(FACILITY_KEYWORDS).forEach(facility => {
      facilitiesDistribution[facility] = 0;
    });

    const details = [];

    // Allowed source page types for facilities extraction
    const ALLOWED_SOURCES = ["facilities", "infrastructure", "hostel", "library", "sports", "campus", "amenities", "about", "home"];

    for (const college of colleges) {
      const code = college.collegeCode;
      console.log(`\n------------------------------------------------`);
      console.log(`Extracting facilities for [${code}] ${college.collegeName}...`);
      console.log(`------------------------------------------------`);

      collegesProcessed++;

      // Fetch crawled pages
      const pages = await RawCollegePage.find({ collegeCode: code });
      console.log(`Found ${pages.length} raw pages.`);

      // 1. Sort pages into 5 unique categories to calculate coverage accuracy without page-inflation
      const categories = {
        facilitiesPage: { pages: [], attempted: false, successful: false },
        infrastructurePage: { pages: [], attempted: false, successful: false },
        hostelPage: { pages: [], attempted: false, successful: false },
        libraryPage: { pages: [], attempted: false, successful: false },
        sportsPage: { pages: [], attempted: false, successful: false }
      };

      for (const page of pages) {
        const pt = (page.pageType || "").toLowerCase();
        let catKey = null;

        if (pt === "facilities" || pt === "amenities") {
          catKey = "facilitiesPage";
        } else if (pt === "infrastructure" || pt === "campus") {
          catKey = "infrastructurePage";
        } else if (pt === "hostel") {
          catKey = "hostelPage";
        } else if (pt === "library") {
          catKey = "libraryPage";
        } else if (pt === "sports" || pt === "gym") {
          catKey = "sportsPage";
        }

        if (catKey) {
          categories[catKey].pages.push(page);
        }
      }

      // Evaluate each category and populate coverage metrics
      let attemptedPages = 0;
      let successfulPages = 0;
      let failedPages = 0;

      const facilitiesCoverage = {
        facilitiesPage: false,
        infrastructurePage: false,
        hostelPage: false,
        libraryPage: false,
        sportsPage: false
      };

      for (const [catKey, info] of Object.entries(categories)) {
        if (info.pages.length > 0) {
          info.attempted = true;
          attemptedPages++;

          // Page is considered successfully crawled only if crawlStatus is success and statusCode is 2xx/3xx
          const hasSuccess = info.pages.some(page => 
            page.crawlStatus === "success" && 
            page.statusCode >= 200 && 
            page.statusCode <= 399
          );

          if (hasSuccess) {
            info.successful = true;
            successfulPages++;
            facilitiesCoverage[catKey] = true;
          } else {
            failedPages++;
          }
        }
      }

      const coverageDetails = {
        attemptedPages,
        successfulPages,
        failedPages
      };

      // 2. Perform facilities extraction using only successfully crawled pages
      const facilitiesData = {};
      Object.keys(FACILITY_KEYWORDS).forEach(facility => {
        facilitiesData[facility] = {
          detected: false,
          confidence: 0,
          evidence: {
            text: "",
            sourceUrl: "",
            matchedKeyword: "",
            matchedType: ""
          }
        };
      });

      for (const page of pages) {
        const pt = (page.pageType || "").toLowerCase();
        if (!ALLOWED_SOURCES.includes(pt)) {
          continue;
        }

        // Must only extract facilities from successfully crawled pages
        const isSuccess = page.crawlStatus === "success" && page.statusCode >= 200 && page.statusCode <= 399;
        if (!isSuccess) {
          continue;
        }

        const pageResults = extractFacilitiesFromPage(page.text, page.url, page.pageType);

        for (const [facility, result] of Object.entries(pageResults)) {
          if (result.detected) {
            const current = facilitiesData[facility];
            if (!current.detected || result.confidence > current.confidence) {
              facilitiesData[facility] = {
                detected: true,
                confidence: result.confidence,
                evidence: {
                  text: result.evidence.text,
                  sourceUrl: result.evidence.sourceUrl,
                  matchedKeyword: result.evidence.matchedKeyword,
                  matchedType: result.evidence.matchedType
                }
              };
            }
          }
        }
      }

      // Compute scores
      const facilityCoverageScore = successfulPages * 20;

      let facilitiesCount = 0;
      let sumConfidences = 0;
      const facilitiesFound = [];

      Object.entries(facilitiesData).forEach(([facility, info]) => {
        if (info.detected) {
          facilitiesCount++;
          sumConfidences += info.confidence;
          facilitiesFound.push(facility);
          facilitiesDistribution[facility]++;
          totalFacilitiesFoundCount++;
        }
      });

      const facilityQualityScore = facilitiesCount > 0 ? Math.round(sumConfidences / facilitiesCount) : 0;

      const quantityScore = (facilitiesCount / 18) * 100;
      const facilityStrengthScore = facilitiesCount > 0 
        ? Math.round((quantityScore * 0.5) + (facilityQualityScore * 0.3) + (facilityCoverageScore * 0.2))
        : 0;

      // Structure final Mongoose fields
      facilitiesData.extractedAt = new Date();

      // Save to CollegeMaster
      college.officialData = college.officialData || {};
      college.officialData.facilities = facilitiesData;
      college.officialData.facilitiesCount = facilitiesCount;
      college.officialData.facilityCoverageScore = facilityCoverageScore;
      college.officialData.facilityQualityScore = facilityQualityScore;
      college.officialData.facilityStrengthScore = facilityStrengthScore;
      college.officialData.facilitiesCoverage = facilitiesCoverage;
      college.officialData.coverageDetails = coverageDetails;
      await college.save();

      console.log(`Facilities Count: ${facilitiesCount}`);
      console.log(`Coverage Details: Attempted=${attemptedPages}, Successful=${successfulPages}, Failed=${failedPages}`);
      console.log(`Coverage Score: ${facilityCoverageScore}`);
      console.log(`Quality Score: ${facilityQualityScore}`);
      console.log(`Facility Strength Score: ${facilityStrengthScore}`);
      console.log(`Enabled Facilities: ${facilitiesFound.join(", ") || "None"}`);
      console.log(`Saved officialData.facilities, coverage flags, coverage details, and scoring for [${code}]`);

      details.push({
        collegeCode: code,
        collegeName: college.collegeName,
        facilitiesCount,
        facilityCoverageScore,
        facilityQualityScore,
        facilityStrengthScore,
        facilitiesCoverage,
        coverageDetails,
        facilitiesFound: facilitiesFound.map(facility => ({
          facility,
          confidence: facilitiesData[facility].confidence,
          matchedKeyword: facilitiesData[facility].evidence.matchedKeyword,
          matchedType: facilitiesData[facility].evidence.matchedType,
          sourceUrl: facilitiesData[facility].evidence.sourceUrl
        }))
      });
    }

    const averageFacilitiesPerCollege = collegesProcessed > 0 ? (totalFacilitiesFoundCount / collegesProcessed) : 0;

    // Generate reporting
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed,
        totalFacilitiesFound: totalFacilitiesFoundCount,
        averageFacilitiesPerCollege,
        facilitiesDistribution
      },
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "facility-coverage-fix-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("FACILITIES PIPELINE AND COVERAGE FIX COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Colleges Processed: ${collegesProcessed}`);
    console.log(`Total Facilities Found: ${totalFacilitiesFoundCount}`);
    console.log(`Average Facilities Per College: ${averageFacilitiesPerCollege.toFixed(2)}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during facilities extraction pipeline:", error);
    process.exit(1);
  }
};

run();
