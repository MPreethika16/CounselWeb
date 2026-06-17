import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { determineReviewStatus } from "../services/reviewWorkflowService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Approved identifiers for trust deficiencies (machine‑readable enum)
const TRUST_DEFICIENCY_ENUM = [
  "gallery_quality_low",
  "contact_quality_low",
  "facilities_quality_low",
  "accreditation_quality_low",
  "placement_quality_low",
  "data_stale",
];

const run = async () => {
  try {
    console.log("Connecting to DB for hardening verification (v2)...");
    await connectDB();

    // ---------- 1. low_trust_score alone ----------
    const lowTrustOnly = {
      officialData: {
        trustScore: { score: 55, breakdown: { galleryQuality: 10, contactQuality: 10, facilitiesQuality: 10, accreditationQuality: 15, placementQuality: 15, dataFreshness: 10 } },
        profileCompleteness: { score: 80 },
        accreditation: { reviewRequired: false },
        placements: { reviewRequired: false },
      },
    };
    const lowTrustResult = determineReviewStatus(lowTrustOnly);
    const lowTrustAssertions = {
      noQueue: lowTrustResult.status !== "pending_review",
      inImprovementFlags: lowTrustResult.improvementFlags.includes("low_trust_score"),
    };

    // ---------- 2. incomplete_profile alone ----------
    const incompleteProfileOnly = {
      officialData: {
        trustScore: { score: 80, breakdown: { galleryQuality: 10, contactQuality: 10, facilitiesQuality: 10, accreditationQuality: 15, placementQuality: 15, dataFreshness: 10 } },
        profileCompleteness: { score: 60 }, // below 70
        accreditation: { reviewRequired: false },
        placements: { reviewRequired: false },
      },
    };
    const incompleteProfileResult = determineReviewStatus(incompleteProfileOnly);
    const incompleteProfileAssertions = {
      noQueue: incompleteProfileResult.status !== "pending_review",
      inImprovementFlags: incompleteProfileResult.improvementFlags.includes("incomplete_profile"),
    };

    // ---------- 3. very_low_trust_score (<40) ----------
    const veryLowTrust = {
      officialData: {
        trustScore: { score: 35, breakdown: { galleryQuality: 5, contactQuality: 5, facilitiesQuality: 5, accreditationQuality: 10, placementQuality: 5, dataFreshness: 4 } },
        profileCompleteness: { score: 85 },
        accreditation: { reviewRequired: false },
        placements: { reviewRequired: false },
      },
    };
    const veryLowResult = determineReviewStatus(veryLowTrust);
    const veryLowAssertions = {
      pendingReview: veryLowResult.status === "pending_review",
      mediumPriority: veryLowResult.reviewQueuePriority === "Medium",
    };

    // ---------- 4. website_warning alone ----------
    const websiteWarningOnly = {
      officialWebsite: { url: "http://example.org", health: { healthy: false, sslValid: null, error: "TIMEOUT", lastCheckedAt: new Date(), status: "warning" } },
      officialData: {
        trustScore: { score: 80, breakdown: { galleryQuality: 10, contactQuality: 10, facilitiesQuality: 10, accreditationQuality: 15, placementQuality: 15, dataFreshness: 10 } },
        profileCompleteness: { score: 90 },
        accreditation: { reviewRequired: false },
        placements: { reviewRequired: false },
      },
    };
    const warningResult = determineReviewStatus(websiteWarningOnly);
    const websiteWarningAssertions = {
      noQueue: warningResult.status !== "pending_review",
      hasFlag: warningResult.improvementFlags.includes("website_warning"),
    };

    // ---------- 5. approved / rejected manual statuses ----------
    const approvedCollege = {
      collegeCode: "COL001",
      officialData: { reviewStatus: { status: "approved", reviewQueuePriority: "none", reviewReasons: [], improvementFlags: [], trustDeficiencies: [] } },
    };
    const rejectedCollege = {
      collegeCode: "COL002",
      officialData: { reviewStatus: { status: "rejected", reviewQueuePriority: "none", reviewReasons: [], improvementFlags: [], trustDeficiencies: [] } },
    };
    const approvedResult = determineReviewStatus(approvedCollege);
    const rejectedResult = determineReviewStatus(rejectedCollege);
    const manualStatusAssertions = {
      approvedUnchanged: approvedResult.status === "approved" && approvedResult.reviewQueuePriority === "none",
      rejectedUnchanged: rejectedResult.status === "rejected" && rejectedResult.reviewQueuePriority === "none",
    };

    // ---------- 6. trustDeficiencies enum validation ----------
    const deficientCollege = {
      officialData: {
        trustScore: { score: 30, breakdown: { galleryQuality: 5, contactQuality: 0, facilitiesQuality: 8, accreditationQuality: 10, placementQuality: 5, dataFreshness: 4 } },
      },
    };
    const defResult = determineReviewStatus(deficientCollege);
    const trustDeficiencyEnumValid = defResult.trustDeficiencies.every(d => TRUST_DEFICIENCY_ENUM.includes(d));
    const unexpectedDeficiencies = defResult.trustDeficiencies.filter(d => !TRUST_DEFICIENCY_ENUM.includes(d));

    const verificationResult = {
      timestamp: new Date().toISOString(),
      assertions: {
        low_trust_score_alone: lowTrustAssertions,
        incomplete_profile_alone: incompleteProfileAssertions,
        very_low_trust_score: veryLowAssertions,
        website_warning_alone: websiteWarningAssertions,
        manual_statuses_unchanged: manualStatusAssertions,
        trustDeficiencies_enum_valid: trustDeficiencyEnumValid,
        unexpected_trust_deficiencies: unexpectedDeficiencies,
      },
      details: {
        lowTrustResult,
        incompleteProfileResult,
        veryLowResult,
        websiteWarningResult: warningResult,
        approvedResult,
        rejectedResult,
        deficiencyResult: defResult,
      },
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, "review-queue-hardening-v2-report.json");
    const verificationPath = path.join(reportsDir, "review-queue-hardening-v2-verification.json");
    // Save the full result report (similar to previous hardening report)
    const fullReport = { timestamp: new Date().toISOString(), details: verificationResult.details };
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2), "utf8");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("Verification v2 complete. Reports generated:");
    console.log(`  Report: ${reportPath}`);
    console.log(`  Verification: ${verificationPath}`);
    process.exit(0);
  } catch (e) {
    console.error("Verification v2 failed:", e);
    process.exit(1);
  }
};

run();
