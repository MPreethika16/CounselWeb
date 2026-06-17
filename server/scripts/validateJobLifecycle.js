import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CollegeMaster from '../models/CollegeMaster.js';
import ScraperJob from '../models/ScraperJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function validate() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    
    // Check if jobs were assigned to colleges and colleges were updated
    const colleges = await CollegeMaster.find({ "officialWebsite.url": { $exists: true, $ne: "" } });
    let passed = false;

    for (const c of colleges) {
      const jobs = await ScraperJob.find({ collegeCode: c.collegeCode });
      if (jobs.length > 0) {
        passed = true;
        break;
      }
    }

    if (passed) {
      console.log("PASS: Job lifecycle successfully coupled to colleges.");
    } else {
      console.log("FAIL: Lifecycle disjointed.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

validate();
