// server/scripts/verifyBenchmarkDashboard.js
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
  console.log("=== Phase 2.34 Benchmark Dashboard Verification ===");
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

  const mockTypes = [
    "SDASH_TOP_1", "SDASH_TOP_2", "SDASH_IMPROVING", "SDASH_DECLINING", "SDASH_BOTTOM_1", "SDASH_NEUTRAL"
  ];
  await ScraperBenchmark.deleteMany({ scraperName: { $in: mockTypes } });

  const mockBenchs = [
    { scraperName: "SDASH_TOP_1", successRate: 100, durationMs: 100, roiScore: 100, costUsd: 1, totalRuns: 100, trend7d: 10, trend30d: 5 },
    { scraperName: "SDASH_TOP_2", successRate: 100, durationMs: 100, roiScore: 100, costUsd: 1, totalRuns: 100, trend7d: 5, trend30d: 5 },
    { scraperName: "SDASH_IMPROVING", successRate: 50, durationMs: 500, roiScore: 50, costUsd: 50, totalRuns: 100, trend7d: 25, trend30d: 5 },
    { scraperName: "SDASH_DECLINING", successRate: 50, durationMs: 500, roiScore: 50, costUsd: 50, totalRuns: 100, trend7d: -15, trend30d: 5 },
    { scraperName: "SDASH_BOTTOM_1", successRate: 0, durationMs: 99999, roiScore: 0, costUsd: 9999, totalRuns: 100, trend7d: 0, trend30d: 0 },
    { scraperName: "SDASH_NEUTRAL", successRate: 50, durationMs: 500, roiScore: 50, costUsd: 50, totalRuns: 100, trend7d: 0, trend30d: 0 }
  ];

  await ScraperBenchmark.insertMany(mockBenchs);
  await new Promise(r => setTimeout(r, 1000));

  const res1 = await httpRequest("GET", "/api/benchmark-dashboard");
  const res2 = await httpRequest("GET", "/api/benchmark-dashboard");

  assert("API: status 200", res1.status === 200, `status=${res1.status}`);

  if (res1.status === 200 && res2.status === 200) {
    assert("DET: deterministic output", JSON.stringify(res1.data.data) === JSON.stringify(res2.data.data));

    const data = res1.data.data;
    
    // Top / Bottom
    assert("DASH: top10 contains SDASH_TOP_1", data.top10.some(d => d.scraperName === "SDASH_TOP_1"));
    assert("DASH: bottom10 contains SDASH_BOTTOM_1", data.bottom10.some(d => d.scraperName === "SDASH_BOTTOM_1"));

    // Improving / Declining
    assert("DASH: improving contains SDASH_IMPROVING", data.improving.some(d => d.scraperName === "SDASH_IMPROVING"));
    assert("DASH: declining contains SDASH_DECLINING", data.declining.some(d => d.scraperName === "SDASH_DECLINING"));
    
    // Improving should be sorted dynamically by trend7d highest to lowest
    // TOP_1 (+10) and IMPROVING (+25) and TOP_2 (+5) are improving.
    // Order should be IMPROVING, TOP_1, TOP_2
    const impNames = data.improving.filter(d => d.scraperName.startsWith("SDASH")).map(d => d.scraperName);
    assert("DASH: improving sorted dynamically", impNames[0] === "SDASH_IMPROVING" && impNames[1] === "SDASH_TOP_1");

    // Trends Summary
    assert("DASH: trendSummary calculated correctly", data.trendSummary.improvingCount >= 3);
    assert("DASH: trendSummary declining calculated", data.trendSummary.decliningCount >= 1);
    
    // Distribution
    assert("DASH: distribution buckets mapped", data.distribution.excellent >= 2);
  }

  // Cleanup
  await ScraperBenchmark.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "benchmark-dashboard-report.json"),
    JSON.stringify({ mockBenchs }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "benchmark-dashboard-verification.json"),
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
