// server/scripts/verifyScraperTrend.js
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
  console.log("=== Phase 2.20 Scraper Trend Analytics Verification ===");
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

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  const today = new Date(now);
  const twoDaysAgo = new Date(now - 2 * DAY_MS);
  const twentyDaysAgo = new Date(now - 20 * DAY_MS);
  const fortyDaysAgo = new Date(now - 40 * DAY_MS);
  
  const todayStr = today.toISOString().split("T")[0];
  const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

  const mockTypes = ["ST_TREND", "ST_EMPTY"];
  await RawCollegePage.deleteMany({ pageType: { $in: mockTypes } });

  const mockRuns = [
    // ── ST_TREND runs ────────────────────────────────────────────────────────
    // Today: 2 success, 1 fail
    { collegeCode: "ST_C1", canonicalDomain: "ex.com", url: "http://ex.com/1", pageType: "ST_TREND", crawlStatus: "success", crawledAt: today, durationMs: 100 },
    { collegeCode: "ST_C2", canonicalDomain: "ex.com", url: "http://ex.com/2", pageType: "ST_TREND", crawlStatus: "success", crawledAt: today, durationMs: 200 },
    { collegeCode: "ST_C3", canonicalDomain: "ex.com", url: "http://ex.com/3", pageType: "ST_TREND", crawlStatus: "failed", crawledAt: today, durationMs: 150 },
    
    // 2 Days Ago (still within 7d): 1 success
    { collegeCode: "ST_C4", canonicalDomain: "ex.com", url: "http://ex.com/4", pageType: "ST_TREND", crawlStatus: "success", crawledAt: twoDaysAgo, durationMs: 300 },
    
    // 20 Days Ago (within 30d, outside 7d): 1 failed
    { collegeCode: "ST_C5", canonicalDomain: "ex.com", url: "http://ex.com/5", pageType: "ST_TREND", crawlStatus: "failed", crawledAt: twentyDaysAgo, durationMs: 100 },
    
    // 40 Days Ago (outside 30d): 1 success
    { collegeCode: "ST_C6", canonicalDomain: "ex.com", url: "http://ex.com/6", pageType: "ST_TREND", crawlStatus: "success", crawledAt: fortyDaysAgo, durationMs: 100 }
  ];

  // For ST_TREND, the expectations are:
  // 7d Window: Includes Today (3 runs) + 2DaysAgo (1 run) = 4 total runs. 3 success, 1 fail. Success rate = 75%. Avg duration = (100+200+150+300)/4 = 187.5 ~ 188
  // 30d Window: 7d (4 runs) + 20DaysAgo (1 run) = 5 total runs. 3 success, 2 fail. Success rate = 60%. Avg duration = (100+200+150+300+100)/5 = 170
  // Daily trends will have 4 entries (today, 2daysago, 20daysago, 40daysago).
  
  await RawCollegePage.insertMany(mockRuns);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-trends?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-trends?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      // Determinism
      assert(`DET_${type}: deterministic output`,
        JSON.stringify(d1?.windows) === JSON.stringify(d2?.windows),
        `windows match`);

      if (type === "ST_TREND") {
        const w7d = d1.windows["7d"];
        const w30d = d1.windows["30d"];
        
        assert(`WINDOW_7D_${type}: totalRuns`, w7d.totalRuns === 4, `expected 4, got ${w7d.totalRuns}`);
        assert(`WINDOW_7D_${type}: successRate`, w7d.successRate === 75, `expected 75, got ${w7d.successRate}`);
        assert(`WINDOW_30D_${type}: totalRuns`, w30d.totalRuns === 5, `expected 5, got ${w30d.totalRuns}`);
        assert(`WINDOW_30D_${type}: successRate`, w30d.successRate === 60, `expected 60, got ${w30d.successRate}`);
        
        // Daily bounds
        const todayTrend = d1.dailyTrends.find(t => t.date === todayStr);
        assert(`DAILY_${type}: today runs`, todayTrend?.totalRuns === 3);
        assert(`DAILY_${type}: today successCount`, todayTrend?.successCount === 2);
        assert(`DAILY_${type}: today failureCount`, todayTrend?.failureCount === 1);
        assert(`DAILY_${type}: today successRate`, todayTrend?.successRate === 67, `got ${todayTrend?.successRate}`); // round(2/3 * 100) = 67
        
        // UTC Dates correctly formatted
        assert(`UTC_${type}: date formatted`, /^\d{4}-\d{2}-\d{2}$/.test(todayTrend?.date));
      } else if (type === "ST_EMPTY") {
        assert(`EMPTY_${type}: returns 0 for windows`, d1?.windows["7d"]?.totalRuns === 0);
        assert(`EMPTY_${type}: dailyTrends empty`, d1?.dailyTrends?.length === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-trends");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: contains overall 7d successRate",
      typeof agg.aggregateStats?.windows?.["7d"]?.overallSuccessRate === "number");
  }

  // Cleanup
  await RawCollegePage.deleteMany({ pageType: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-trend-report.json"),
    JSON.stringify({ mockRuns }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-trend-verification.json"),
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
