import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ScraperJob from '../models/ScraperJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function validate() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    
    const completed = await ScraperJob.countDocuments({ status: "completed" });
    const failed = await ScraperJob.countDocuments({ status: "failed" });
    
    console.log(`Completed jobs: ${completed}, Failed jobs: ${failed}`);
    
    if (completed > 0 || failed > 0) {
      console.log("PASS: Workers executed jobs.");
    } else {
      console.log("FAIL: No worker execution.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

validate();
