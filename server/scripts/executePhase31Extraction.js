import fs from 'fs';
import path from 'path';
import { fileURLToPath, URL } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import CollegeMaster from '../models/CollegeMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runPhase31() {
  const outputDir = path.join(__dirname, '../..');
  const readinessPath = path.join(outputDir, 'website-recovery-readiness.json');
  const activeContentPath = path.join(outputDir, 'active-website-content-report.json');
  
  if (!fs.existsSync(readinessPath) || !fs.existsSync(activeContentPath)) {
    console.error("Required dependency reports not found.");
    return;
  }
  
  const readinessData = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
  const contentData = JSON.parse(fs.readFileSync(activeContentPath, 'utf8'));

  const highReadinessCodes = readinessData
    .filter(c => c.recoveryReadiness === 'HIGH')
    .map(c => c.collegeCode);

  console.log(`Starting Phase 3.1 Extraction. Targeting ${highReadinessCodes.length} HIGH readiness colleges.`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const extractionReport = [];
  const normalizationReport = [];
  const persistenceReport = [];

  let processed = 0;
  let successCount = 0;
  let persistedCount = 0;
  const sectionCoverage = { placements: 0, fees: 0, naac: 0 };
  let partialCoverageCount = 0;

  for (const code of highReadinessCodes) {
    console.log(`[${processed + 1}/${highReadinessCodes.length}] Extracting ${code}...`);
    
    const college = await CollegeMaster.findOne({ collegeCode: code });
    const contentInfo = contentData.find(c => c.collegeCode === code);
    
    const baseUrl = college?.officialWebsite?.url;
    if (!baseUrl) continue;

    const detectedUrls = contentInfo?.detectedUrls || [];

    // Data buffers
    const extractedData = { fields: [], missing: [], errors: [] };
    const normalizedData = {};
    const writtenFields = [];

    // Helper to fetch and parse
    const fetchAndParse = async (targetPath, type) => {
      let fullUrl;
      try {
        fullUrl = new URL(targetPath, baseUrl).href;
      } catch(e) {
        return { sourceFound: false, failureReason: "INVALID_URL" };
      }

      if (fullUrl.toLowerCase().includes('.pdf')) {
        return { sourceFound: true, parsedSuccessfully: false, failureReason: "PDF_ONLY" };
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(fullUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 403 || response.status === 429) {
            return { sourceFound: true, parsedSuccessfully: false, failureReason: "BOT_PROTECTION" };
          }
          return { sourceFound: true, parsedSuccessfully: false, failureReason: "HTTP_ERROR" };
        }

        const html = await response.text();
        if (html.length < 500) {
           return { sourceFound: true, parsedSuccessfully: false, failureReason: "SPA_RENDER_REQUIRED" };
        }

        const $ = cheerio.load(html);
        // Strip scripts to prevent regex hanging
        $('script, style, iframe').remove();
        const text = $('body').text();

        return { sourceFound: true, parsedSuccessfully: false, text, failureReason: "NO_STRUCTURED_DATA_FOUND" };

      } catch (err) {
        if (err.name === 'AbortError') {
          return { sourceFound: true, parsedSuccessfully: false, failureReason: "BOT_PROTECTION" }; // Timeouts often mean stealth drops
        }
        return { sourceFound: false, failureReason: "NETWORK_ERROR" };
      }
    };

    // 1. Extract Tuition Fee
    const feeUrl = detectedUrls.find(u => u.includes('fee') || u.includes('tuition') || u.includes('admission')) || baseUrl;
    const feeResult = await fetchAndParse(feeUrl, 'fee');
    
    if (feeResult.text) {
      const feeMatch = feeResult.text.match(/(?:Rs\.?|INR|₹|Fee[:\s]+)\s*(\d{1,3}(?:,\d{3})*)/i);
      if (feeMatch) {
        const rawVal = feeMatch[1].replace(/,/g, '');
        const numVal = parseInt(rawVal, 10);
        if (!isNaN(numVal) && numVal > 10000 && numVal < 5000000) {
          normalizedData.tuitionFee = numVal;
          extractedData.fields.push("tuitionFee");
          feeResult.parsedSuccessfully = true;
          feeResult.failureReason = null;
        } else {
          feeResult.failureReason = "OBFUSCATED_HTML";
        }
      }
    }
    extractedData.errors.push({ field: "tuitionFee", ...feeResult, text: undefined });

    // 2. Extract Highest Package
    const placementUrl = detectedUrls.find(u => u.includes('placement') || u.includes('career') || u.includes('recruit')) || baseUrl;
    const placeResult = await fetchAndParse(placementUrl, 'placement');
    
    if (placeResult.text) {
      const placeMatch = placeResult.text.match(/(\d+(?:\.\d+)?)\s*(?:LPA|lakhs|Lakhs)/i);
      if (placeMatch) {
        const rawVal = parseFloat(placeMatch[1]);
        if (!isNaN(rawVal) && rawVal >= 1 && rawVal <= 200) {
          normalizedData.highestPackage = rawVal * 100000;
          extractedData.fields.push("highestPackage");
          placeResult.parsedSuccessfully = true;
          placeResult.failureReason = null;
        } else {
          placeResult.failureReason = "OBFUSCATED_HTML";
        }
      }
    }
    extractedData.errors.push({ field: "highestPackage", ...placeResult, text: undefined });

    // 3. Extract NAAC Grade
    const naacUrl = detectedUrls.find(u => u.includes('naac') || u.includes('accreditation') || u.includes('iqac')) || baseUrl;
    const naacResult = await fetchAndParse(naacUrl, 'naac');

    if (naacResult.text) {
      const naacMatch = naacResult.text.match(/NAAC.*?(A\+\+|A\+|A|B\+\+|B\+|B)/i);
      if (naacMatch) {
        normalizedData.naacGrade = naacMatch[1].toUpperCase();
        extractedData.fields.push("naacGrade");
        naacResult.parsedSuccessfully = true;
        naacResult.failureReason = null;
      }
    }
    extractedData.errors.push({ field: "naacGrade", ...naacResult, text: undefined });

    // Identify missing
    const expectedFields = ["tuitionFee", "highestPackage", "naacGrade"];
    extractedData.missing = expectedFields.filter(f => !extractedData.fields.includes(f));

    extractionReport.push({
      collegeCode: code,
      extractionSuccess: extractedData.fields.length > 0,
      fieldsExtracted: extractedData.fields,
      fieldsMissing: extractedData.missing,
      failureDetails: extractedData.errors.filter(e => !e.parsedSuccessfully)
    });

    // NORMALIZATION & PERSISTENCE
    const schemaErrors = [];
    let dbSuccess = false;

    if (extractedData.fields.length > 0) {
      // Apply updates to CollegeMaster model
      try {
        if (normalizedData.tuitionFee) {
          if (!college.fees) college.fees = [];
          // Upsert B.Tech tuition fee
          const feeIdx = college.fees.findIndex(f => f.programName === "B.Tech" && f.feeType === "Tuition");
          if (feeIdx >= 0) {
             college.fees[feeIdx].amount = normalizedData.tuitionFee;
          } else {
             college.fees.push({ programName: "B.Tech", feeType: "Tuition", amount: normalizedData.tuitionFee });
          }
          writtenFields.push("tuitionFee");
        }

        if (normalizedData.highestPackage) {
          if (!college.placements) college.placements = [];
          if (college.placements.length === 0) college.placements.push({});
          college.placements[0].highestPackage = normalizedData.highestPackage;
          writtenFields.push("highestPackage");
        }

        if (normalizedData.naacGrade) {
          college.accreditations = college.accreditations || {};
          college.accreditations.naac = { grade: normalizedData.naacGrade };
          writtenFields.push("naacGrade");
        }

        // Validate Schema
        const valError = college.validateSync();
        if (valError) {
          schemaErrors.push(valError.message);
        } else {
          // Persist
          await college.save();
          dbSuccess = true;
          persistedCount++;
        }
      } catch (err) {
        schemaErrors.push(err.message);
      }
    }

    normalizationReport.push({
      collegeCode: code,
      normalizationSuccess: schemaErrors.length === 0 && extractedData.fields.length > 0,
      schemaErrors
    });

    persistenceReport.push({
      collegeCode: code,
      databaseWriteSuccess: dbSuccess,
      writtenFields
    });

    if (dbSuccess) {
      successCount++;
      if (normalizedData.highestPackage) sectionCoverage.placements++;
      if (normalizedData.tuitionFee) sectionCoverage.fees++;
      if (normalizedData.naacGrade) sectionCoverage.naac++;
      
      if (extractedData.fields.length === 3) {
         // Full coverage
      } else {
         partialCoverageCount++;
      }
    }

    processed++;
  }

  // Write outputs
  fs.writeFileSync(path.join(outputDir, 'phase-3.1-extraction-report.json'), JSON.stringify(extractionReport, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-3.1-normalization-report.json'), JSON.stringify(normalizationReport, null, 2));
  fs.writeFileSync(path.join(outputDir, 'phase-3.1-persistence-report.json'), JSON.stringify(persistenceReport, null, 2));

  // Determine fully recommendation-ready (needs fees + placements minimally)
  const fullyReadyCount = persistenceReport.filter(p => 
    p.databaseWriteSuccess && p.writtenFields.includes("tuitionFee") && p.writtenFields.includes("highestPackage")
  ).length;

  const yieldSummary = {
    collegesProcessed: highReadinessCodes.length,
    collegesExtractedSuccessfully: extractionReport.filter(e => e.extractionSuccess).length,
    collegesPersistedSuccessfully: persistedCount,
    placementCoveragePercent: Number(((sectionCoverage.placements / highReadinessCodes.length) * 100).toFixed(2)),
    feeCoveragePercent: Number(((sectionCoverage.fees / highReadinessCodes.length) * 100).toFixed(2)),
    naacCoveragePercent: Number(((sectionCoverage.naac / highReadinessCodes.length) * 100).toFixed(2)),
    academicsCoveragePercent: 0, // Heuristic too complex for pure regex
    rankingCoveragePercent: 0,
    recommendationReadyColleges: fullyReadyCount,
    partialCoverageColleges: partialCoverageCount,
    failedColleges: highReadinessCodes.length - successCount,
    topFailureCauses: getTopFailureCauses(extractionReport)
  };
  fs.writeFileSync(path.join(outputDir, 'phase-3.1-yield-summary.json'), JSON.stringify(yieldSummary, null, 2));

  await mongoose.disconnect();
  console.log("Phase 3.1 Extraction Validation completed.");
}

function getTopFailureCauses(extractionReport) {
  const causes = {};
  extractionReport.forEach(e => {
    e.failureDetails.forEach(f => {
      causes[f.failureReason] = (causes[f.failureReason] || 0) + 1;
    });
  });
  return Object.entries(causes).sort((a,b) => b[1] - a[1]).slice(0,3).map(e => `${e[0]} (${e[1]} times)`);
}

runPhase31();
