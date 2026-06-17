import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { 
  determineReviewStatus, 
  classifyWebsiteHealth 
} from "../services/reviewWorkflowService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database for verification...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges to verify.`);

    const reportPath = path.resolve(__dirname, "../../reports/review-queue-refinement-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found at: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    console.log("Loaded review-queue-refinement-report.json");

    const previousReportPath = path.resolve(__dirname, "../../reports/review-workflow-report.json");
    let previousReport = null;
    if (fs.existsSync(previousReportPath)) {
      previousReport = JSON.parse(fs.readFileSync(previousReportPath, "utf8"));
      console.log("Loaded review-workflow-report.json (previous phase)");
    }

    const assertions = {
      warningWebsitesDoNotEnterQueue: true,
      criticalWebsitesEnterQueue: true,
      trustDeficienciesGeneratedCorrectly: true,
      queueVolumeReducedComparedTo27A: true
    };
    const errors = [];

    // 1. Verify warning websites do not enter queue (mocked check)
    console.log("Asserting warning websites do not enter queue...");
    const mockWarningCol = {
      officialWebsite: {
        url: "http://example.com",
        health: {
          healthy: false,
          sslValid: null,
          error: "TIMEOUT",
          lastCheckedAt: new Date(),
          status: "warning"
        }
      },
      officialData: {
        trustScore: {
          score: 80,
          breakdown: {
            galleryQuality: 10,
            contactQuality: 10,
            facilitiesQuality: 10,
            accreditationQuality: 15,
            placementQuality: 15,
            dataFreshness: 10
          }
        },
        profileCompleteness: { score: 90 },
        accreditation: { reviewRequired: false },
        placements: { reviewRequired: false }
      }
    };
    const warningResult = determineReviewStatus(mockWarningCol);
    if (warningResult.status === "pending_review") {
      errors.push("Mock college with warning website entered review queue, expected approved/not_required");
      assertions.warningWebsitesDoNotEnterQueue = false;
    }
    if (!warningResult.improvementFlags.includes("website_warning")) {
      errors.push("Mock college with warning website is missing website_warning flag");
      assertions.warningWebsitesDoNotEnterQueue = false;
    }

    // 2. Verify critical websites enter queue (mocked check)
    console.log("Asserting critical websites enter queue...");
    const mockCriticalCol = {
      officialWebsite: {
        url: "http://example.com",
        health: {
          healthy: false,
          sslValid: false,
          error: "CERT_HAS_EXPIRED",
          lastCheckedAt: new Date(),
          status: "critical"
        }
      },
      officialData: {
        trustScore: {
          score: 80,
          breakdown: {
            galleryQuality: 10,
            contactQuality: 10,
            facilitiesQuality: 10,
            accreditationQuality: 15,
            placementQuality: 15,
            dataFreshness: 10
          }
        },
        profileCompleteness: { score: 90 },
        accreditation: { reviewRequired: false },
        placements: { reviewRequired: false }
      }
    };
    const criticalResult = determineReviewStatus(mockCriticalCol);
    if (criticalResult.status !== "pending_review") {
      errors.push("Mock college with critical website did not enter review queue");
      assertions.criticalWebsitesEnterQueue = false;
    }
    if (criticalResult.reviewQueuePriority !== "High") {
      errors.push(`Mock college with critical website has priority ${criticalResult.reviewQueuePriority}, expected High`);
      assertions.criticalWebsitesEnterQueue = false;
    }

    // 3. Verify trust deficiencies generated correctly
    console.log("Asserting trust deficiencies generated correctly...");
    const mockDeficientCol = {
      officialData: {
        trustScore: {
          score: 30,
          breakdown: {
            galleryQuality: 5,
            contactQuality: 0,
            facilitiesQuality: 8,
            accreditationQuality: 10,
            placementQuality: 5,
            dataFreshness: 4
          }
        }
      }
    };
    const deficiencyResult = determineReviewStatus(mockDeficientCol);
    const expectedDeficiencies = [
      "missing_gallery_quality",
      "missing_contact_quality",
      "missing_facilities_quality",
      "missing_accreditation_quality",
      "missing_placement_quality",
      "stale_data"
    ];
    for (const exp of expectedDeficiencies) {
      if (!deficiencyResult.trustDeficiencies.includes(exp)) {
        errors.push(`Deficiencies list is missing: ${exp}`);
        assertions.trustDeficienciesGeneratedCorrectly = false;
      }
    }

    // 4. Verify queue volume reduced compared to 2.7A
    console.log("Asserting website unhealthy queue volume is reduced compared to Phase 2.7A...");
    if (previousReport) {
      const prevUnhealthyCount = previousReport.summary.reasonsBreakdown?.website_unhealthy || 0;
      const currUnhealthyCount = report.summary.reasonsBreakdown?.website_unhealthy || 0;
      console.log(`  Previous Phase (2.7A) website_unhealthy count: ${prevUnhealthyCount}`);
      console.log(`  Current Phase (2.7B) website_unhealthy count: ${currUnhealthyCount}`);
      if (currUnhealthyCount >= prevUnhealthyCount) {
        errors.push(`Website-unhealthy queue reasons did not decrease: current=${currUnhealthyCount}, previous=${prevUnhealthyCount}`);
        assertions.queueVolumeReducedComparedTo27A = false;
      }
    } else {
      console.log("  Previous report not found, skipping relative volume comparison. Validating warning count > 0 instead...");
      if (report.summary.warnings === 0) {
        errors.push("No website warnings were classified, meaning warning filter is not actively reducing critical queue items.");
        assertions.queueVolumeReducedComparedTo27A = false;
      }
    }

    const allPassed = Object.values(assertions).every(Boolean) && errors.length === 0;
    const status = allPassed ? "PASSED" : "FAILED";

    const verificationResult = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: colleges.length,
        previousUnhealthyCount: previousReport ? previousReport.summary.reasonsBreakdown?.website_unhealthy : null,
        currentUnhealthyCount: report.summary.reasonsBreakdown?.website_unhealthy,
        warningsCount: report.summary.warnings
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const verificationPath = path.join(reportsDir, "review-queue-refinement-verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log(`REVIEW QUEUE QUALITY REFINEMENT VERIFICATION COMPLETE: ${status}`);
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
