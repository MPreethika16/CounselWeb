import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database for verification...");
    await connectDB();

    const targetCodes = ["CBIT", "VJEC", "CVRH", "GRRR"];
    const colleges = await CollegeMaster.find({ collegeCode: { $in: targetCodes } });
    console.log(`Found ${colleges.length} colleges to verify.`);

    const reportPath = path.resolve(__dirname, "../../reports/placement-production-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report not found at: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    console.log("Loaded placement-production-report.json");

    const assertions = {
      realPdfsParsed: false,
      noMocksUsed: true,
      sourceTypeStored: true,
      placementYearEvidenceStored: true,
      perMetricLineageStored: true,
      confidenceRecalibrated: true
    };
    const errors = [];

    // 1. Verify Real PDFs parsed
    let pdfParsedCount = 0;
    for (const colDetail of report.details) {
      if (colDetail.pagesUsed) {
        for (const p of colDetail.pagesUsed) {
          if (p.url && p.url.endsWith(".pdf")) {
            pdfParsedCount++;
            console.log(`✓ Real PDF parsed for ${colDetail.collegeCode}: ${p.url}`);
          }
        }
      }
    }
    if (pdfParsedCount > 0) {
      assertions.realPdfsParsed = true;
    } else {
      errors.push("No real PDFs were parsed in the extraction details");
    }

    // 2. Verify No Mocks Used
    for (const col of colleges) {
      const plc = col.officialData?.placements;
      if (plc) {
        if (plc.highestPackage === 52) {
          errors.push(`[${col.collegeCode}] Placement statistics highest package matches mock value (52 LPA)`);
          assertions.noMocksUsed = false;
        }
        if (plc.placementPercentage === 98) {
          errors.push(`[${col.collegeCode}] Placement percentage matches mock value (98%)`);
          assertions.noMocksUsed = false;
        }
      }
    }

    // 3. Verify sourceType, placementYearEvidence, per-metric lineage, and confidence
    for (const col of colleges) {
      const plc = col.officialData?.placements;
      if (!plc) continue;

      console.log(`Verifying placements schema fields for ${col.collegeCode}:`);
      console.log(`  Highest: ${plc.highestPackage}, Average: ${plc.averagePackage}`);
      console.log(`  SourceType: ${plc.sourceType}, Confidence: ${plc.confidence}`);

      // Check sourceType is stored and valid
      if (plc.sourceType) {
        const allowedSourceTypes = ["official_pdf", "official_placement_page", "annual_report", "general_page"];
        if (!allowedSourceTypes.includes(plc.sourceType)) {
          errors.push(`[${col.collegeCode}] Invalid sourceType: "${plc.sourceType}"`);
          assertions.sourceTypeStored = false;
        }
      }

      // Check placementYearEvidence stored if year is set
      if (plc.placementYear !== null) {
        if (!plc.placementYearEvidence) {
          errors.push(`[${col.collegeCode}] placementYear is set (${plc.placementYear}) but placementYearEvidence is empty`);
          assertions.placementYearEvidenceStored = false;
        } else {
          console.log(`  ✓ Year: ${plc.placementYear}, Evidence: "${plc.placementYearEvidence}"`);
        }
      }

      // Check per-metric data lineage
      const metrics = [
        "highestPackage",
        "averagePackage",
        "medianPackage",
        "placementPercentage",
        "totalOffers",
        "totalPlacedStudents",
        "placementYear"
      ];

      if (!plc.lineage) {
        errors.push(`[${col.collegeCode}] Placements lineage object is missing`);
        assertions.perMetricLineageStored = false;
      } else {
        for (const m of metrics) {
          if (plc[m] !== null) {
            const lin = plc.lineage[m];
            if (!lin) {
              errors.push(`[${col.collegeCode}] Lineage for metric "${m}" is missing`);
              assertions.perMetricLineageStored = false;
            } else if (!lin.sourceUrl || !lin.sourceType || !lin.evidenceText) {
              errors.push(`[${col.collegeCode}] Lineage for metric "${m}" has missing fields: ` + JSON.stringify(lin));
              assertions.perMetricLineageStored = false;
            } else {
              console.log(`  ✓ Metric "${m}" lineage: sourceUrl="${lin.sourceUrl}", sourceType="${lin.sourceType}"`);
            }
          }
        }
      }

      // Check confidence recalibration
      const hasHighQuality = plc.highestPackage !== null || plc.averagePackage !== null || plc.placementPercentage !== null;
      const hasRec = Array.isArray(plc.recruiters) && plc.recruiters.length > 0;
      
      let expectedConf = 0;
      if ((plc.sourceType === "official_pdf" || plc.sourceType === "official_placement_page") && hasHighQuality) {
        expectedConf = 95;
      } else if (plc.sourceType === "official_placement_page" && (hasRec || plc.totalOffers !== null || plc.totalPlacedStudents !== null)) {
        expectedConf = 80;
      } else if (hasHighQuality || hasRec || plc.totalOffers !== null || plc.totalPlacedStudents !== null) {
        expectedConf = 60;
      }

      if (plc.confidence !== expectedConf) {
        errors.push(`[${col.collegeCode}] Confidence mismatch: expected ${expectedConf}, got ${plc.confidence}`);
        assertions.confidenceRecalibrated = false;
      }
    }

    const allPassed = Object.values(assertions).every(Boolean) && errors.length === 0;
    const status = allPassed ? "PASSED" : "FAILED";

    const verificationResult = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: targetCodes.length,
        pdfParsedCount
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const verificationPath = path.join(reportsDir, "placement-production-verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log(`VERIFICATION COMPLETE: ${status}`);
    console.log("------------------------------------------------");
    if (errors.length > 0) {
      console.error("Errors found:");
      errors.forEach(e => console.error(` - ${e}`));
    } else {
      console.log("All assertions passed successfully!");
    }
    console.log(`Results written to: ${verificationPath}`);
    console.log("------------------------------------------------\n");

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error("Error during verification run:", err);
    process.exit(1);
  }
};

run();
