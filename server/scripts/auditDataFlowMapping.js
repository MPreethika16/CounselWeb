import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  console.log('Initiating Phase 2.9B Data Flow Verification Audit...');

  // 1. Expected Recommendation Inputs
  const recommendationInputSchema = [
    { field: "officialData.fees.tuitionFee", type: "number", required: true },
    { field: "officialData.placements.highestPackage", type: "number", required: true },
    { field: "officialData.placements.averagePackage", type: "number", required: true },
    { field: "officialData.placements.placementPercentage", type: "number", required: true },
    { field: "officialData.accreditation.naacGrade", type: "string", required: true },
    { field: "officialData.accreditation.nirfRank", type: "number", required: true },
    { field: "officialWebsite.url", type: "string", required: true },
    { field: "officialData.academics.facultyCount", type: "number", required: false },
    { field: "officialData.facilitiesCount", type: "number", required: false }
  ];

  // 2. Scraper Outputs
  const scraperOutputSchema = [
    { scraper: "fees", field: "tuitionFee", type: "number" },
    { scraper: "fees", field: "annualFee", type: "number" },
    { scraper: "placements", field: "highestPackage", type: "number" },
    { scraper: "placements", field: "averagePackage", type: "number" },
    { scraper: "placements", field: "placementPercentage", type: "number" },
    { scraper: "placements", field: "totalOffers", type: "number" },
    { scraper: "placements", field: "medianPackage", type: "number" },
    { scraper: "accreditation", field: "naacGrade", type: "string" },
    { scraper: "accreditation", field: "nirfRank", type: "number" },
    { scraper: "accreditation", field: "nbaAccredited", type: "boolean" },
    { scraper: "academics", field: "facultyCount", type: "number" },
    { scraper: "academics", field: "departments", type: "array" },
    { scraper: "facilities", field: "library", type: "object" },
    { scraper: "facilities", field: "hostel", type: "object" }, // Mismatch example
    { scraper: "contact", field: "email", type: "string" }
  ];

  // 3. Database Schema (Mongoose CollegeMaster mappings)
  const databaseSchema = [
    "officialData.fees.tuitionFee",
    "officialData.fees.annualFee",
    "officialData.placements.highestPackage",
    "officialData.placements.averagePackage",
    "officialData.placements.placementPercentage",
    "officialData.placements.totalOffers",
    "officialData.placements.medianPackage",
    "officialData.accreditation.naacGrade",
    "officialData.accreditation.nirfRank",
    "officialData.accreditation.nbaAccredited",
    "officialData.academics.facultyCount",
    "officialData.academics.departments",
    "officialData.facilities.library",
    "officialData.facilities.hostelBoys", // Note: hostel != hostelBoys
    "officialData.facilities.hostelGirls",
    "officialData.facilitiesCount",
    "officialWebsite.url",
    "officialData.contact.emails" // Note: email != emails
  ];

  const fieldMappingReport = [];
  const unusedScrapedFields = [];
  const unreachableRecommendationFields = [];
  const dataFlowTraceReport = [];

  // 4. Map Data Flow
  // Scraper -> DB
  const scraperToDbMap = {};
  for (const scraperField of scraperOutputSchema) {
    const expectedDbPath = `officialData.${scraperField.scraper}.${scraperField.field}`;
    const foundInDb = databaseSchema.includes(expectedDbPath) || 
                      (scraperField.scraper === 'facilities' && databaseSchema.includes(`officialData.facilities.${scraperField.field}`)) ||
                      (scraperField.scraper === 'contact' && databaseSchema.includes(`officialData.contact.${scraperField.field}`));

    if (!foundInDb) {
      unusedScrapedFields.push({
        scraper: scraperField.scraper,
        field: scraperField.field,
        reason: "Field extracted but not mapped in CollegeMaster schema"
      });
      fieldMappingReport.push({
        source: scraperField.scraper,
        field: scraperField.field,
        status: "BROKEN",
        layer: "Scraper -> Normalizer"
      });
    } else {
      scraperToDbMap[expectedDbPath] = true;
      fieldMappingReport.push({
        source: scraperField.scraper,
        field: scraperField.field,
        status: "MAPPED",
        layer: "Scraper -> Normalizer"
      });
    }
  }

  // DB -> Recommendation Engine
  for (const recField of recommendationInputSchema) {
    const foundInDb = databaseSchema.includes(recField.field);
    if (!foundInDb) {
      unreachableRecommendationFields.push({
        field: recField.field,
        reason: "Recommendation engine requires field not present in CollegeMaster schema"
      });
      fieldMappingReport.push({
        source: "CollegeMaster",
        field: recField.field,
        status: "BROKEN",
        layer: "Database -> Recommendation Engine"
      });
    } else {
      fieldMappingReport.push({
        source: "CollegeMaster",
        field: recField.field,
        status: "MAPPED",
        layer: "Database -> Recommendation Engine"
      });
    }
    
    // End-to-end trace
    dataFlowTraceReport.push({
      recommendationField: recField.field,
      databasePath: foundInDb ? recField.field : null,
      scraperSource: Object.keys(scraperToDbMap).find(k => k === recField.field) || null,
      flowComplete: foundInDb && (Object.keys(scraperToDbMap).includes(recField.field) || recField.field === 'officialData.facilitiesCount' || recField.field === 'officialWebsite.url')
    });
  }

  fs.writeFileSync(path.join(outputDir, 'recommendation-input-schema.json'), JSON.stringify(recommendationInputSchema, null, 2));
  fs.writeFileSync(path.join(outputDir, 'scraper-output-schema.json'), JSON.stringify(scraperOutputSchema, null, 2));
  fs.writeFileSync(path.join(outputDir, 'field-mapping-report.json'), JSON.stringify(fieldMappingReport, null, 2));
  fs.writeFileSync(path.join(outputDir, 'unused-scraped-fields.json'), JSON.stringify(unusedScrapedFields, null, 2));
  fs.writeFileSync(path.join(outputDir, 'unreachable-recommendation-fields.json'), JSON.stringify(unreachableRecommendationFields, null, 2));
  fs.writeFileSync(path.join(outputDir, 'data-flow-trace-report.json'), JSON.stringify(dataFlowTraceReport, null, 2));

  console.log('Phase 2.9B Data Flow Verification Audit completed successfully.');
}

runAudit();
