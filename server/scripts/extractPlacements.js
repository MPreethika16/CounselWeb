import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import {
  isPlacementPage,
  getPlacementPageConfidence,
  extractPlacementsFromPage,
  mergePlacementExtraction,
  finalizePlacementRecord,
  flagSuspiciousPlacements,
  PLACEMENT_PATH_FRAGMENTS,
  findPdfLinks,
  isPlacementPdf,
  parsePdfBuffer
} from "../services/placementsExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const fetchPdf = async (url) => {
  try {
    const res = await fetch(url);
    return res;
  } catch (e) {
    console.error(`Failed to fetch PDF: ${url}`, e.message);
    return { ok: false, status: 500 };
  }
};

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Resetting placements fields in CollegeMaster before extraction...");
    await CollegeMaster.updateMany({}, {
      $unset: { "officialData.placements": "" }
    });

    console.log("Fetching colleges with raw crawled page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    console.log(`Found raw pages for ${activeCollegeCodes.length} college(s): ${activeCollegeCodes.join(", ")}`);

    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    let collegesProcessed = 0;
    let collegesWithPlacementData = 0;
    let collegesFlaggedSuspicious = 0;
    const details = [];

    for (const college of colleges) {
      const code = college.collegeCode;
      console.log(`\n------------------------------------------------`);
      console.log(`Extracting placements for [${code}] ${college.collegeName}...`);
      console.log(`------------------------------------------------`);

      collegesProcessed++;

      const pages = await RawCollegePage.find({ collegeCode: code });
      console.log(`Found ${pages.length} raw pages.`);

      let merged = {
        highestPackage: null,
        averagePackage: null,
        medianPackage: null,
        placementPercentage: null,
        totalOffers: null,
        totalPlacedStudents: null,
        recruiters: [],
        placementYear: null,
        _fieldConf: {},
        _allEvidence: [],
        _highestPageConf: 0,
        _bestSourceUrl: ""
      };

      const pagesUsed = [];

      for (const page of pages) {
        const isSuccess =
          page.crawlStatus === "success" &&
          page.statusCode >= 200 &&
          page.statusCode <= 399;
        if (!isSuccess) continue;

        // 1. Process the standard page text
        if (isPlacementPage(page.pageType, page.url)) {
          const pageConf = getPlacementPageConfidence(page.pageType, page.url);
          const pageResult = extractPlacementsFromPage(page.text, page.url, page.pageType);

          const hasData =
            pageResult.highestPackage !== null ||
            pageResult.averagePackage !== null ||
            pageResult.medianPackage !== null ||
            pageResult.placementPercentage !== null ||
            pageResult.totalOffers !== null ||
            pageResult.totalPlacedStudents !== null ||
            pageResult.recruiters.length > 0 ||
            pageResult.placementYear !== null;

          if (hasData) {
            merged = mergePlacementExtraction(merged, pageResult, pageConf, page.url);
            pagesUsed.push({
              url: page.url,
              pageType: page.pageType,
              confidence: pageConf,
              extracted: {
                highestPackage: pageResult.highestPackage,
                averagePackage: pageResult.averagePackage,
                medianPackage: pageResult.medianPackage,
                placementPercentage: pageResult.placementPercentage,
                recruitersCount: pageResult.recruiters.length,
                placementYear: pageResult.placementYear
              }
            });
            console.log(`  ✓ ${page.pageType || "unknown"} @ ${page.url} (conf=${pageConf})`);
          }
        }

        // 2. Discover and parse PDF links in the page HTML
        const pdfLinks = findPdfLinks(page.html);
        for (const pdfLink of pdfLinks) {
          if (isPlacementPdf(pdfLink.url, pdfLink.text)) {
            const resolvedUrl = new URL(pdfLink.url, page.url).toString();
            console.log(`  🔍 Discovered placement PDF: "${pdfLink.text}" -> ${resolvedUrl}`);

            try {
              const res = await fetchPdf(resolvedUrl);
              if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const pdfText = await parsePdfBuffer(buffer);

                if (pdfText) {
                  const pdfPageType = "brochure";
                  const pdfConf = 85;
                  const pdfResult = extractPlacementsFromPage(pdfText, resolvedUrl, pdfPageType);

                  const hasPdfData =
                    pdfResult.highestPackage !== null ||
                    pdfResult.averagePackage !== null ||
                    pdfResult.medianPackage !== null ||
                    pdfResult.placementPercentage !== null ||
                    pdfResult.totalOffers !== null ||
                    pdfResult.totalPlacedStudents !== null ||
                    pdfResult.recruiters.length > 0 ||
                    pdfResult.placementYear !== null;

                  if (hasPdfData) {
                    merged = mergePlacementExtraction(merged, pdfResult, pdfConf, resolvedUrl);
                    pagesUsed.push({
                      url: resolvedUrl,
                      pageType: pdfPageType,
                      confidence: pdfConf,
                      extracted: {
                        highestPackage: pdfResult.highestPackage,
                        averagePackage: pdfResult.averagePackage,
                        medianPackage: pdfResult.medianPackage,
                        placementPercentage: pdfResult.placementPercentage,
                        recruitersCount: pdfResult.recruiters.length,
                        placementYear: pdfResult.placementYear
                      }
                    });
                    console.log(`    ✓ PDF parsed: ${resolvedUrl} (conf=${pdfConf})`);
                  }
                }
              }
            } catch (err) {
              console.error(`    ❌ Error downloading/parsing PDF ${resolvedUrl}:`, err.message);
            }
          }
        }
      }

      let finalPlacements = finalizePlacementRecord(merged);
      finalPlacements = flagSuspiciousPlacements(finalPlacements);

      const hasAnyData =
        finalPlacements.highestPackage !== null ||
        finalPlacements.averagePackage !== null ||
        finalPlacements.medianPackage !== null ||
        finalPlacements.placementPercentage !== null ||
        finalPlacements.totalOffers !== null ||
        finalPlacements.totalPlacedStudents !== null ||
        finalPlacements.recruiters.length > 0 ||
        finalPlacements.placementYear !== null;

      if (hasAnyData) collegesWithPlacementData++;
      if (finalPlacements.suspicious) collegesFlaggedSuspicious++;

      college.officialData = college.officialData || {};
      college.officialData.placements = finalPlacements;
      college.markModified("officialData");
      await college.save();

      console.log(`  Highest:     ${finalPlacements.highestPackage ?? "—"} LPA`);
      console.log(`  Average:     ${finalPlacements.averagePackage ?? "—"} LPA`);
      console.log(`  Median:      ${finalPlacements.medianPackage ?? "—"} LPA`);
      console.log(`  Placement %: ${finalPlacements.placementPercentage ?? "—"}`);
      console.log(`  Year:        ${finalPlacements.placementYear ?? "—"}`);
      console.log(`  Recruiters:  ${finalPlacements.recruiters.length}`);
      console.log(`  Confidence:  ${finalPlacements.confidence}`);
      if (finalPlacements.suspicious) {
        console.log(`  ⚠ Suspicious: ${finalPlacements.reviewReason}`);
      }
      console.log(`  Saved officialData.placements for [${code}]`);

      details.push({
        collegeCode: code,
        collegeName: college.collegeName,
        pagesUsed,
        placementPriorityPaths: PLACEMENT_PATH_FRAGMENTS,
        placements: finalPlacements
      });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed,
        collegesWithPlacementData,
        collegesFlaggedSuspicious,
        priorityPaths: PLACEMENT_PATH_FRAGMENTS
      },
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    // Output placement-consistency-report.json
    const reportPath = path.join(reportsDir, "placement-consistency-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    // Also output standard placement-report.json, placement-hardening-report.json, and placement-production-report.json for compatibility
    fs.writeFileSync(path.join(reportsDir, "placement-report.json"), JSON.stringify(report, null, 2), "utf8");
    fs.writeFileSync(path.join(reportsDir, "placement-hardening-report.json"), JSON.stringify(report, null, 2), "utf8");
    fs.writeFileSync(path.join(reportsDir, "placement-production-report.json"), JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("PLACEMENT EXTRACTION PIPELINE COMPLETE (CONSISTENCY)");
    console.log("------------------------------------------------");
    console.log(`Colleges Processed:           ${collegesProcessed}`);
    console.log(`Colleges With Placement Data: ${collegesWithPlacementData}`);
    console.log(`Colleges Flagged Suspicious:  ${collegesFlaggedSuspicious}`);
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during placement extraction pipeline:", error);
    process.exit(1);
  }
};

run();
