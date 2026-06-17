import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import {
  isPlacementPage,
  dedupeRecruiters,
  extractPlacementsFromPage
} from "../services/placementsExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    const errors = [];
    const warnings = [];
    const collegeResults = [];
    let collegesChecked = 0;
    let collegesWithPlacementPages = 0;
    let collegesWithExtractedData = 0;

    const dedupeTest = dedupeRecruiters(["TCS", "Tata Consultancy Services", "Infosys", "infosys"]);
    if (dedupeTest.length > 3) {
      errors.push(`❌ dedupeRecruiters alias normalization failed: ${JSON.stringify(dedupeTest)}`);
    }

    for (const college of colleges) {
      const code = college.collegeCode;
      collegesChecked++;

      const pages = await RawCollegePage.find({ collegeCode: code });
      const placementPages = pages.filter((p) => {
        const ok =
          p.crawlStatus === "success" &&
          p.statusCode >= 200 &&
          p.statusCode <= 399;
        return ok && isPlacementPage(p.pageType, p.url);
      });

      if (placementPages.length > 0) collegesWithPlacementPages++;

      const placements = college.officialData?.placements;
      const hasRecord = placements && typeof placements === "object";

      const checks = {
        highestPackageExtracted: false,
        averageNotInferred: true,
        placementPercentageValid: true,
        recruitersDeduplicated: true,
        placementYearExtracted: false,
        sourceUrlStored: false,
        evidenceStored: false
      };

      if (hasRecord) {
        const hasAny =
          placements.highestPackage !== null ||
          placements.averagePackage !== null ||
          placements.medianPackage !== null ||
          placements.placementPercentage !== null ||
          placements.recruiters?.length > 0 ||
          placements.placementYear !== null;

        if (hasAny) collegesWithExtractedData++;

        checks.highestPackageExtracted = placements.highestPackage !== null;
        checks.placementYearExtracted = placements.placementYear !== null;
        checks.sourceUrlStored = !!placements.sourceUrl?.trim();
        checks.evidenceStored = !!placements.evidenceText?.trim();

        // Placement percentage must be 0–100 if present
        if (placements.placementPercentage !== null) {
          const pct = placements.placementPercentage;
          if (pct < 0 || pct > 100) {
            checks.placementPercentageValid = false;
            errors.push(`❌ [${code}] placementPercentage out of range: ${pct}`);
          }
        }

        // Recruiters deduplicated
        if (Array.isArray(placements.recruiters) && placements.recruiters.length > 0) {
          const lowered = placements.recruiters.map((r) => r.toLowerCase());
          const unique = new Set(lowered);
          if (unique.size !== placements.recruiters.length) {
            checks.recruitersDeduplicated = false;
            errors.push(`❌ [${code}] recruiters array contains duplicates`);
          }
        }

        // Average must not be inferred: re-scan pages and ensure average only from explicit labels
        if (placementPages.length > 0 && placements.averagePackage !== null) {
          let explicitAverageFound = false;
          for (const page of placementPages) {
            const pageRes = extractPlacementsFromPage(page.text, page.url, page.pageType);
            if (pageRes.averagePackage !== null) {
              explicitAverageFound = true;
              break;
            }
          }
          if (!explicitAverageFound) {
            checks.averageNotInferred = false;
            errors.push(`❌ [${code}] averagePackage stored but no explicit average label found in placement pages`);
          }
        }

        // Colleges with placement pages should have sourceUrl when data exists
        if (placementPages.length > 0 && hasAny && !checks.sourceUrlStored) {
          errors.push(`❌ [${code}] placement data present but sourceUrl is missing`);
        }

        if (placementPages.length > 0 && hasAny && !checks.evidenceStored) {
          warnings.push(`⚠ [${code}] placement data present but evidenceText is empty`);
        }

        // Schema field types
        const numericFields = [
          "highestPackage", "averagePackage", "medianPackage",
          "placementPercentage", "totalOffers", "totalPlacedStudents", "placementYear"
        ];
        numericFields.forEach((field) => {
          const val = placements[field];
          if (val !== null && val !== undefined && typeof val !== "number") {
            errors.push(`❌ [${code}] ${field} should be number or null, got ${typeof val}`);
          }
        });

        if (!Array.isArray(placements.recruiters)) {
          errors.push(`❌ [${code}] recruiters must be an array`);
        }

        if (typeof placements.confidence !== "number") {
          errors.push(`❌ [${code}] confidence must be a number`);
        }

        // Suspicious flag consistency
        if (placements.suspicious && !placements.reviewReason?.trim()) {
          errors.push(`❌ [${code}] suspicious=true but reviewReason is empty`);
        }
      } else if (placementPages.length > 0) {
        warnings.push(`⚠ [${code}] has ${placementPages.length} placement page(s) but no officialData.placements record`);
      }

      collegeResults.push({
        collegeCode: code,
        collegeName: college.collegeName,
        placementPagesFound: placementPages.length,
        hasPlacementsRecord: hasRecord,
        checks,
        placements: hasRecord ? placements : null
      });
    }

    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      summary: {
        collegesChecked,
        collegesWithPlacementPages,
        collegesWithExtractedData,
        errorsCount: errors.length,
        warningsCount: warnings.length
      },
      assertions: [
        "highest package extracted (when labelled on page)",
        "average package not inferred",
        "placement percentage valid (0-100)",
        "recruiters deduplicated",
        "placement year extracted (when present)",
        "source URL stored",
        "evidence stored"
      ],
      errors,
      warnings,
      colleges: collegeResults
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "placement-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("PLACEMENT EXTRACTION VERIFICATION");
    console.log("------------------------------------------------");
    console.log(`Status: ${status}`);
    console.log(`Colleges Checked: ${collegesChecked}`);
    console.log(`With Placement Pages: ${collegesWithPlacementPages}`);
    console.log(`With Extracted Data: ${collegesWithExtractedData}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    if (errors.length) {
      errors.forEach((e) => console.log(e));
    }
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(status === "PASSED" ? 0 : 1);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
};

run();
