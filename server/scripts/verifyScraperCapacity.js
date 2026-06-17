// server/scripts/verifyScraperCapacity.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperCapacity from "../models/ScraperCapacity.js";

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
  console.log("=== Phase 2.28 Scraper Capacity Intelligence Verification ===");
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

  const mockTypes = ["SCAP_1", "SCAP_2", "SCAP_EMPTY"];
  await ScraperCapacity.deleteMany({ scraperName: { $in: mockTypes } });

  const mockCaps = [
    // ── SCAP_1 ───────────────────────────────────────────────────────────
    // Overloaded: Active exactly at Max. Queue is huge. Historical peak is 80%.
    { 
      scraperName: "SCAP_1", 
      maxCapacity: 10, activeJobs: 10, queuedJobs: 50, peakUtilizationPercent: 80
    },
    // ── SCAP_2 ───────────────────────────────────────────────────────────
    // Idle: 2 active, 10 max. Historical peak is 100%.
    { 
      scraperName: "SCAP_2", 
      maxCapacity: 10, activeJobs: 2, queuedJobs: 0, peakUtilizationPercent: 100
    }
  ];

  await ScraperCapacity.insertMany(mockCaps);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-capacity?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-capacity?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SCAP_1") {
        assert(`UTIL_${type}: 100% capacity`, d1?.utilizationPercent === 100);
        assert(`IDLE_${type}: 0 idle`, d1?.idleCapacity === 0);
        assert(`PRESSURE_${type}: 500% queue pressure`, d1?.queuePressurePercent === 500);
        assert(`PEAK_${type}: updated dynamically to 100`, d1?.peakUtilization === 100);
      } else if (type === "SCAP_2") {
        assert(`UTIL_${type}: 20% capacity`, d1?.utilizationPercent === 20);
        assert(`IDLE_${type}: 8 idle`, d1?.idleCapacity === 8);
        assert(`PRESSURE_${type}: 0% queue pressure`, d1?.queuePressurePercent === 0);
        assert(`PEAK_${type}: retained historical 100`, d1?.peakUtilization === 100);
      } else if (type === "SCAP_EMPTY") {
        assert(`EMPTY_${type}: 0 active`, d1?.activeJobs === 0);
        assert(`EMPTY_${type}: 0% utilization`, d1?.utilizationPercent === 0);
        assert(`EMPTY_${type}: 10 idle default`, d1?.idleCapacity === 10);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-capacity");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    assert("AGGREGATE: global utilization bounded to 100", stats?.globalUtilizationPercent >= 0 && stats?.globalUtilizationPercent <= 100);
    assert("AGGREGATE: global queue pressure allows > 100", stats?.globalQueuePressurePercent > 100);
    assert("AGGREGATE: systemHealthStatus is WARNING", stats?.systemHealthStatus === "WARNING");
  }

  // Cleanup
  await ScraperCapacity.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-capacity-report.json"),
    JSON.stringify({ mockCaps }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-capacity-verification.json"),
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
