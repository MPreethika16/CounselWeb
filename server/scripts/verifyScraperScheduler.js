// server/scripts/verifyScraperScheduler.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperSchedule from "../models/ScraperSchedule.js";

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
  console.log("=== Phase 2.25 Scraper Scheduler Intelligence Verification ===");
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
  const MS = 1000;
  
  // Weekly frequency
  const freqWeekly = 7 * 24 * 60 * 60 * MS;
  const freqDaily = 24 * 60 * 60 * MS;
  
  const futureDate = new Date(now + 100000 * MS);
  const slightPastDate = new Date(now - 1000 * MS); // Overdue but not missed
  const heavyPastDate = new Date(now - (freqDaily + 10000 * MS)); // Overdue AND Missed

  const mockTypes = ["SSCHED_1", "SSCHED_EMPTY"];
  await ScraperSchedule.deleteMany({ scraperName: { $in: mockTypes } });

  const mockRuns = [
    // ── SSCHED_1 ─────────────────────────────────────────────────────────
    // On-Time (not overdue, not missed)
    { scraperName: "SSCHED_1", executionFrequencyMs: freqWeekly, lastRunAt: new Date(now - 100 * MS), nextRunAt: futureDate, isActive: true },
    
    // Overdue but NOT missed
    { scraperName: "SSCHED_1", executionFrequencyMs: freqDaily, lastRunAt: new Date(now - freqDaily * 2), nextRunAt: slightPastDate, isActive: true },
    
    // Missed AND overdue
    { scraperName: "SSCHED_1", executionFrequencyMs: freqDaily, lastRunAt: new Date(now - freqDaily * 3), nextRunAt: heavyPastDate, isActive: true },
    
    // Inactive (should be ignored by calculations)
    { scraperName: "SSCHED_1", executionFrequencyMs: freqDaily, lastRunAt: new Date(now - freqDaily * 3), nextRunAt: heavyPastDate, isActive: false },
  ];

  await ScraperSchedule.insertMany(mockRuns);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-scheduler?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-scheduler?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SSCHED_1") {
        assert(`COUNTS_${type}: scheduledJobs 3 (active only)`, d1?.scheduledJobs === 3);
        assert(`COUNTS_${type}: overdueJobs 2`, d1?.overdueJobs === 2);
        assert(`COUNTS_${type}: missedRuns 1`, d1?.missedRuns === 1);

        const expectedAvg = Math.round((freqWeekly + freqDaily + freqDaily) / 3);
        assert(`METRICS_${type}: avgExecutionFrequencyMs`, d1?.avgExecutionFrequencyMs === expectedAvg, `got ${d1?.avgExecutionFrequencyMs} expected ${expectedAvg}`);
        
        assert(`SORT_${type}: nextRunTimes ascending`, new Date(d1?.nextRunTimes[0]).getTime() < new Date(d1?.nextRunTimes[1]).getTime());
        
        // Ensure formatting
        assert(`UTC_${type}: valid ISO date`, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(d1?.nextRunTimes[0]));
      } else if (type === "SSCHED_EMPTY") {
        assert(`EMPTY_${type}: scheduledJobs 0`, d1?.scheduledJobs === 0);
        assert(`EMPTY_${type}: missedRuns 0`, d1?.missedRuns === 0);
        assert(`EMPTY_${type}: avgFreq 0`, d1?.avgExecutionFrequencyMs === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-scheduler");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    assert("AGGREGATE: globalScheduledJobs >= 3", stats?.globalScheduledJobs >= 3);
    assert("AGGREGATE: systemHealthStatus exists", !!stats?.systemHealthStatus);
    
    // We expect the system health to be WARNING because we intentionally created a missed run
    assert("AGGREGATE: systemHealthStatus is WARNING", stats?.systemHealthStatus === "WARNING");
  }

  // Cleanup
  await ScraperSchedule.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-scheduler-report.json"),
    JSON.stringify({ mockRuns }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-scheduler-verification.json"),
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
