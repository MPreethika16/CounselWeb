// server/scripts/verifyScraperBenchmark.js
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
  console.log("=== Phase 2.32 Scraper Benchmark Intelligence Verification ===");
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

  const mockTypes = ["SBENCH_TOP", "SBENCH_BOTTOM", "SBENCH_EMPTY"];
  await ScraperBenchmark.deleteMany({ scraperName: { $in: mockTypes } });

  const mockBenchs = [
    // ── SBENCH_TOP ───────────────────────────────────────────────────────────
    // Perfect stats. Above average on everything.
    { 
      scraperName: "SBENCH_TOP", 
      successRate: 100, durationMs: 1000, roiScore: 100, costUsd: 1 
    },
    // ── SBENCH_BOTTOM ───────────────────────────────────────────────────────────
    // Terrible stats. Below average on everything.
    { 
      scraperName: "SBENCH_BOTTOM", 
      successRate: 10, durationMs: 100000, roiScore: 10, costUsd: 1000 
    }
  ];
  
  // The average will be:
  // success: 55
  // duration: 50500
  // roi: 55
  // cost: 500.5

  await ScraperBenchmark.insertMany(mockBenchs);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-benchmarks?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-benchmarks?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SBENCH_TOP") {
        assert(`SCORE_${type}: percentile 100`, d1?.percentileRanking === 100);
        assert(`STATUS_${type}: ABOVE_AVERAGE`, d1?.overallStatus === "ABOVE_AVERAGE");
        assert(`COMP_${type}: costBetterThanAvg true`, d1?.comparisons?.costBetterThanAvg === true);
      } else if (type === "SBENCH_BOTTOM") {
        assert(`SCORE_${type}: percentile 0`, d1?.percentileRanking === 0);
        assert(`STATUS_${type}: BELOW_AVERAGE`, d1?.overallStatus === "BELOW_AVERAGE");
        assert(`COMP_${type}: costBetterThanAvg false`, d1?.comparisons?.costBetterThanAvg === false);
      } else if (type === "SBENCH_EMPTY") {
        // Will be evaluated against the globals. Since it has 0 for everything,
        // its success rate is below avg (0 < 55).
        // its duration is better than avg (0 < 50500).
        // its roi is below avg (0 < 55).
        // its cost is better than avg (0 < 500).
        // 2 positive points = 50% percentile = AVERAGE
        assert(`SCORE_${type}: percentile 0 default fallback`, d1?.percentileRanking === 0);
        assert(`STATUS_${type}: AVERAGE`, d1?.overallStatus === "AVERAGE");
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-benchmarks");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    assert("AGGREGATE: global logic calculated avg success", stats?.globals?.avgSuccessRate > 0);
    assert("AGGREGATE: global logic calculated avg cost", stats?.globals?.avgCostUsd > 0);
  }

  // Cleanup
  await ScraperBenchmark.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-benchmark-report.json"),
    JSON.stringify({ mockBenchs }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-benchmark-verification.json"),
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
