import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CollegeMaster from '../models/CollegeMaster.js';
import ScraperJob from '../models/ScraperJob.js';
import TelanganaLifecycleAuditService from '../services/telanganaLifecycleAuditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runLifecycleAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    // Fetch Telangana colleges
    const colleges = await CollegeMaster.find({
      $or: [
        { state: { $regex: /telangana/i } },
        { location: { $regex: /hyderabad/i } }
      ]
    }).lean();

    // Fetch all scraper jobs to analyze queue and worker health
    const allJobs = await ScraperJob.find({}).lean();

    console.log(`Discovered ${colleges.length} actual database records for Telangana EAMCET forensics.`);
    console.log(`Discovered ${allJobs.length} total ScraperJob records in the queue.`);

    const auditService = new TelanganaLifecycleAuditService();
    const reports = auditService.generateReports(colleges, allJobs);

    // Write all reports
    for (const [filename, data] of Object.entries(reports)) {
      fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(data, null, 2));
    }

    console.log('Phase 2.2 Queue Dispatch, Worker Health & Job Lifecycle Audit successfully completed.');

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runLifecycleAudit();
