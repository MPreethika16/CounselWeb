import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import {
  extractAccreditationFromText,
  NORMALIZED_AFFILIATIONS
} from "../services/accreditationExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ---------------------------------------------------------------------------
// Page-type confidence weights
// ---------------------------------------------------------------------------
const PAGE_CONFIDENCE = {
  accreditation: 95,
  naac: 95,
  nba: 95,
  iqac: 95,
  "mandatory-disclosure": 85,
  approvals: 85,
  recognitions: 85,
  about: 70,
  "about-us": 70,
  home: 50
};

// Maximum history snapshots to retain per college
const MAX_HISTORY = 5;

// ---------------------------------------------------------------------------
// Affiliation normalization helper
// Maps common top-level CollegeMaster.affiliation strings (which may be verbose)
// to the same normalized tokens used in extraction.
// ---------------------------------------------------------------------------
const normalizeMasterAffiliation = (raw = "") => {
  const s = raw.trim().toUpperCase();
  if (s.includes("JNTUH") || s.includes("JNTU HYDERABAD") || s === "JNTUH") return "JNTUH";
  if (s.includes("JNTUK") || s.includes("JNTU KAKINADA") || s === "JNTUK") return "JNTUK";
  if (s.includes("OSMANIA") || s === "OU") return "OU";
  if (s.includes("KAKATIYA") || s === "KU") return "KU";
  return "";   // unrecognized — treat as absent
};

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------
const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Resetting accreditation fields in CollegeMaster before extraction...");
    // We do NOT reset accreditationHistory here — it accumulates across runs.
    await CollegeMaster.updateMany({}, {
      $unset: { "officialData.accreditation": "" }
    });

    console.log("Fetching colleges with raw crawled page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    console.log(`Found raw pages for ${activeCollegeCodes.length} college(s): ${activeCollegeCodes.join(", ")}`);

    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    let collegesProcessed = 0;
    const details = [];

    // Allowed source page types for accreditation extraction
    const ALLOWED_SOURCES = [
      "accreditation", "naac", "nba", "iqac", "about", "about-us",
      "mandatory-disclosure", "approvals", "recognitions", "home"
    ];

    for (const college of colleges) {
      const code = college.collegeCode;
      console.log(`\n------------------------------------------------`);
      console.log(`Extracting accreditation for [${code}] ${college.collegeName}...`);
      console.log(`------------------------------------------------`);

      collegesProcessed++;

      // -----------------------------------------------------------------------
      // Snapshot existing accreditation into history BEFORE overwriting
      // -----------------------------------------------------------------------
      const existingAcc = college.officialData?.accreditation;
      if (existingAcc && typeof existingAcc.confidence === "number" && existingAcc.confidence > 0) {
        const snapshot = {
          naacGrade:     existingAcc.naacGrade || "",
          nbaAccredited: existingAcc.nbaAccredited || false,
          autonomous:    existingAcc.autonomous || false,
          affiliation:   existingAcc.affiliation || "",
          confidence:    existingAcc.confidence || 0,
          sourceUrl:     existingAcc.sourceUrl || "",
          snapshotAt:    new Date()
        };

        // Initialise history array if absent
        if (!college.officialData.accreditationHistory) {
          college.officialData.accreditationHistory = [];
        }
        college.officialData.accreditationHistory.push(snapshot);

        // Cap at MAX_HISTORY (keep most recent)
        if (college.officialData.accreditationHistory.length > MAX_HISTORY) {
          college.officialData.accreditationHistory =
            college.officialData.accreditationHistory.slice(-MAX_HISTORY);
        }

        console.log(`  Snapshotted previous accreditation into history (history length: ${college.officialData.accreditationHistory.length})`);
      }

      // -----------------------------------------------------------------------
      // Fetch and filter crawled pages
      // -----------------------------------------------------------------------
      const pages = await RawCollegePage.find({ collegeCode: code });
      console.log(`Found ${pages.length} raw pages.`);

      const finalAcc = {
        naacGrade: "",
        naacCycle: null,
        nbaAccredited: false,
        nbaPrograms: [],
        autonomous: false,
        affiliation: "",
        ugcRecognized: false,
        aicteApproved: false,
        nirfRank: null,
        nirfParticipated: false,
        reviewRequired: false,
        affiliationSource: "",
        confidence: 0,
        sourceUrl: "",
        evidenceText: "",
        extractedAt: new Date()
      };

      const fieldConfidences = {
        naacGrade: 0,
        naacCycle: 0,
        nbaAccredited: 0,
        nbaPrograms: 0,
        autonomous: 0,
        affiliation: 0,
        ugcRecognized: 0,
        aicteApproved: 0,
        nirfRank: 0,
        nirfParticipated: 0
      };

      const evidenceLines = [];
      let highestFieldConf = 0;
      let bestSourceUrl = "";

      for (const page of pages) {
        const pt = (page.pageType || "").toLowerCase();
        if (!ALLOWED_SOURCES.includes(pt)) continue;

        // Only use successfully crawled pages
        const isSuccess =
          page.crawlStatus === "success" &&
          page.statusCode >= 200 &&
          page.statusCode <= 399;
        if (!isSuccess) continue;

        const pageConf = PAGE_CONFIDENCE[pt] || 50;
        const pageRes = extractAccreditationFromText(page.text);

        // Helper: update a field only if incoming page has higher confidence
        const updateField = (field, value, isList = false) => {
          const hasValue = isList
            ? Array.isArray(value) && value.length > 0
            : value !== undefined && value !== null && value !== "" && value !== false;
          if (hasValue) {
            if (
              pageConf > fieldConfidences[field] ||
              !finalAcc[field] ||
              (isList && finalAcc[field].length === 0)
            ) {
              finalAcc[field] = value;
              fieldConfidences[field] = pageConf;

              if (pageRes.evidenceLines?.length > 0) {
                pageRes.evidenceLines.forEach(line => {
                  if (!evidenceLines.includes(line)) evidenceLines.push(line);
                });
              }

              if (pageConf > highestFieldConf) {
                highestFieldConf = pageConf;
                bestSourceUrl = page.url;
              }
            }
          }
        };

        updateField("naacGrade",      pageRes.naacGrade);
        updateField("naacCycle",      pageRes.naacCycle);
        updateField("nbaAccredited",  pageRes.nbaAccredited);
        updateField("nbaPrograms",    pageRes.nbaPrograms, true);
        updateField("autonomous",     pageRes.autonomous);
        updateField("affiliation",    pageRes.affiliation);
        updateField("ugcRecognized",  pageRes.ugcRecognized);
        updateField("aicteApproved",  pageRes.aicteApproved);
        updateField("nirfRank",       pageRes.nirfRank);
        updateField("nirfParticipated", pageRes.nirfParticipated);
      }

      // -----------------------------------------------------------------------
      // Affiliation cross-validation
      // -----------------------------------------------------------------------
      const masterAff = normalizeMasterAffiliation(college.affiliation || "");
      const extractedAff = finalAcc.affiliation;

      if (extractedAff === "" && masterAff !== "") {
        // No website evidence — fall back to master data
        finalAcc.affiliation = masterAff;
        finalAcc.affiliationSource = "master";
        console.log(`  Affiliation: none extracted → adopted master value "${masterAff}"`);
      } else if (extractedAff !== "" && masterAff === "") {
        // Extracted but master has no recognized value
        finalAcc.affiliationSource = "extracted";
        console.log(`  Affiliation: extracted "${extractedAff}" (master unrecognized)`);
      } else if (extractedAff !== "" && masterAff !== "") {
        if (extractedAff === masterAff) {
          finalAcc.affiliationSource = "extracted";
          console.log(`  Affiliation: extracted "${extractedAff}" matches master ✓`);
        } else {
          // Both present and disagree — flag for review, keep extracted evidence
          finalAcc.affiliationSource = "mismatch";
          finalAcc.reviewRequired = true;
          console.warn(`  ⚠️  Affiliation MISMATCH for [${code}]: extracted="${extractedAff}" vs master="${masterAff}" → reviewRequired=true`);
        }
      } else {
        // Both absent
        finalAcc.affiliationSource = "";
        console.log(`  Affiliation: no data (neither extracted nor in master)`);
      }

      // -----------------------------------------------------------------------
      // Assign overall confidence metrics
      // -----------------------------------------------------------------------
      const overallConfidence = Math.max(...Object.values(fieldConfidences), 0);
      finalAcc.confidence   = overallConfidence;
      finalAcc.sourceUrl    = bestSourceUrl || (pages[0] ? pages[0].url : "");
      finalAcc.evidenceText = evidenceLines.slice(0, 5).join(" | ");

      // -----------------------------------------------------------------------
      // Persist to CollegeMaster
      // -----------------------------------------------------------------------
      college.officialData = college.officialData || {};
      college.officialData.accreditation = finalAcc;
      college.markModified("officialData");
      await college.save();

      console.log(`  Autonomous:        ${finalAcc.autonomous}`);
      console.log(`  NAAC Grade:        ${finalAcc.naacGrade || "None"}`);
      console.log(`  Affiliation:       ${finalAcc.affiliation || "None"} [${finalAcc.affiliationSource}]`);
      console.log(`  Review Required:   ${finalAcc.reviewRequired}`);
      console.log(`  AICTE Approved:    ${finalAcc.aicteApproved}`);
      console.log(`  NBA Programs:      ${finalAcc.nbaPrograms.join(", ") || "None"}`);
      console.log(`  NIRF Rank:         ${finalAcc.nirfRank ?? "None"}`);
      console.log(`  NIRF Participated: ${finalAcc.nirfParticipated}`);
      console.log(`  Confidence:        ${finalAcc.confidence}`);
      console.log(`  Saved officialData.accreditation for [${code}]`);

      details.push({
        collegeCode:        code,
        collegeName:        college.collegeName,
        masterAffiliation:  college.affiliation || "",
        affiliation:        finalAcc.affiliation,
        affiliationSource:  finalAcc.affiliationSource,
        reviewRequired:     finalAcc.reviewRequired,
        nirfParticipated:   finalAcc.nirfParticipated,
        historyLength:      (college.officialData.accreditationHistory || []).length,
        accreditation:      finalAcc
      });
    }

    // -----------------------------------------------------------------------
    // Generate report
    // -----------------------------------------------------------------------
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed,
        reviewRequiredCount: details.filter(d => d.reviewRequired).length,
        nirfParticipatedCount: details.filter(d => d.nirfParticipated).length
      },
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    // Overwrites the base accreditation report (single source of truth)
    const reportPath = path.join(reportsDir, "accreditation-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    // Also write a dedicated hardening report
    const hardeningReportPath = path.join(reportsDir, "accreditation-hardening-report.json");
    fs.writeFileSync(hardeningReportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("ACCREDITATION EXTRACTION PIPELINE COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Colleges Processed:    ${collegesProcessed}`);
    console.log(`Review Required:       ${report.summary.reviewRequiredCount}`);
    console.log(`NIRF Participated:     ${report.summary.nirfParticipatedCount}`);
    console.log(`Report:                ${reportPath}`);
    console.log(`Hardening Report:      ${hardeningReportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during accreditation extraction pipeline:", error);
    process.exit(1);
  }
};

run();
