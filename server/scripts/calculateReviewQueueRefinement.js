import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { 
  determineReviewStatus, 
  classifyWebsiteHealth, 
  buildReviewQueueMetrics 
} from "../services/reviewWorkflowService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Resetting fields in CollegeMaster to avoid type cast conflicts...");
    await CollegeMaster.updateMany({}, {
      $unset: { 
        "officialWebsite.health.status": "",
        "officialData.reviewStatus": ""
      }
    });

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.`);

    const details = [];
    let processed = 0;

    const reasonsBreakdown = {
      placement_outlier: 0,
      website_unhealthy: 0,
      affiliation_conflict: 0,
      low_trust_score: 0,
      incomplete_profile: 0
    };

    for (const college of colleges) {
      // 1. Classify website health status
      const health = college.officialWebsite?.health || {};
      const healthStatus = classifyWebsiteHealth(health);
      
      college.officialWebsite = college.officialWebsite || {};
      college.officialWebsite.health = college.officialWebsite.health || {};
      college.officialWebsite.health.status = healthStatus;

      // 2. Determine review status
      const review = determineReviewStatus(college);
      
      college.officialData = college.officialData || {};
      college.officialData.reviewStatus = review;
      
      college.markModified("officialWebsite");
      college.markModified("officialData");
      await college.save();

      // Update reason breakdown
      for (const reason of review.reviewReasons) {
        if (reason in reasonsBreakdown) {
          reasonsBreakdown[reason]++;
        }
      }

      console.log(`[${college.collegeCode}] Health Status: ${healthStatus}, Review Status: ${review.status}, Priority: ${review.reviewQueuePriority}, Deficiencies: ${review.trustDeficiencies.length}`);

      details.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        healthStatus,
        reviewStatus: review
      });
      processed++;
    }

    const metrics = buildReviewQueueMetrics(details);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalColleges: colleges.length,
        ...metrics,
        reasonsBreakdown
      },
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "review-queue-refinement-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("REVIEW QUEUE QUALITY REFINEMENT CALCULATION COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Total processed: ${colleges.length}`);
    console.log(`Critical priority: ${metrics.critical}`);
    console.log(`High priority: ${metrics.high}`);
    console.log(`Medium priority: ${metrics.medium}`);
    console.log(`Not required / approved: ${metrics.notRequired}`);
    console.log(`Warnings (improvement website failures): ${metrics.warnings}`);
    console.log("Reasons Breakdown:", JSON.stringify(reasonsBreakdown, null, 2));
    console.log("------------------------------------------------");
    console.log(`Report: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during review queue quality refinement calculation:", error);
    process.exit(1);
  }
};

run();
