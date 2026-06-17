import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import {
  determineReviewStatus,
  buildReviewQueueMetrics,
} from "../services/reviewWorkflowService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const IMPROVEMENT_ONLY_FLAGS = new Set(["low_trust_score", "incomplete_profile"]);

const run = async () => {
  try {
    console.log("Connecting to database for optimization verification...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    const reportPath = path.resolve(__dirname, "../../reports/review-queue-optimization-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found: ${reportPath}. Run optimizeReviewQueue.js first.`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    const errors = [];
    const assertions = {
      notAllCollegesInQueue: false,
      criticalItemsPrioritized: true,
      improvementFlagsSeparate: true,
      approvedCollegesExcluded: true,
      metricsMatchDatabase: true,
    };

    let pendingCount = 0;
    let notRequiredCount = 0;

    for (const col of colleges) {
      const rs = col.officialData?.reviewStatus;
      if (!rs) {
        errors.push(`[${col.collegeCode}] reviewStatus missing`);
        continue;
      }

      if (rs.status === "pending_review") pendingCount++;
      if (rs.status === "not_required") notRequiredCount++;

      const expected = determineReviewStatus(col);
      if (rs.status !== expected.status) {
        errors.push(`[${col.collegeCode}] status ${rs.status} != expected ${expected.status}`);
      }
      if (rs.reviewQueuePriority !== expected.reviewQueuePriority) {
        errors.push(
          `[${col.collegeCode}] priority ${rs.reviewQueuePriority} != expected ${expected.reviewQueuePriority}`
        );
        assertions.criticalItemsPrioritized = false;
      }

      // Improvement flags must not appear in reviewReasons
      for (const flag of rs.improvementFlags || []) {
        if ((rs.reviewReasons || []).includes(flag)) {
          errors.push(`[${col.collegeCode}] improvement flag "${flag}" incorrectly in reviewReasons`);
          assertions.improvementFlagsSeparate = false;
        }
        if (!IMPROVEMENT_ONLY_FLAGS.has(flag)) {
          errors.push(`[${col.collegeCode}] unknown improvement flag: ${flag}`);
          assertions.improvementFlagsSeparate = false;
        }
      }

      for (const reason of IMPROVEMENT_ONLY_FLAGS) {
        if ((rs.reviewReasons || []).includes(reason)) {
          errors.push(`[${col.collegeCode}] "${reason}" must be in improvementFlags only, not reviewReasons`);
          assertions.improvementFlagsSeparate = false;
        }
      }

      // Critical priority must map to critical reasons only (or very_low on medium)
      if (rs.reviewQueuePriority === "Critical") {
        const hasCriticalReason =
          rs.reviewReasons.includes("placement_outlier") ||
          rs.reviewReasons.includes("affiliation_conflict");
        if (!hasCriticalReason) {
          errors.push(`[${col.collegeCode}] Critical priority without critical reason`);
          assertions.criticalItemsPrioritized = false;
        }
      }

      if (rs.status === "not_required" && rs.reviewQueuePriority !== "none") {
        errors.push(`[${col.collegeCode}] not_required must have priority none`);
      }

      if (rs.status === "pending_review" && rs.reviewQueuePriority === "none") {
        errors.push(`[${col.collegeCode}] pending_review must have a queue priority`);
      }
    }

    assertions.notAllCollegesInQueue =
      notRequiredCount > 0 && pendingCount < colleges.length;

    if (!assertions.notAllCollegesInQueue) {
      errors.push(
        `Queue saturation: ${pendingCount}/${colleges.length} in queue, ${notRequiredCount} not_required (expected some not_required)`
      );
    }

    // Mock approved exclusion
    const mockCollege = {
      officialWebsite: { health: { healthy: false } },
      officialData: {
        reviewStatus: { status: "approved" },
        trustScore: { score: 30, reviewFlags: ["website_unhealthy", "placement_outlier"] },
        profileCompleteness: { score: 50 },
        accreditation: { reviewRequired: true },
        placements: { reviewRequired: true, suspicious: true },
      },
    };
    const mockResult = determineReviewStatus(mockCollege);
    if (mockResult.status !== "approved" || mockResult.reviewQueuePriority !== "none") {
      errors.push("Approved college exclusion failed");
      assertions.approvedCollegesExcluded = false;
    }
    if (mockResult.reviewReasons.length > 0) {
      errors.push("Approved college should have empty reviewReasons");
      assertions.approvedCollegesExcluded = false;
    }

    // Metrics consistency
    const dbMetrics = buildReviewQueueMetrics(
      colleges.map((c) => ({ reviewStatus: c.officialData?.reviewStatus }))
    );
    const reportMetrics = report.summary?.reviewQueueMetrics || {};
    for (const key of ["critical", "high", "medium", "notRequired"]) {
      if (dbMetrics[key] !== reportMetrics[key]) {
        errors.push(`Metric mismatch for ${key}: DB=${dbMetrics[key]} report=${reportMetrics[key]}`);
        assertions.metricsMatchDatabase = false;
      }
    }

    const allPassed = Object.values(assertions).every(Boolean) && errors.length === 0;
    const status = allPassed ? "PASSED" : "FAILED";

    const verificationResult = {
      timestamp: new Date().toISOString(),
      phase: "2.7A",
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: colleges.length,
        pendingReview: pendingCount,
        notRequired: notRequiredCount,
        reviewQueueMetrics: dbMetrics,
        queueSaturationPercent: colleges.length
          ? Math.round((pendingCount / colleges.length) * 100)
          : 0,
      },
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    const verificationPath = path.join(reportsDir, "review-queue-optimization-verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log(`REVIEW QUEUE OPTIMIZATION VERIFICATION: ${status}`);
    console.log("------------------------------------------------");
    console.log(`Pending: ${pendingCount} | Not Required: ${notRequiredCount} | Total: ${colleges.length}`);
    console.log("Assertions:", JSON.stringify(assertions, null, 2));
    if (errors.length) errors.forEach((e) => console.error(` - ${e}`));
    console.log(`Report: ${verificationPath}`);
    console.log("------------------------------------------------\n");

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  }
};

run();
