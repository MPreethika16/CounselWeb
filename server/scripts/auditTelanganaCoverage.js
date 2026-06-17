import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CollegeMaster from '../models/CollegeMaster.js';
import TelanganaCoverageAuditService from '../services/telanganaCoverageAuditService.js';
import TelanganaDataGapService from '../services/telanganaDataGapService.js';
import TelanganaRecoveryPlannerService from '../services/telanganaRecoveryPlannerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    const coverageService = new TelanganaCoverageAuditService();
    const dataGapService = new TelanganaDataGapService();
    const recoveryPlanner = new TelanganaRecoveryPlannerService();

    // Fetch Telangana colleges
    const colleges = await CollegeMaster.find({
      $or: [
        { state: { $regex: /telangana/i } },
        { location: { $regex: /hyderabad/i } },
        { collegeName: { $in: dataGapService.benchmarkColleges.map(n => new RegExp(n, 'i')) } }
      ]
    }).lean();

    console.log(`Found ${colleges.length} Telangana EAMCET colleges.`);

    // 1. Inventory
    const inventory = coverageService.generateInventory(colleges);
    fs.writeFileSync(path.join(outputDir, 'telangana-inventory.json'), JSON.stringify(inventory, null, 2));

    // 2. Coverage Audit
    const coverageAudit = coverageService.generateCoverageAudit(colleges);
    fs.writeFileSync(path.join(outputDir, 'telangana-coverage-report.json'), JSON.stringify(coverageAudit, null, 2));

    // 6. Readiness Scores (needed for summary & benchmark audit)
    const readinessScores = recoveryPlanner.calculateReadinessScores(colleges);

    // 3. Blocker Detection
    const blockers = dataGapService.detectBlockers(colleges);
    fs.writeFileSync(path.join(outputDir, 'recommendation-blockers-report.json'), JSON.stringify(blockers, null, 2));

    // 4. Benchmark Deep Audit
    const benchmarkAudit = dataGapService.deepAuditBenchmarks(colleges, readinessScores);
    fs.writeFileSync(path.join(outputDir, 'telangana-data-gap-report.json'), JSON.stringify(benchmarkAudit, null, 2));

    // 5. Recovery Plan
    const recoveryPlan = recoveryPlanner.generateRecoveryPlan(colleges);
    fs.writeFileSync(path.join(outputDir, 'telangana-recovery-plan.json'), JSON.stringify(recoveryPlan, null, 2));

    // 7. Statewide Summary
    const summary = coverageService.generateStatewideSummary(colleges, readinessScores);
    fs.writeFileSync(path.join(outputDir, 'telangana-statewide-summary.json'), JSON.stringify(summary, null, 2));

    // Specific Missing Reports
    const missingFees = coverageAudit.filter(c => !c.fees);
    const missingPlacements = coverageAudit.filter(c => !c.placements);
    const missingRankings = coverageAudit.filter(c => !c.rankings);
    const missingNaac = coverageAudit.filter(c => !c.naac);

    fs.writeFileSync(path.join(outputDir, 'missing-fees-telangana.json'), JSON.stringify(missingFees, null, 2));
    fs.writeFileSync(path.join(outputDir, 'missing-placements-telangana.json'), JSON.stringify(missingPlacements, null, 2));
    fs.writeFileSync(path.join(outputDir, 'missing-rankings-telangana.json'), JSON.stringify(missingRankings, null, 2));
    fs.writeFileSync(path.join(outputDir, 'missing-naac-telangana.json'), JSON.stringify(missingNaac, null, 2));

    console.log('All coverage audit reports generated successfully.');

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runAudit();
