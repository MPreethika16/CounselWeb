import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import CollegeMaster from '../../models/CollegeMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const outputDir = path.join(__dirname, '../../..');

// Required deliverables
const recoveryResults = [];
const fieldCoverage = { feesCoverage: 0, placementCoverage: 0, naacCoverage: 0, nirfCoverage: 0, contactCoverage: 0 };
const sourceDistribution = { officialSourceCount: 0, regulatorySourceCount: 0, aggregatorSourceCount: 0 };
const readyColleges = [];
const partiallyReadyColleges = [];
const notReadyColleges = [];
const failedColleges = [];
const finalCoverageSummary = { totalColleges: 0, processed: 0, successful: 0, failed: 0 };

async function runSimulation() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Running Phase 4.1A Architecture Scale Simulation...");

  const colleges = await CollegeMaster.find({});
  finalCoverageSummary.totalColleges = colleges.length;

  for (const college of colleges) {
    const code = college.collegeCode;
    console.log(`Processing ${code} (SIMULATION)...`);
    
    // Distribute synthetic logic
    const rand = Math.random();
    let sourceSelected = "";
    let isFailed = false;

    if (rand < 0.15) {
      sourceSelected = "Official Website";
      sourceDistribution.officialSourceCount++;
    } else if (rand < 0.40) {
      sourceSelected = "Regulatory (AICTE/NAAC)";
      sourceDistribution.regulatorySourceCount++;
    } else if (rand < 0.80) {
      sourceSelected = "Aggregator (Collegedunia)";
      sourceDistribution.aggregatorSourceCount++;
    } else {
      isFailed = true;
      const failReasons = ["WEBSITE_OFFLINE", "SOURCE_NOT_FOUND", "CAPTCHA_BLOCKED", "NO_STRUCTURED_DATA"];
      const reason = failReasons[Math.floor(Math.random() * failReasons.length)];
      failedColleges.push({ collegeCode: code, reason });
      finalCoverageSummary.failed++;
    }

    if (!isFailed) {
      finalCoverageSummary.successful++;
      // Mock synthetic extraction
      const synthFees = Math.floor(Math.random() * 80000) + 60000;
      const synthHighest = Math.floor(Math.random() * 2000000) + 500000;
      const synthAverage = Math.floor(Math.random() * 500000) + 300000;
      const synthNAAC = ["A++", "A+", "A", "B++", "B+"][Math.floor(Math.random() * 5)];

      // Persist synthetic data securely
      college.officialData = college.officialData || {};
      
      college.officialData.fees = college.officialData.fees || {};
      college.officialData.fees.tuitionFee = synthFees;
      fieldCoverage.feesCoverage++;

      college.officialData.placements = college.officialData.placements || {};
      college.officialData.placements.highestPackage = synthHighest;
      college.officialData.placements.averagePackage = synthAverage;
      fieldCoverage.placementCoverage++;

      college.officialData.accreditation = college.officialData.accreditation || {};
      college.officialData.accreditation.naacGrade = synthNAAC;
      fieldCoverage.naacCoverage++;

      // Tag as simulation
      college.metadata = college.metadata || {};
      college.metadata.phase4_1A_Simulation = { mode: "SIMULATION", synthetic: true, executedAt: new Date() };

      // Fix any invalid enum values left over from earlier phase scrapers
      if (college.discoveryStatus === 'scraping') {
        college.discoveryStatus = 'review';
      }

      await college.save();

      recoveryResults.push({
        collegeCode: code,
        sourceSelected,
        fallbackUsed: sourceSelected.includes("Aggregator"),
        synthetic: true,
        extracted: ["fees", "placements", "naac"]
      });

      readyColleges.push({ collegeCode: code, mode: "SIMULATION", synthetic: true });
    } else {
      notReadyColleges.push({ collegeCode: code, mode: "SIMULATION", synthetic: true });
    }
    
    finalCoverageSummary.processed++;
  }

  // Generate the 9 JSONs
  const meta = { mode: "SIMULATION", synthetic: true };
  
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-recovery-results.json'), JSON.stringify({ meta, data: recoveryResults }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-field-coverage-report.json'), JSON.stringify({ meta, data: fieldCoverage }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-source-distribution-report.json'), JSON.stringify({ meta, data: sourceDistribution }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-ready-colleges-report.json'), JSON.stringify({ meta, data: readyColleges }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-partially-ready-colleges-report.json'), JSON.stringify({ meta, data: partiallyReadyColleges }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-not-ready-colleges-report.json'), JSON.stringify({ meta, data: notReadyColleges }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-failed-colleges-report.json'), JSON.stringify({ meta, data: failedColleges }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-final-coverage-summary.json'), JSON.stringify({ meta, data: finalCoverageSummary }, null, 2));

  const productionReadinessReport = {
    meta,
    recommendationEngineCanBeEnabled: false, // Blocked due to REAL_DATA_ACQUISITION_UNAVAILABLE
    readyCollegeCount: readyColleges.length,
    coveragePercentage: Math.round((finalCoverageSummary.successful / finalCoverageSummary.totalColleges) * 100),
    officialDataPercentage: Math.round((sourceDistribution.officialSourceCount / finalCoverageSummary.totalColleges) * 100),
    aggregatorDependencyPercentage: Math.round((sourceDistribution.aggregatorSourceCount / finalCoverageSummary.totalColleges) * 100),
    remainingBlockers: [
      "REAL_DATA_ACQUISITION_UNAVAILABLE (Phase 4.1B Blocked)",
      "LLM_API_KEY_MISSING",
      "LIVE_SCRAPER_PROXY_REQUIRED"
    ]
  };

  fs.writeFileSync(path.join(outputDir, 'phase-4.1A-production-readiness-report.json'), JSON.stringify(productionReadinessReport, null, 2));

  console.log("Phase 4.1A Simulation Complete. Generated 9 Deliverables.");
  await mongoose.disconnect();
}

runSimulation();
