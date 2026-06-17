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

const run = async () => {
  try {
    console.log("Connecting to database for verification...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges to verify.`);

    const reportPath = path.resolve(__dirname, "../../reports/review-workflow-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found at: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    console.log("Loaded review-workflow-report.json");

    const assertions = {
      reviewStatusGeneratedCorrectly: true,
      reviewReasonsPropagated: true,
      priorityAssignedCorrectly: true,
      approvedCollegesExcluded: true
    };
    const errors = [];

    // Verify each college's database record
    for (const col of colleges) {
      const rs = col.officialData?.reviewStatus;
      if (!rs) {
        errors.push(`[${col.collegeCode}] reviewStatus object is missing`);
        assertions.reviewStatusGeneratedCorrectly = false;
        continue;
      }

      const reasons = rs.reviewReasons || [];
      const status = rs.status;
      const priority = rs.reviewQueuePriority;

      const expected = determineReviewStatus(col);

      if (status !== expected.status) {
        errors.push(`[${col.collegeCode}] Status is ${status} but expected ${expected.status}`);
        assertions.reviewStatusGeneratedCorrectly = false;
      }
      if (priority !== expected.reviewQueuePriority) {
        errors.push(`[${col.collegeCode}] Priority is ${priority} but expected ${expected.reviewQueuePriority}`);
        assertions.priorityAssignedCorrectly = false;
      }
      const reasonsSorted = [...reasons].sort().join(",");
      const expectedReasonsSorted = [...(expected.reviewReasons || [])].sort().join(",");
      if (reasonsSorted !== expectedReasonsSorted) {
        errors.push(`[${col.collegeCode}] Reasons [${reasons.join(", ")}] != expected [${(expected.reviewReasons || []).join(", ")}]`);
        assertions.reviewReasonsPropagated = false;
      }

      const flagsSorted = [...(rs.improvementFlags || [])].sort().join(",");
      const expectedFlagsSorted = [...(expected.improvementFlags || [])].sort().join(",");
      if (flagsSorted !== expectedFlagsSorted) {
        errors.push(`[${col.collegeCode}] improvementFlags mismatch`);
        assertions.reviewReasonsPropagated = false;
      }

      if (reasons.length > 0 && status === "approved") {
        errors.push(`[${col.collegeCode}] Status is approved but has review reasons`);
        assertions.reviewStatusGeneratedCorrectly = false;
      }
    }

    // 4. Assert approved colleges excluded from queue
    const testCol = colleges[0];
    if (testCol) {
      console.log(`Testing manual approval exclusion for [${testCol.collegeCode}]...`);
      // Force manual approval state + some triggers
      const mockCollege = {
        officialWebsite: { health: { healthy: false } },
        officialData: {
          reviewStatus: { status: "approved" },
          trustScore: { score: 30, reviewFlags: ["website_unhealthy"] },
          profileCompleteness: { score: 50 },
          accreditation: { reviewRequired: true },
          placements: { reviewRequired: true }
        }
      };

      const result = determineReviewStatus(mockCollege);
      console.log(`  Mock result: status=${result.status}, priority=${result.reviewQueuePriority}, reasons=${JSON.stringify(result.reviewReasons)}`);
      
      if (result.status !== "approved") {
        errors.push("Mocked approved college status changed to pending_review");
        assertions.approvedCollegesExcluded = false;
      }
      if (result.reviewQueuePriority !== "none") {
        errors.push(`Mocked approved college queue priority is ${result.reviewQueuePriority} instead of none`);
        assertions.approvedCollegesExcluded = false;
      }
      if (result.reviewReasons.length > 0) {
        errors.push(`Mocked approved college has review reasons: ${result.reviewReasons.join(", ")}`);
        assertions.approvedCollegesExcluded = false;
      }
    } else {
      errors.push("No college found to run manual approval comparison");
      assertions.approvedCollegesExcluded = false;
    }

    const allPassed = Object.values(assertions).every(Boolean) && errors.length === 0;
    const status = allPassed ? "PASSED" : "FAILED";

    const verificationResult = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: colleges.length
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const verificationPath = path.join(reportsDir, "review-workflow-verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log(`ADMIN REVIEW WORKFLOW VERIFICATION COMPLETE: ${status}`);
    console.log("------------------------------------------------");
    if (errors.length > 0) {
      console.error("Errors found:");
      errors.forEach(e => console.error(` - ${e}`));
    } else {
      console.log("All assertions passed successfully!");
    }
    console.log(`Results written to: ${verificationPath}`);
    console.log("------------------------------------------------\n");

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error("Error during verification run:", err);
    process.exit(1);
  }
};

run();
