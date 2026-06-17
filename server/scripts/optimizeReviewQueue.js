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

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.`);

    const manualReviewSnapshots = new Map();
    for (const college of colleges) {
      const rs = college.officialData?.reviewStatus;
      if (rs && (rs.status === "approved" || rs.status === "rejected")) {
        manualReviewSnapshots.set(college.collegeCode, { ...rs });
      }
    }

    console.log(`Preserving ${manualReviewSnapshots.size} manual review decision(s).`);
    console.log("Resetting reviewStatus for optimized queue recalculation...");
    await CollegeMaster.updateMany({}, {
      $unset: { "officialData.reviewStatus": "" },
    });

    for (const college of colleges) {
      if (college.officialData?.reviewStatus) {
        delete college.officialData.reviewStatus;
      }
    }

    const details = [];
    const summary = {
      totalColleges: colleges.length,
      approved: 0,
      pendingReview: 0,
      notRequired: 0,
      rejected: 0,
      reviewReasonsBreakdown: {
        placement_outlier: 0,
        affiliation_conflict: 0,
        website_unhealthy: 0,
        accreditation_review_required: 0,
        very_low_trust_score: 0,
      },
      improvementFlagsBreakdown: {
        low_trust_score: 0,
        incomplete_profile: 0,
      },
    };

    for (const college of colleges) {
      college.officialData = college.officialData || {};

      const manual = manualReviewSnapshots.get(college.collegeCode);
      if (manual) {
        college.officialData.reviewStatus = { ...manual };
      }

      const review = determineReviewStatus(college);

      await CollegeMaster.updateOne(
        { collegeCode: college.collegeCode },
        { $set: { "officialData.reviewStatus": review } }
      );

      if (review.status === "approved") summary.approved++;
      else if (review.status === "pending_review") summary.pendingReview++;
      else if (review.status === "not_required") summary.notRequired++;
      else if (review.status === "rejected") summary.rejected++;

      for (const reason of review.reviewReasons) {
        if (reason in summary.reviewReasonsBreakdown) {
          summary.reviewReasonsBreakdown[reason]++;
        }
      }
      for (const flag of review.improvementFlags) {
        if (flag in summary.improvementFlagsBreakdown) {
          summary.improvementFlagsBreakdown[flag]++;
        }
      }

      console.log(
        `[${college.collegeCode}] ${review.status} | ${review.reviewQueuePriority} | ` +
          `reasons=[${review.reviewReasons.join(", ")}] flags=[${review.improvementFlags.join(", ")}]`
      );

      details.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        reviewStatus: review,
      });
    }

    const reviewQueueMetrics = buildReviewQueueMetrics(details);

    const report = {
      timestamp: new Date().toISOString(),
      phase: "2.7A",
      summary: {
        ...summary,
        reviewQueueMetrics,
        queueSaturationPercent: colleges.length
          ? Math.round((summary.pendingReview / colleges.length) * 100)
          : 0,
      },
      details,
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "review-queue-optimization-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("REVIEW QUEUE OPTIMIZATION COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Total:          ${summary.totalColleges}`);
    console.log(`Pending Review: ${summary.pendingReview} (${report.summary.queueSaturationPercent}%)`);
    console.log(`Not Required:   ${summary.notRequired}`);
    console.log(`Approved:       ${summary.approved}`);
    console.log("Queue Metrics:", JSON.stringify(reviewQueueMetrics, null, 2));
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during review queue optimization:", error);
    process.exit(1);
  }
};

run();
