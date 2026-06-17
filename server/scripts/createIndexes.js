// server/scripts/createIndexes.js
/**
 * Phase 2.13 – Index Creation Script
 * Creates MongoDB indexes required for recommendation query performance.
 * Writes reports/index-report.json with status for each index.
 */
import mongoose from "mongoose";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not found in environment. Set it in server/.env");
  process.exit(1);
}

const INDEXES_TO_CREATE = [
  { key: { "officialData.ranking.overallScore": -1 }, name: "idx_ranking_overallScore", background: true },
  { key: { "officialData.trustScore.score": -1 }, name: "idx_trustScore_score", background: true },
  { key: { "collegeCode": 1 }, name: "idx_collegeCode", unique: true, background: true },
  { key: { "district": 1 }, name: "idx_district", background: true },
  { key: { "officialData.recommendationFactors.academicStrength": -1 }, name: "idx_academicStrength", background: true },
  { key: { "officialData.freshness.classification": 1 }, name: "idx_freshness_classification", background: true },
  { key: { "officialData.freshness.score": 1, "collegeCode": 1 }, name: "idx_freshness_score", background: true },
];

async function createIndexes() {
  const report = {
    generatedAt: new Date().toISOString(),
    mongoUri: MONGO_URI.replace(/:\/\/[^@]+@/, "://<credentials>@"),
    indexes: [],
    summary: { total: INDEXES_TO_CREATE.length, created: 0, existing: 0, failed: 0 },
  };

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const collection = mongoose.connection.db.collection("collegemasters");

  // List existing indexes
  let existingIndexes = await collection.listIndexes().toArray();
  let existingNames = new Set(existingIndexes.map((i) => i.name));
  console.log(`Found ${existingIndexes.length} existing indexes.`);

  if (existingNames.has("collegeCode_1")) {
    console.log("Dropping conflicting index collegeCode_1...");
    await collection.dropIndex("collegeCode_1");
    existingIndexes = await collection.listIndexes().toArray();
    existingNames = new Set(existingIndexes.map((i) => i.name));
  }

  for (const indexDef of INDEXES_TO_CREATE) {
    const { key, name, background, unique } = indexDef;
    const options = { name, background };
    if (unique) options.unique = true;

    const result = { name, key, status: "", message: "" };
    try {
      if (existingNames.has(name)) {
        result.status = "existing";
        result.message = "Index already exists";
        report.summary.existing++;
        console.log(`[EXISTING] ${name}`);
      } else {
        await collection.createIndex(key, options);
        result.status = "created";
        result.message = "Index created successfully";
        report.summary.created++;
        console.log(`[CREATED]  ${name}`);
      }
    } catch (err) {
      result.status = "failed";
      result.message = err.message;
      report.summary.failed++;
      console.error(`[FAILED]   ${name}: ${err.message}`);
    }
    report.indexes.push(result);
  }

  // Final listing for verification
  const finalIndexes = await collection.listIndexes().toArray();
  report.finalIndexCount = finalIndexes.length;
  report.finalIndexNames = finalIndexes.map((i) => i.name);

  const reportDir = path.resolve(__dirname, "../../reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "index-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n=== Index Report ===");
  console.log(`Total:    ${report.summary.total}`);
  console.log(`Created:  ${report.summary.created}`);
  console.log(`Existing: ${report.summary.existing}`);
  console.log(`Failed:   ${report.summary.failed}`);
  console.log(`Report:   ${reportPath}`);

  await mongoose.disconnect();

  if (report.summary.failed > 0) {
    console.error("\nSome indexes failed to create. Check report for details.");
    process.exit(1);
  }
  console.log("\nAll indexes ready.");
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
