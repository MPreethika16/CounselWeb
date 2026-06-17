// server/scripts/verifyBenchmarkHardening.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperBenchmark from "../models/ScraperBenchmark.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function httpRequest(method, urlPath) {
  return new Promise((resolve) => {
    const parsed = new URL(BASE_URL + urlPath);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { "Content-Type": "application/json" },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }));
    });
    req.on("error", (err) => resolve({ status: 500, error: err.message }));
    req.end();
  });
}

async function verify() {
  console.log("=== Phase 2.33 Benchmark Hardening Verification ===");
  const report = { tests: [], summary: { passed: 0, failed: 0 } };

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      report.tests.push({ name, status: "pass", details });
      report.summary.passed++;
    } else {
      console.error(`  [FAIL] ${name} - ${details}`);
      report.tests.push({ name, status: "fail", details });
      report.summary.failed++;
    }
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const mockTypes = ["SHARDEN_TOP_1", "SHARDEN_TOP_2", "SHARDEN_LOW_RUNS", "SHARDEN_OUTLIER"];
  await ScraperBenchmark.deleteMany({ scraperName: { $in: mockTypes } });

  const mockBenchs = [
    // ── SHARDEN_TOP_1 & 2 (Identical scores, checking tie breaking) ─────────
    { scraperName: "SHARDEN_TOP_2", successRate: 100, durationMs: 100, roiScore: 100, costUsd: 1, totalRuns: 100, trend7d: 10, trend30d: 5 },
    { scraperName: "SHARDEN_TOP_1", successRate: 100, durationMs: 100, roiScore: 100, costUsd: 1, totalRuns: 100, trend7d: 10, trend30d: 5 },
    // ── SHARDEN_LOW_RUNS (Triggers INSUFFICIENT_DATA even with good stats) ─
    { scraperName: "SHARDEN_LOW_RUNS", successRate: 100, durationMs: 100, roiScore: 100, costUsd: 1, totalRuns: 19, trend7d: 0, trend30d: 0 },
    // ── SHARDEN_OUTLIER (Massive outlier that would skew average but shouldn't skew median) ─
    { scraperName: "SHARDEN_OUTLIER", successRate: 0, durationMs: 99999999, roiScore: 0, costUsd: 99999, totalRuns: 50, trend7d: -5, trend30d: -10 }
  ];

  await ScraperBenchmark.insertMany(mockBenchs);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const res = await httpRequest("GET", `/api/scraper-benchmarks?scraperName=${type}`);
    assert(`API_${type}: status 200`, res.status === 200, `status=${res.status}`);

    if (res.status === 200) {
      const d1 = res.data?.data?.[0];

      if (type === "SHARDEN_TOP_1") {
        assert(`TREND_${type}: trend7d tracked`, d1?.trends?.trend7d === 10);
        assert(`TREND_${type}: trend30d tracked`, d1?.trends?.trend30d === 5);
        assert(`TOTALRUNS_${type}: tracked 100`, d1?.metrics?.totalRuns === 100);
      } else if (type === "SHARDEN_LOW_RUNS") {
        assert(`STATUS_${type}: INSUFFICIENT_DATA`, d1?.overallStatus === "INSUFFICIENT_DATA");
      }
    }
  }

  // Aggregate checks for tie breaking and median
  const aggRes = await httpRequest("GET", "/api/scraper-benchmarks");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    const allData = agg.data;

    // Filter just our inserted data
    const inserted = allData.filter(d => d.scraperName.startsWith("SHARDEN_"));
    
    // Both TOP_1 and TOP_2 have percentile 100.
    // They should be sorted SHARDEN_TOP_1 then SHARDEN_TOP_2 due to localeCompare
    const idx1 = inserted.findIndex(d => d.scraperName === "SHARDEN_TOP_1");
    const idx2 = inserted.findIndex(d => d.scraperName === "SHARDEN_TOP_2");
    
    assert("AGGREGATE: stable tie breaking sorted TOP_1 before TOP_2", idx1 < idx2 && idx1 !== -1 && idx2 !== -1);

    // Ensure medians didn't get skewed by the 99999999 duration
    const stats = agg.aggregateStats;
    assert("AGGREGATE: median ignores massive outlier duration", stats?.globals?.medianDurationMs < 5000000);
  }

  // Cleanup
  await ScraperBenchmark.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "benchmark-hardening-report.json"),
    JSON.stringify({ mockBenchs }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "benchmark-hardening-verification.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Reports saved to ${reportDir}`);

  if (report.summary.failed > 0) process.exit(1);
  process.exit(0);
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
