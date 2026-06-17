// server/scripts/verifyScraperCost.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperCost from "../models/ScraperCost.js";

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
  console.log("=== Phase 2.29 Scraper Cost Intelligence Verification ===");
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

  const mockTypes = ["SCOST_1", "SCOST_EMPTY"];
  await ScraperCost.deleteMany({ scraperName: { $in: mockTypes } });

  const GB = 1024 * 1024 * 1024;
  const HOUR_MS = 60 * 60 * 1000;

  const mockCosts = [
    // ── SCOST_1 ───────────────────────────────────────────────────────────
    // Requests: 1,000,000 (1000000 * 0.0001 = $100)
    // Bandwidth: 10 GB (10 * 0.01 = $0.10)
    // Storage: 5 GB (5 * 0.05 = $0.25)
    // Compute: 100 Hours (100 * 0.02 = $2.00)
    // Total Estimated Cost: $102.35
    { 
      scraperName: "SCOST_1", 
      totalRequests: 1000000,
      totalBandwidthBytes: 10 * GB,
      totalStorageBytes: 5 * GB,
      totalComputeTimeMs: 100 * HOUR_MS
    }
  ];

  await ScraperCost.insertMany(mockCosts);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-cost?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-cost?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SCOST_1") {
        assert(`REQ_COST_${type}: exactly $100`, d1?.costs?.requestCost === 100);
        assert(`BANDWIDTH_COST_${type}: exactly $0.1`, d1?.costs?.bandwidthCost === 0.1);
        assert(`STORAGE_COST_${type}: exactly $0.25`, d1?.costs?.storageCost === 0.25);
        assert(`COMPUTE_COST_${type}: exactly $2`, d1?.costs?.computeCost === 2);
        assert(`TOTAL_COST_${type}: exactly $102.35`, d1?.costs?.estimatedTotalCost === 102.35);
      } else if (type === "SCOST_EMPTY") {
        assert(`EMPTY_${type}: requests 0`, d1?.resources?.requests === 0);
        assert(`EMPTY_${type}: bandwidthGB 0`, d1?.resources?.bandwidthGB === 0);
        assert(`EMPTY_${type}: cost exactly $0`, d1?.costs?.estimatedTotalCost === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-cost");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    assert("AGGREGATE: globalEstimatedTotalCost bounds logic", stats?.globalEstimatedTotalCost >= 102.35);
    
    // Because 102.35 > 100, the status should be WARNING
    assert("AGGREGATE: systemFinancialStatus correctly triggered WARNING", stats?.systemFinancialStatus === "WARNING");
  }

  // Cleanup
  await ScraperCost.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-cost-report.json"),
    JSON.stringify({ mockCosts }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-cost-verification.json"),
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
