import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { runDatabaseIntegrityAudit } from "./auditDatabaseIntegrity.js";
import { runDataQualityAudit } from "./auditDataQuality.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateAuditReports() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/counselweb");
  console.log("Connected. Starting Phase 1 Audits...");

  try {
    console.log("Running Database Integrity Audit...");
    const integrityResult = await runDatabaseIntegrityAudit();

    console.log("Running Deep Data Quality Audit...");
    const qualityResult = await runDataQualityAudit();

    console.log("Generating JSON Reports...");
    
    // 1. database-integrity-report.json
    await fs.writeFile(
      path.join(__dirname, "database-integrity-report.json"),
      JSON.stringify(integrityResult, null, 2)
    );

    // 2. data-quality-report.json
    const { coveragePercentages, risks, ...pureQuality } = qualityResult;
    await fs.writeFile(
      path.join(__dirname, "data-quality-report.json"),
      JSON.stringify(pureQuality, null, 2)
    );

    // 3. coverage-report.json
    await fs.writeFile(
      path.join(__dirname, "coverage-report.json"),
      JSON.stringify({ coveragePercentages }, null, 2)
    );

    // 4. audit-summary-report.json
    await fs.writeFile(
      path.join(__dirname, "audit-summary-report.json"),
      JSON.stringify({
        totalCollegesScanned: integrityResult.totalColleges,
        integrityStatus: integrityResult.duplicateCollegeCodes === 0 && integrityResult.emptyRecords === 0 ? "PASS" : "FAIL",
        qualityStatus: pureQuality.anomalies.placements === 0 ? "PASS" : "FAIL",
        riskClassificationSummary: risks,
        timestamp: new Date().toISOString()
      }, null, 2)
    );

    console.log("Audits Complete. Generated 4 JSON reports in server/scripts/");

  } catch (err) {
    console.error("Failed to generate audit reports:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

generateAuditReports();
