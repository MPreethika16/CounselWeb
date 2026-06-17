// server/scripts/verifyScraperAlert.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperAlert from "../models/ScraperAlert.js";

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
  console.log("=== Phase 2.26 Scraper Alert Intelligence Verification ===");
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
  
  // Ages: 10s, 30s, 60s
  const age10 = new Date(now - 10 * MS);
  const age30 = new Date(now - 30 * MS);
  const age60 = new Date(now - 60 * MS);

  const mockTypes = ["SALERT_1", "SALERT_EMPTY"];
  await ScraperAlert.deleteMany({ scraperName: { $in: mockTypes } });

  const mockAlerts = [
    // ── SALERT_1 ─────────────────────────────────────────────────────────
    // Active, CRITICAL, age: ~60s
    { scraperName: "SALERT_1", type: "TIMEOUT", severity: "CRITICAL", message: "Timeout hit", isResolved: false, createdAt: age60 },
    // Active, CRITICAL, age: ~30s
    { scraperName: "SALERT_1", type: "TIMEOUT", severity: "CRITICAL", message: "Timeout hit 2", isResolved: false, createdAt: age30 },
    // Active, WARNING, age: ~30s
    { scraperName: "SALERT_1", type: "DNS_ERROR", severity: "WARNING", message: "DNS failure", isResolved: false, createdAt: age30 },
    // Active, INFO, age: ~10s
    { scraperName: "SALERT_1", type: "QUEUE_BACKLOG", severity: "INFO", message: "Queue growing", isResolved: false, createdAt: age10 },
    
    // Resolved, FATAL, should not count towards active metrics
    { scraperName: "SALERT_1", type: "SYSTEM_DOWN", severity: "FATAL", message: "Crash", isResolved: true, resolvedAt: age10, createdAt: age60 }
  ];

  await ScraperAlert.insertMany(mockAlerts);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-alerts?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-alerts?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0] ? { ...first.data.data[0] } : null;
      const d2 = second.data?.data?.[0] ? { ...second.data.data[0] } : null;

      if (d1) delete d1.avgActiveAlertAgeMs;
      if (d2) delete d2.avgActiveAlertAgeMs;

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SALERT_1") {
        assert(`COUNTS_${type}: activeAlerts 4`, d1?.activeAlertsCount === 4);
        assert(`COUNTS_${type}: resolvedAlerts 1`, d1?.resolvedAlertsCount === 1);
        
        // Severities for active alerts only
        assert(`SEV_${type}: CRITICAL == 2`, d1?.severityCounts?.CRITICAL === 2);
        assert(`SEV_${type}: WARNING == 1`, d1?.severityCounts?.WARNING === 1);
        assert(`SEV_${type}: INFO == 1`, d1?.severityCounts?.INFO === 1);
        assert(`SEV_${type}: FATAL == 0 (since resolved is ignored)`, d1?.severityCounts?.FATAL === 0);

        // Alert Types Check
        const typeCounts = d1?.typeCounts;
        assert(`TYPE_${type}: sorted descending`, typeCounts[0].count >= typeCounts[1].count);
        assert(`TYPE_${type}: TIMEOUT tracked`, typeCounts.find(t => t.type === "TIMEOUT").count === 2);

        // Age: We added a 1s delay above, so ages are ~ 61, 31, 31, 11
        // Total age approx: 134s. Average over 4 = ~33.5s
        const rawD1 = first.data?.data?.[0];
        const avgAge = rawD1?.avgActiveAlertAgeMs;
        assert(`AGE_${type}: calculated correctly (${avgAge}ms)`, avgAge >= 30000 && avgAge <= 40000);
      } else if (type === "SALERT_EMPTY") {
        const rawD1 = first.data?.data?.[0];
        assert(`EMPTY_${type}: active 0`, rawD1?.activeAlertsCount === 0);
        assert(`EMPTY_${type}: avgAge 0`, rawD1?.avgActiveAlertAgeMs === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-alerts");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    assert("AGGREGATE: globalActiveAlertsCount >= 4", stats?.globalActiveAlertsCount >= 4);
    assert("AGGREGATE: globalResolvedAlertsCount >= 1", stats?.globalResolvedAlertsCount >= 1);
    assert("AGGREGATE: globalSeverityCounts tracked", stats?.globalSeverityCounts?.CRITICAL >= 2);
    
    // We expect the system health to be CRITICAL because we intentionally created CRITICAL active alerts
    assert("AGGREGATE: systemHealthStatus is CRITICAL", stats?.systemHealthStatus === "CRITICAL");
  }

  // Cleanup
  await ScraperAlert.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-alert-report.json"),
    JSON.stringify({ mockAlerts }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-alert-verification.json"),
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
