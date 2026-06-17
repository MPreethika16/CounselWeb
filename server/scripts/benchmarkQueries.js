// server/scripts/benchmarkQueries.js
/**
 * Phase 2.13 – Query Performance Benchmarking
 * Measures average, p95, p99 latency for matchStudentPreferences across
 * representative weight payloads. Writes reports/performance-report.json.
 */
import mongoose from "mongoose";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { matchStudentPreferences } from "../services/recommendationMatchingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not set in server/.env");
  process.exit(1);
}

const RUNS_PER_PAYLOAD = 20;

const TEST_PAYLOADS = [
  {
    label: "academics-heavy",
    payload: { academicsWeight: 50, placementsWeight: 30, infrastructureWeight: 20 },
  },
  {
    label: "balanced",
    payload: {
      academicsWeight: 20,
      placementsWeight: 20,
      infrastructureWeight: 20,
      trustWeight: 20,
      affordabilityWeight: 10,
      locationWeight: 10,
    },
  },
  {
    label: "trust-focused",
    payload: { trustWeight: 60, placementsWeight: 40 },
  },
];

function percentile(sortedArr, p) {
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

async function benchmark() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected. Starting benchmark...\n");

  const allSamples = [];
  const perPayloadResults = [];

  for (const { label, payload } of TEST_PAYLOADS) {
    const samples = [];
    process.stdout.write(`  [${label}] running ${RUNS_PER_PAYLOAD} runs... `);

    for (let i = 0; i < RUNS_PER_PAYLOAD; i++) {
      const start = process.hrtime.bigint();
      await matchStudentPreferences(payload);
      const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
      samples.push(ms);
      allSamples.push(ms);
    }

    samples.sort((a, b) => a - b);
    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;

    const result = {
      label,
      runs: RUNS_PER_PAYLOAD,
      avg: Math.round(avg * 100) / 100,
      min: Math.round(samples[0] * 100) / 100,
      max: Math.round(samples[samples.length - 1] * 100) / 100,
      p50: Math.round(percentile(samples, 50) * 100) / 100,
      p95: Math.round(percentile(samples, 95) * 100) / 100,
      p99: Math.round(percentile(samples, 99) * 100) / 100,
    };
    perPayloadResults.push(result);
    console.log(`done. avg=${result.avg}ms p95=${result.p95}ms p99=${result.p99}ms`);
  }

  // Aggregate across all payloads
  allSamples.sort((a, b) => a - b);
  const overallAvg = allSamples.reduce((s, v) => s + v, 0) / allSamples.length;

  const report = {
    generatedAt: new Date().toISOString(),
    totalSamples: allSamples.length,
    aggregate: {
      avg: Math.round(overallAvg * 100) / 100,
      min: Math.round(allSamples[0] * 100) / 100,
      max: Math.round(allSamples[allSamples.length - 1] * 100) / 100,
      p50: Math.round(percentile(allSamples, 50) * 100) / 100,
      p95: Math.round(percentile(allSamples, 95) * 100) / 100,
      p99: Math.round(percentile(allSamples, 99) * 100) / 100,
    },
    perPayload: perPayloadResults,
    thresholds: {
      p95TargetMs: 500,
      p95Passed: Math.round(percentile(allSamples, 95) * 100) / 100 < 500,
    },
  };

  const reportDir = path.resolve(__dirname, "../../reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "performance-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n=== Performance Report ===");
  console.log(`Aggregate avg: ${report.aggregate.avg} ms`);
  console.log(`Aggregate p95: ${report.aggregate.p95} ms  (target < 500ms: ${report.thresholds.p95Passed ? "PASS ✓" : "FAIL ✗"})`);
  console.log(`Aggregate p99: ${report.aggregate.p99} ms`);
  console.log(`Report written: ${reportPath}`);

  await mongoose.disconnect();
  process.exit(0);
}

benchmark().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
