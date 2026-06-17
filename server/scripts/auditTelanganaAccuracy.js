import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CollegeMaster from '../models/CollegeMaster.js';
import TelanganaAccuracyAuditService from '../services/telanganaAccuracyAuditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runAccuracyAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    const auditService = new TelanganaAccuracyAuditService();

    // Fetch Telangana colleges
    const colleges = await CollegeMaster.find({
      $or: [
        { state: { $regex: /telangana/i } },
        { location: { $regex: /hyderabad/i } },
        { collegeName: { $in: auditService.benchmarkColleges.map(n => new RegExp(n, 'i')) } }
      ]
    }).lean();

    console.log(`Discovered ${colleges.length} actual database records for Telangana EAMCET.`);

    // 1. Dataset Coverage
    const coverage = auditService.calculateCoverage(colleges);
    fs.writeFileSync(path.join(outputDir, 'telangana-coverage-report.json'), JSON.stringify(coverage, null, 2));

    // 2. Official Website Validation
    const websites = auditService.validateWebsites(colleges);
    fs.writeFileSync(path.join(outputDir, 'verified-websites.json'), JSON.stringify(websites.verified, null, 2));
    fs.writeFileSync(path.join(outputDir, 'invalid-websites.json'), JSON.stringify(websites.invalid, null, 2));

    // 3. Placement Accuracy
    const placements = auditService.auditPlacements(colleges);
    fs.writeFileSync(path.join(outputDir, 'placement-audit-report.json'), JSON.stringify(placements, null, 2));

    // 4. Fee Accuracy
    const fees = auditService.auditFees(colleges);
    fs.writeFileSync(path.join(outputDir, 'fee-audit-report.json'), JSON.stringify(fees, null, 2));

    // 5. NAAC Verification
    const naac = auditService.verifyNaac(colleges);
    fs.writeFileSync(path.join(outputDir, 'naac-validation-report.json'), JSON.stringify(naac, null, 2));

    // 6. Ranking Verification
    const rankings = auditService.verifyRankings(colleges);
    fs.writeFileSync(path.join(outputDir, 'ranking-validation-report.json'), JSON.stringify(rankings, null, 2));

    // 7. Recommendation Explainability
    const explainability = auditService.generateExplainability(colleges);
    fs.writeFileSync(path.join(outputDir, 'telangana-top100-explainability.json'), JSON.stringify(explainability, null, 2));

    // 8. Benchmark Validation (Outputted as part of walkthrough usually, but we'll save it)
    const benchmarks = auditService.validateBenchmarks(colleges);
    fs.writeFileSync(path.join(outputDir, 'benchmark-validation-report.json'), JSON.stringify(benchmarks, null, 2));

    // 9. Recommendation Sanity Check
    const anomalies = auditService.detectRecommendationAnomalies(colleges);
    fs.writeFileSync(path.join(outputDir, 'recommendation-anomalies.json'), JSON.stringify(anomalies, null, 2));

    console.log('Phase 2.0 Scraper Recovery Validation & Source Accuracy Audit successfully completed.');

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runAccuracyAudit();
