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
    
    const count = await ScraperJob.countDocuments({ status: "queued", url: { $ne: "https://example.com" } });
    console.log(`Dispatched jobs count: ${count}`);
    
    if (count > 0) {
      console.log("PASS: Job dispatch successful.");
    } else {
      console.log("FAIL: No jobs dispatched.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

validate();
