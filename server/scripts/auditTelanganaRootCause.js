import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CollegeMaster from '../models/CollegeMaster.js';
import TelanganaRootCauseAuditService from '../services/telanganaRootCauseAuditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runRootCauseAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    const targetColleges = [
      "CVR College of Engineering",
      "Vasavi College of Engineering",
      "Vardhaman College of Engineering",
      "Malla Reddy Engineering College",
      "Nalla Malla Reddy Engineering College"
    ];

    // Fetch Telangana colleges
    const colleges = await CollegeMaster.find({
      $or: [
        { state: { $regex: /telangana/i } },
        { location: { $regex: /hyderabad/i } },
        { collegeName: { $in: targetColleges.map(n => new RegExp(n, 'i')) } }
      ]
    }).lean();

    console.log(`Discovered ${colleges.length} actual database records for Telangana EAMCET forensics.`);

    const auditService = new TelanganaRootCauseAuditService();
    const results = auditService.generateReports(colleges);

    fs.writeFileSync(path.join(outputDir, 'pipeline-stage-report.json'), JSON.stringify(results.pipelineStageReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'scraper-failure-report.json'), JSON.stringify(results.scraperFailureReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'parser-failure-report.json'), JSON.stringify(results.parserFailureReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'normalization-failure-report.json'), JSON.stringify(results.normalizationFailureReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'database-write-report.json'), JSON.stringify(results.databaseWriteReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'recommendation-input-report.json'), JSON.stringify(results.recommendationInputReport, null, 2));
    
    // Save Root Cause Summary
    fs.writeFileSync(path.join(outputDir, 'root-cause-summary.json'), JSON.stringify(results.summary, null, 2));

    console.log('Phase 2.1 Pipeline Root Cause Analysis successfully completed.');
    console.log('Primary Root Cause Stage:', results.summary.primaryRootCauseStage);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runRootCauseAudit();
