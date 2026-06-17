// server/scripts/verifyScraperExecution.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import RawCollegePage from "../models/RawCollegePage.js";

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
  console.log("=== Phase 2.19 Scraper Execution Analytics Verification ===");
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

  const recentDate = new Date();
  
  const mockTypes = ["SE_MIXED", "SE_ALL_FAIL", "SE_ALL_SUCCESS", "SE_EMPTY"];
  await RawCollegePage.deleteMany({ pageType: { $in: mockTypes } });

  const mockRuns = [
    // ── SE_MIXED: 6 success, 4 failed (Total: 10) ────────────────────────
    ...Array(6).fill().map((_, i) => ({
      collegeCode: `SE_MIX_COL_S_${i}`, canonicalDomain: "ex.com", url: `http://ex.com/s${i}`,
      pageType: "SE_MIXED", crawlStatus: "success", crawledAt: recentDate, durationMs: 200
    })),
    ...Array(4).fill().map((_, i) => ({
      collegeCode: `SE_MIX_COL_F_${i}`, canonicalDomain: "ex.com", url: `http://ex.com/f${i}`,
      pageType: "SE_MIXED", crawlStatus: "failed", crawledAt: recentDate, durationMs: 100
    })),
    // ── SE_ALL_FAIL: 0 success, 5 failed ─────────────────────────────────
    ...Array(5).fill().map((_, i) => ({
      collegeCode: `SE_FAIL_COL_${i}`, canonicalDomain: "ex.com", url: `http://ex.com/af${i}`,
      pageType: "SE_ALL_FAIL", crawlStatus: "failed", crawledAt: recentDate, durationMs: 50
    })),
    // ── SE_ALL_SUCCESS: 5 success, 0 failed ──────────────────────────────
    ...Array(5).fill().map((_, i) => ({
      collegeCode: `SE_SUCC_COL_${i}`, canonicalDomain: "ex.com", url: `http://ex.com/as${i}`,
      pageType: "SE_ALL_SUCCESS", crawlStatus: "success", crawledAt: recentDate, durationMs: 300
    })),
  ];

  await RawCollegePage.insertMany(mockRuns);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-execution?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-execution?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic execution stats`,
        d1?.successRate === d2?.successRate && d1?.jobsRun === d2?.jobsRun,
        `rates match`);

      if (type === "SE_MIXED") {
        assert(`METRICS_${type}: jobsRun`, d1?.jobsRun === 10);
        assert(`METRICS_${type}: jobsSucceeded`, d1?.jobsSucceeded === 6);
        assert(`METRICS_${type}: jobsFailed`, d1?.jobsFailed === 4);
        assert(`METRICS_${type}: successRate`, d1?.successRate === 60);
      } else if (type === "SE_ALL_FAIL") {
        assert(`METRICS_${type}: successRate 0%`, d1?.successRate === 0);
        assert(`METRICS_${type}: jobsFailed 5`, d1?.jobsFailed === 5);
      } else if (type === "SE_ALL_SUCCESS") {
        assert(`METRICS_${type}: successRate 100%`, d1?.successRate === 100);
        assert(`METRICS_${type}: jobsSucceeded 5`, d1?.jobsSucceeded === 5);
      } else if (type === "SE_EMPTY") {
        // bounds/null handling for empty
        assert(`NULL_HANDLING_${type}: jobsRun 0`, d1?.jobsRun === 0);
        assert(`NULL_HANDLING_${type}: successRate 0`, d1?.successRate === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-execution");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: contains overall metrics",
      typeof agg.aggregateStats?.overallSuccessRate === "number");
    assert("AGGREGATE: totalJobsRun present",
      typeof agg.aggregateStats?.totalJobsRun === "number");
  }

  // Cleanup
  await RawCollegePage.deleteMany({ pageType: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-execution-report.json"),
    JSON.stringify({ mockRuns }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-execution-verification.json"),
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
