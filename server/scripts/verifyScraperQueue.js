// server/scripts/verifyScraperQueue.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperJob from "../models/ScraperJob.js";

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
  console.log("=== Phase 2.24 Scraper Queue Intelligence Verification ===");
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
  
  const oldestQueueTime = new Date(now - 100 * MS); // 100s ago
  const t1 = new Date(now - 80 * MS);
  const t2 = new Date(now - 60 * MS);
  const t3 = new Date(now - 40 * MS);

  const mockTypes = ["SQ_Q1", "SQ_EMPTY"];
  await ScraperJob.deleteMany({ scraperName: { $in: mockTypes } });

  const mockRuns = [
    // ── SQ_Q1 ────────────────────────────────────────────────────────────
    // 2 queued
    { scraperName: "SQ_Q1", url: "http://ex/1", status: "queued", queuedAt: oldestQueueTime },
    { scraperName: "SQ_Q1", url: "http://ex/2", status: "queued", queuedAt: t1 },
    
    // 3 running (max capacity is 10, so utilization is 30%)
    // Wait times: (t2 - oldestQueueTime) = 40s, (t3 - t1) = 40s. Total wait time = 80s for 2 jobs. Avg = 40s.
    { scraperName: "SQ_Q1", url: "http://ex/3", status: "running", queuedAt: oldestQueueTime, startedAt: t2 },
    { scraperName: "SQ_Q1", url: "http://ex/4", status: "running", queuedAt: t1, startedAt: t3 },
    { scraperName: "SQ_Q1", url: "http://ex/5", status: "running", queuedAt: null, startedAt: null }, // no wait time
    
    // 1 completed (wait time: 20s) -> total wait time = 100s, samples = 3, avg = 33.3s
    { scraperName: "SQ_Q1", url: "http://ex/6", status: "completed", queuedAt: t2, startedAt: new Date(t2.getTime() + 20 * MS) },
    
    // 1 failed (wait time: 50s) -> total wait time = 150s, samples = 4, avg = 37.5s (37500ms)
    { scraperName: "SQ_Q1", url: "http://ex/7", status: "failed", queuedAt: oldestQueueTime, startedAt: new Date(oldestQueueTime.getTime() + 50 * MS) }
  ];

  await ScraperJob.insertMany(mockRuns);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-queue?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-queue?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SQ_Q1") {
        assert(`COUNTS_${type}: queued 2`, d1?.queued === 2);
        assert(`COUNTS_${type}: running 3`, d1?.running === 3);
        assert(`COUNTS_${type}: completed 1`, d1?.completed === 1);
        assert(`COUNTS_${type}: failed 1`, d1?.failed === 1);

        assert(`METRICS_${type}: avgWaitTimeMs 37500`, d1?.avgWaitTimeMs === 37500, `got ${d1?.avgWaitTimeMs}`);
        assert(`METRICS_${type}: queueUtilization 30%`, d1?.queueUtilizationPercentage === 30);
        assert(`METRICS_${type}: oldestQueuedAt matched`, d1?.oldestQueuedAt === oldestQueueTime.toISOString());
      } else if (type === "SQ_EMPTY") {
        assert(`EMPTY_${type}: queued 0`, d1?.queued === 0);
        assert(`EMPTY_${type}: utilization 0`, d1?.queueUtilizationPercentage === 0);
        assert(`EMPTY_${type}: oldestQueuedAt null`, d1?.oldestQueuedAt === null);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-queue");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    assert("AGGREGATE: overallCounts exists", !!agg.aggregateStats?.overallCounts);
    
    // We expect SQ_Q1 runs to be part of the global counts
    const globalRunning = agg.aggregateStats?.overallCounts?.running;
    assert("AGGREGATE: global running >= 3", globalRunning >= 3);
    
    // Global utilization should be >= 30% since SQ_Q1 is 3 running and max cap is 10.
    const globalUtil = agg.aggregateStats?.overallQueueUtilizationPercentage;
    assert("AGGREGATE: global queue utilization >= 30", globalUtil >= 30);
  }

  // Cleanup
  await ScraperJob.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-queue-report.json"),
    JSON.stringify({ mockRuns }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-queue-verification.json"),
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
