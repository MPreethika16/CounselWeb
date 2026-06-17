// server/scripts/verifyScraperRoi.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperRoi from "../models/ScraperRoi.js";

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
  console.log("=== Phase 2.30 Scraper ROI Intelligence Verification ===");
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

  const mockTypes = ["SROI_HIGH", "SROI_LOW", "SROI_EMPTY"];
  await ScraperRoi.deleteMany({ scraperName: { $in: mockTypes } });

  const mockRois = [
    // ── SROI_HIGH ───────────────────────────────────────────────────────────
    // Low cost, many records. $10 total, 10,000 records. Cost per record: $0.001
    // Success rate: 98%. Since cost is low, ROI should get the +20 bonus -> 100 (capped).
    { 
      scraperName: "SROI_HIGH", 
      totalCostUsd: 10,
      recordsProduced: 10000,
      successRate: 98
    },
    // ── SROI_LOW ───────────────────────────────────────────────────────────
    // High cost, few records. $1000 total, 100 records. Cost per record: $10.00
    // Success rate: 50%. Since cost > 0.05, Penalty = 10 * 100 = 1000.
    // Score should be 0 (capped).
    { 
      scraperName: "SROI_LOW", 
      totalCostUsd: 1000,
      recordsProduced: 100,
      successRate: 50
    }
  ];

  await ScraperRoi.insertMany(mockRois);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-roi?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-roi?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SROI_HIGH") {
        assert(`COST_${type}: cost per record 0.001`, d1?.costPerRecord === 0.001);
        assert(`SCORE_${type}: ROI is 100`, d1?.roiScore === 100);
      } else if (type === "SROI_LOW") {
        assert(`COST_${type}: cost per record 10`, d1?.costPerRecord === 10);
        assert(`SCORE_${type}: ROI is 0`, d1?.roiScore === 0);
      } else if (type === "SROI_EMPTY") {
        assert(`EMPTY_${type}: records 0`, d1?.recordsProduced === 0);
        assert(`EMPTY_${type}: score 0`, d1?.roiScore === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-roi");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    // We expect sorting logic so topScraper should have 100, bottom should have 0
    assert("AGGREGATE: topScraper tracked", !!stats?.topScraper?.scraperName);
    assert("AGGREGATE: bottomScraper tracked", !!stats?.bottomScraper?.scraperName);
    
    // Validate sorting
    const allData = agg.data;
    assert("AGGREGATE: array is sorted descending by ROI", allData[0].roiScore >= allData[allData.length - 1].roiScore);
  }

  // Cleanup
  await ScraperRoi.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-roi-report.json"),
    JSON.stringify({ mockRois }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-roi-verification.json"),
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
