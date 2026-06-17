import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { determineReviewStatus, buildReviewQueueMetrics } from "../services/reviewWorkflowService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database for hardening calculation...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.`);

    const manualReviewSnapshots = new Map();
    // Preserve any manual admin decisions (approved/rejected)
    for (const college of colleges) {
      const rs = college.officialData?.reviewStatus;
      if (rs && (rs.status === "approved" || rs.status === "rejected")) {
        manualReviewSnapshots.set(college.collegeCode, { ...rs });
      }
    }
    console.log(`Preserving ${manualReviewSnapshots.size} manual review decisions.`);

    // Clear existing reviewStatus before recomputing
    await CollegeMaster.updateMany({}, { $unset: { "officialData.reviewStatus": "" } });

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
      // Restore manual decisions if any
      const manual = manualReviewSnapshots.get(college.collegeCode);
      if (manual) {
        college.officialData = college.officialData || {};
        college.officialData.reviewStatus = { ...manual };
      }

      const review = determineReviewStatus(college);

      await CollegeMaster.updateOne(
        { collegeCode: college.collegeCode },
        { $set: { "officialData.reviewStatus": review } }
      );

      // Update summary counts
      switch (review.status) {
        case "approved":
          summary.approved++;
          break;
        case "pending_review":
          summary.pendingReview++;
          break;
        case "not_required":
          summary.notRequired++;
          break;
        case "rejected":
          summary.rejected++;
          break;
      }

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

      details.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        reviewStatus: review,
      });
    }

    summary.reviewQueueMetrics = buildReviewQueueMetrics(details);

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      details,
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, "review-queue-hardening-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n--- Review Queue Hardening Calculation Complete ---");
    console.log(`Report written to: ${reportPath}`);
    process.exit(0);
  } catch (err) {
    console.error("Error during hardening calculation:", err);
    process.exit(1);
  }
};

run();
