import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import CollegeMaster from '../../models/CollegeMaster.js';
import { acquireCollegeData } from './dataAcquisition.js';
import { extractGroundedData } from './llmExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runPipeline() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Initializing Phase 4.0 Pipeline...");

  // Select a subset of 5 colleges for the initial proof-of-concept run
  const testCodes = ['AARM', 'ACEG', 'CBIT', 'KMIT', 'VASV'];
  const colleges = await CollegeMaster.find({ collegeCode: { $in: testCodes } });

  const summary = [];

  for (const college of colleges) {
    console.log(`\n--- Processing: ${college.collegeCode} ---`);
    
    // 1. Data Acquisition
    const rawData = await acquireCollegeData(college);
    
    // 2. LLM Grounded Extraction
    const extractedData = await extractGroundedData(rawData);

    // 3. Database Persistence & Traceability Assignment
    let updated = false;

    // Persist Highest Package Traceability
    if (extractedData.highestPackage) {
      college.officialData = college.officialData || {};
      college.officialData.placements = college.officialData.placements || {};
      college.officialData.placements.highestPackage = extractedData.highestPackage.value;
      
      college.officialData.placements.lineage = college.officialData.placements.lineage || {};
      college.officialData.placements.lineage.highestPackage = {
        sourceUrl: extractedData.highestPackage.sourceUrl,
        sourceType: extractedData.highestPackage.sourceType,
        extractedAt: extractedData.highestPackage.retrievedAt,
        evidenceText: extractedData.highestPackage.evidenceText
      };
      updated = true;
    }

    // Persist Average Package Traceability
    if (extractedData.averagePackage) {
      college.officialData.placements.averagePackage = extractedData.averagePackage.value;
      college.officialData.placements.lineage.averagePackage = {
        sourceUrl: extractedData.averagePackage.sourceUrl,
        sourceType: extractedData.averagePackage.sourceType,
        extractedAt: extractedData.averagePackage.retrievedAt,
        evidenceText: extractedData.averagePackage.evidenceText
      };
      updated = true;
    }

    // Persist Tuition Fee Traceability
    if (extractedData.tuitionFee) {
      college.officialData.fees = college.officialData.fees || {};
      college.officialData.fees.tuitionFee = extractedData.tuitionFee.value;
      // In a full implementation, lineage for fees would be formally added to schema.
      // We store the source inline for now:
      college.officialData.fees.sourceUrl = extractedData.tuitionFee.sourceUrl;
      college.officialData.fees.extractedAt = extractedData.tuitionFee.retrievedAt;
      updated = true;
    }

    // Persist NAAC Grade Traceability
    if (extractedData.naacGrade) {
      college.officialData.accreditation = college.officialData.accreditation || {};
      college.officialData.accreditation.naacGrade = extractedData.naacGrade.value;
      college.officialData.accreditation.sourceUrl = extractedData.naacGrade.sourceUrl;
      college.officialData.accreditation.evidenceText = extractedData.naacGrade.evidenceText;
      college.officialData.accreditation.extractedAt = extractedData.naacGrade.retrievedAt;
      updated = true;
    }

    if (updated) {
      await college.save();
      summary.push({
        collegeCode: college.collegeCode,
        extractedFields: Object.keys(extractedData).filter(k => extractedData[k] !== null),
        traceabilityUrl: rawData.sourceUrl
      });
      console.log(`Successfully committed traceable data for ${college.collegeCode}`);
    }
  }

  console.log("\n--- Phase 4.0 Pipeline Run Complete ---");
  console.log(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
}

runPipeline();
