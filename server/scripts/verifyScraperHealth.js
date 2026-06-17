// server/scripts/verifyScraperHealth.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import RawCollegePage from "../models/RawCollegePage.js";
import { calculateScraperHealth } from "../services/scraperHealthService.js";

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
  console.log("=== Phase 2.18 Scraper Health Analytics Verification ===");
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

  const recentDate = new Date(Date.now() - 10000);
  const oldDate = new Date(Date.now() - 100000);

  const mockRuns = [
    // ── HEALTHY: 10 successes, 0 failures ─────────────────────────────────
    ...Array(10).fill().map((_, i) => ({
      collegeCode: `SH_HEALTHY_COL_${i}`,
      canonicalDomain: "example.com",
      url: `http://example.com/healthy/${i}`,
      pageType: "SH_HEALTHY",
      crawlStatus: "success",
      crawledAt: recentDate,
      durationMs: 150
    })),
    // ── WARNING: 7 successes, 3 failures ──────────────────────────────────
    ...Array(7).fill().map((_, i) => ({
      collegeCode: `SH_WARNING_COL_${i}`,
      canonicalDomain: "example.com",
      url: `http://example.com/warning/s/${i}`,
      pageType: "SH_WARNING",
      crawlStatus: "success",
      crawledAt: oldDate,
      durationMs: 200
    })),
    ...Array(3).fill().map((_, i) => ({
      collegeCode: `SH_WARNING_COL_F_${i}`,
      canonicalDomain: "example.com",
      url: `http://example.com/warning/f/${i}`,
      pageType: "SH_WARNING",
      crawlStatus: "failed",
      crawledAt: recentDate,
      durationMs: 50
    })),
    // ── CRITICAL: 2 successes, 8 failures ─────────────────────────────────
    ...Array(2).fill().map((_, i) => ({
      collegeCode: `SH_CRITICAL_COL_${i}`,
      canonicalDomain: "example.com",
      url: `http://example.com/critical/s/${i}`,
      pageType: "SH_CRITICAL",
      crawlStatus: "success",
      crawledAt: recentDate,
      durationMs: 300
    })),
    ...Array(8).fill().map((_, i) => ({
      collegeCode: `SH_CRITICAL_COL_F_${i}`,
      canonicalDomain: "example.com",
      url: `http://example.com/critical/f/${i}`,
      pageType: "SH_CRITICAL",
      crawlStatus: "failed",
      crawledAt: oldDate,
      durationMs: 100
    })),
    // ── NULL DATES edge case ──────────────────────────────────────────────
    {
      collegeCode: "SH_NULL_DATES",
      canonicalDomain: "example.com",
      url: "http://example.com/null",
      pageType: "SH_NULL_DATES",
      crawlStatus: "success",
      crawledAt: null, // missing date
      durationMs: 500
    }
  ];

  // Insert mock data
  await RawCollegePage.deleteMany({ pageType: { $in: ["SH_HEALTHY", "SH_WARNING", "SH_CRITICAL", "SH_NULL_DATES"] } });
  await RawCollegePage.insertMany(mockRuns);

  await new Promise((r) => setTimeout(r, 1000));

  // Run checks for each type
  const types = ["SH_HEALTHY", "SH_WARNING", "SH_CRITICAL", "SH_NULL_DATES"];
  
  for (const type of types) {
    const first = await httpRequest("GET", `/api/scraper-health?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-health?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic stats`,
        d1?.successRate === d2?.successRate && d1?.avgDuration === d2?.avgDuration,
        `rates match`);

      assert(`BOUNDS_${type}: rates 0-100`,
        d1?.successRate >= 0 && d1?.successRate <= 100 && d1?.failureRate >= 0 && d1?.failureRate <= 100);

      if (type === "SH_HEALTHY") {
        assert(`STATUS_${type}: HEALTHY`, d1?.healthStatus === "HEALTHY");
        assert(`SCORE_${type}: 100%`, d1?.successRate === 100);
      } else if (type === "SH_WARNING") {
        assert(`STATUS_${type}: WARNING`, d1?.healthStatus === "WARNING");
        assert(`SCORE_${type}: 70%`, d1?.successRate === 70);
      } else if (type === "SH_CRITICAL") {
        assert(`STATUS_${type}: CRITICAL`, d1?.healthStatus === "CRITICAL");
        assert(`SCORE_${type}: 20%`, d1?.successRate === 20);
      } else if (type === "SH_NULL_DATES") {
        assert(`NULL_DATES_${type}: lastSuccessAt is null`, d1?.lastSuccessAt === null);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-health");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: contains overall metrics",
      typeof agg.aggregateStats?.overallSuccessRate === "number");
    assert("AGGREGATE: contains status counts",
      typeof agg.aggregateStats?.statusCounts?.HEALTHY === "number");
  }

  // Cleanup
  await RawCollegePage.deleteMany({ pageType: { $in: ["SH_HEALTHY", "SH_WARNING", "SH_CRITICAL", "SH_NULL_DATES"] } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-health-report.json"),
    JSON.stringify({ mockRuns }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-health-verification.json"),
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
