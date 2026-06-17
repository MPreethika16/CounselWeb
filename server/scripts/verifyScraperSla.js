// server/scripts/verifyScraperSla.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperSla from "../models/ScraperSla.js";

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
  console.log("=== Phase 2.27 Scraper SLA Intelligence Verification ===");
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
  
  const activeBreachStartedAt = new Date(now - 100 * MS); // 100 seconds ago

  const mockTypes = ["SSLA_1", "SSLA_2", "SSLA_EMPTY"];
  await ScraperSla.deleteMany({ scraperName: { $in: mockTypes } });

  const mockSlas = [
    // ── SSLA_1 ───────────────────────────────────────────────────────────
    // Breaching currently. Started 100s ago. 50s historical. Total should be ~150s.
    { 
      scraperName: "SSLA_1", 
      targetSuccessPercent: 95, targetUptimePercent: 99, targetLatencyMs: 3000,
      breachStatus: true, breachStartedAt: activeBreachStartedAt, historicalBreachDurationMs: 50 * MS,
      recordedSuccessPercent: 80, recordedUptimePercent: 90, recordedAvgLatencyMs: 6000
    },
    // ── SSLA_2 ───────────────────────────────────────────────────────────
    // Healthy. No current breach.
    { 
      scraperName: "SSLA_2", 
      targetSuccessPercent: 95, targetUptimePercent: 99, targetLatencyMs: 3000,
      breachStatus: false, breachStartedAt: null, historicalBreachDurationMs: 10 * MS,
      recordedSuccessPercent: 98, recordedUptimePercent: 100, recordedAvgLatencyMs: 2000
    }
  ];

  await ScraperSla.insertMany(mockSlas);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-sla?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-sla?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0] ? { ...first.data.data[0] } : null;
      const d2 = second.data?.data?.[0] ? { ...second.data.data[0] } : null;

      if (d1) delete d1.breachDurationMs;
      if (d2) delete d2.breachDurationMs;

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      const rawD1 = first.data?.data?.[0];

      if (type === "SSLA_1") {
        assert(`BREACH_${type}: isBreaching true`, rawD1?.isBreaching === true);
        assert(`TARGET_${type}: matched success 95`, rawD1?.targets?.successPercent === 95);
        assert(`RECORDED_${type}: matched success 80`, rawD1?.recorded?.successPercent === 80);
        
        // Age: We added a 1s delay above, so breach is ~ 101s + 50s historical = ~ 151s (151000ms)
        const duration = rawD1?.breachDurationMs;
        assert(`DURATION_${type}: calculated correctly (${duration}ms)`, duration >= 150000 && duration <= 160000);
      } else if (type === "SSLA_2") {
        assert(`BREACH_${type}: isBreaching false`, rawD1?.isBreaching === false);
        assert(`DURATION_${type}: historical only (10000ms)`, rawD1?.breachDurationMs === 10000);
      } else if (type === "SSLA_EMPTY") {
        assert(`EMPTY_${type}: not breaching`, rawD1?.isBreaching === false);
        assert(`EMPTY_${type}: duration 0`, rawD1?.breachDurationMs === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-sla");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    assert("AGGREGATE: globalSlaBreaches >= 1", stats?.globalSlaBreaches >= 1);
    
    // Average success percent: (80 + 98) / 2 = 89
    // Wait, the real DB might have others, so we just check it exists.
    assert("AGGREGATE: avgRecordedSuccessPercent tracked", stats?.avgRecordedSuccessPercent >= 0);
    
    // We expect the system health to be WARNING because we intentionally created a breach
    assert("AGGREGATE: systemHealthStatus is WARNING", stats?.systemHealthStatus === "WARNING");
  }

  // Cleanup
  await ScraperSla.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-sla-report.json"),
    JSON.stringify({ mockSlas }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-sla-verification.json"),
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
