import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import {
  NORMALIZED_NAAC_GRADES,
  NORMALIZED_AFFILIATIONS,
  NORMALIZED_NBA_PROGRAMS
} from "../services/accreditationExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Valid affiliationSource values
const VALID_AFFILIATION_SOURCES = ["extracted", "master", "mismatch", ""];

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching colleges with active raw page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    console.log(`Found ${colleges.length} college(s) to verify.`);

    const errors = [];
    let totalCollegesChecked = 0;

    // CBIT-specific tracking
    let cbitChecked = false;
    let cbitAssertionsPassed = true;

    for (const college of colleges) {
      const code = college.collegeCode;
      const acc  = college.officialData?.accreditation || {};
      const hist = college.officialData?.accreditationHistory || [];

      totalCollegesChecked++;
      console.log(`\nVerifying [${code}]...`);

      // -----------------------------------------------------------------------
      // 1. NBA Programs — all entries must be normalized abbreviations
      // -----------------------------------------------------------------------
      if (Array.isArray(acc.nbaPrograms)) {
        acc.nbaPrograms.forEach(prog => {
          if (!NORMALIZED_NBA_PROGRAMS.includes(prog)) {
            errors.push(
              `❌ Unnormalized NBA Program: College "${code}" has non-standard program: "${prog}". ` +
              `Expected one of: ${NORMALIZED_NBA_PROGRAMS.join(", ")}`
            );
          }
        });
      } else {
        errors.push(`❌ NBA Programs Type: College "${code}" nbaPrograms is not an array.`);
      }

      // -----------------------------------------------------------------------
      // 2. affiliationSource must be a valid value
      // -----------------------------------------------------------------------
      if (!VALID_AFFILIATION_SOURCES.includes(acc.affiliationSource)) {
        errors.push(
          `❌ Invalid affiliationSource: College "${code}" has unknown source: "${acc.affiliationSource}". ` +
          `Expected one of: extracted, master, mismatch, ""`
        );
      }

      // -----------------------------------------------------------------------
      // 3. Mismatch implies reviewRequired
      // -----------------------------------------------------------------------
      if (acc.affiliationSource === "mismatch" && acc.reviewRequired !== true) {
        errors.push(
          `❌ Review Flag Mismatch: College "${code}" has affiliationSource="mismatch" ` +
          `but reviewRequired=${acc.reviewRequired} (expected true)`
        );
      }

      // -----------------------------------------------------------------------
      // 4. reviewRequired must be boolean
      // -----------------------------------------------------------------------
      if (typeof acc.reviewRequired !== "boolean") {
        errors.push(`❌ Invalid reviewRequired Type: College "${code}" reviewRequired is not boolean: ${acc.reviewRequired}`);
      }

      // -----------------------------------------------------------------------
      // 5. nirfParticipated must be boolean
      // -----------------------------------------------------------------------
      if (typeof acc.nirfParticipated !== "boolean") {
        errors.push(`❌ Invalid nirfParticipated Type: College "${code}" nirfParticipated is not boolean: ${acc.nirfParticipated}`);
      }

      // -----------------------------------------------------------------------
      // 6. If nirfRank is set, nirfParticipated must be true
      // -----------------------------------------------------------------------
      if (acc.nirfRank !== null && acc.nirfRank !== undefined && acc.nirfParticipated !== true) {
        errors.push(
          `❌ NIRF Inconsistency: College "${code}" has nirfRank=${acc.nirfRank} but nirfParticipated=false`
        );
      }

      // -----------------------------------------------------------------------
      // 7. accreditationHistory entries must have required fields
      // -----------------------------------------------------------------------
      if (!Array.isArray(hist)) {
        errors.push(`❌ History Type: College "${code}" accreditationHistory is not an array.`);
      } else {
        hist.forEach((snap, idx) => {
          if (!snap.snapshotAt) {
            errors.push(`❌ History Missing snapshotAt: College "${code}" history[${idx}] has no snapshotAt`);
          }
          if (typeof snap.confidence !== "number") {
            errors.push(`❌ History Missing confidence: College "${code}" history[${idx}] has no numeric confidence`);
          }
          if (typeof snap.naacGrade !== "string") {
            errors.push(`❌ History Missing naacGrade: College "${code}" history[${idx}] has no string naacGrade`);
          }
          if (typeof snap.affiliation !== "string") {
            errors.push(`❌ History Missing affiliation: College "${code}" history[${idx}] has no string affiliation`);
          }
        });
        // History must not exceed MAX_HISTORY
        if (hist.length > 5) {
          errors.push(`❌ History Overflow: College "${code}" accreditationHistory has ${hist.length} entries (max 5)`);
        }
      }

      // -----------------------------------------------------------------------
      // 8. NAAC Grade normalized (carry-over from Phase 2.4)
      // -----------------------------------------------------------------------
      if (acc.naacGrade && !NORMALIZED_NAAC_GRADES.includes(acc.naacGrade)) {
        errors.push(`❌ Invalid NAAC Grade: College "${code}" has unnormalized grade: "${acc.naacGrade}"`);
      }

      // -----------------------------------------------------------------------
      // 9. Affiliation normalized (carry-over from Phase 2.4)
      // -----------------------------------------------------------------------
      if (acc.affiliation && !NORMALIZED_AFFILIATIONS.includes(acc.affiliation)) {
        errors.push(`❌ Invalid Affiliation: College "${code}" has unnormalized affiliation: "${acc.affiliation}"`);
      }

      // -----------------------------------------------------------------------
      // CBIT fixture assertions
      // -----------------------------------------------------------------------
      if (code === "CBIT") {
        cbitChecked = true;

        // NBA programs — must all be normalized
        const badCbitPrograms = (acc.nbaPrograms || []).filter(p => !NORMALIZED_NBA_PROGRAMS.includes(p));
        if (badCbitPrograms.length > 0) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT: NBA programs contain unnormalized entries: ${badCbitPrograms.join(", ")}`);
        }

        // Should not be flagged as a mismatch (CBIT is OU, CollegeMaster should also say OU)
        if (acc.affiliationSource === "mismatch") {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT: affiliationSource should not be "mismatch"`);
        }

        // reviewRequired should be false for CBIT
        if (acc.reviewRequired !== false) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT: reviewRequired expected false, got ${acc.reviewRequired}`);
        }

        // nirfParticipated must be boolean
        if (typeof acc.nirfParticipated !== "boolean") {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT: nirfParticipated is not boolean`);
        }

        // NAAC Grade
        if (acc.naacGrade !== "A++") {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT: Expected NAAC Grade 'A++', found '${acc.naacGrade}'`);
        }

        // Affiliation
        if (acc.affiliation !== "OU") {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT: Expected affiliation 'OU', found '${acc.affiliation}'`);
        }

        // Autonomous
        if (acc.autonomous !== true) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT: Expected autonomous true, found ${acc.autonomous}`);
        }

        console.log(`  NBA Programs: ${acc.nbaPrograms.join(", ") || "none"}`);
        console.log(`  affiliationSource: ${acc.affiliationSource}`);
        console.log(`  reviewRequired: ${acc.reviewRequired}`);
        console.log(`  nirfParticipated: ${acc.nirfParticipated}`);
        console.log(`  History entries: ${hist.length}`);
      }
    }

    // -------------------------------------------------------------------------
    // Build assertion summary
    // -------------------------------------------------------------------------
    const assertions = {
      nbaProgramsNormalized:     errors.filter(e => e.includes("Unnormalized NBA Program") || e.includes("NBA programs contain")).length === 0,
      affiliationSourcePopulated: errors.filter(e => e.includes("affiliationSource")).length === 0,
      mismatchFlaggedCorrectly:  errors.filter(e => e.includes("Review Flag Mismatch")).length === 0,
      reviewRequiredIsBoolean:   errors.filter(e => e.includes("reviewRequired Type")).length === 0,
      nirfParticipatedIsBoolean: errors.filter(e => e.includes("nirfParticipated Type")).length === 0,
      nirfConsistencyCheck:      errors.filter(e => e.includes("NIRF Inconsistency")).length === 0,
      historyStructureValid:     errors.filter(e => e.includes("History")).length === 0,
      naacGradeNormalized:       errors.filter(e => e.includes("Invalid NAAC Grade")).length === 0,
      affiliationNormalized:     errors.filter(e => e.includes("Invalid Affiliation")).length === 0,
      cbitAssertionsPassed
    };

    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: totalCollegesChecked,
        cbitChecked
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "accreditation-hardening-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    // -------------------------------------------------------------------------
    // Console summary
    // -------------------------------------------------------------------------
    console.log("\n------------------------------------------------");
    console.log("ACCREDITATION HARDENING VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ NBA Programs Normalized:        ${assertions.nbaProgramsNormalized        ? "PASS" : "FAIL"}`);
    console.log(`✓ Affiliation Source Populated:   ${assertions.affiliationSourcePopulated   ? "PASS" : "FAIL"}`);
    console.log(`✓ Mismatch Flagged Correctly:     ${assertions.mismatchFlaggedCorrectly     ? "PASS" : "FAIL"}`);
    console.log(`✓ reviewRequired Is Boolean:      ${assertions.reviewRequiredIsBoolean      ? "PASS" : "FAIL"}`);
    console.log(`✓ nirfParticipated Is Boolean:    ${assertions.nirfParticipatedIsBoolean    ? "PASS" : "FAIL"}`);
    console.log(`✓ NIRF Consistency Check:         ${assertions.nirfConsistencyCheck         ? "PASS" : "FAIL"}`);
    console.log(`✓ History Structure Valid:        ${assertions.historyStructureValid        ? "PASS" : "FAIL"}`);
    console.log(`✓ NAAC Grade Normalized:          ${assertions.naacGradeNormalized          ? "PASS" : "FAIL"}`);
    console.log(`✓ Affiliation Normalized:         ${assertions.affiliationNormalized        ? "PASS" : "FAIL"}`);
    console.log(`✓ CBIT Assertions Passed:         ${assertions.cbitAssertionsPassed         ? "PASS" : "FAIL"}`);
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during hardening verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Accreditation hardening verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during accreditation hardening verification:", error);
    process.exit(1);
  }
};

run();
