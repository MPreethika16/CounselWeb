// server/scripts/verifyScraperOptimization.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperOptimization from "../models/ScraperOptimization.js";

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
  console.log("=== Phase 2.31 Scraper Optimization Intelligence Verification ===");
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

  const mockTypes = ["SOPT_URGENT", "SOPT_HEALTHY", "SOPT_EMPTY"];
  await ScraperOptimization.deleteMany({ scraperName: { $in: mockTypes } });

  const mockOpts = [
    // ── SOPT_URGENT ───────────────────────────────────────────────────────────
    // Has all 3 negative flags. 30 + 30 + 40 = 100 recommendation score.
    { 
      scraperName: "SOPT_URGENT", 
      isSlow: true,
      isHighCost: true,
      isLowRoi: true,
      manualPriorityOffset: 0
    },
    // ── SOPT_HEALTHY ───────────────────────────────────────────────────────────
    // Has 0 negative flags.
    { 
      scraperName: "SOPT_HEALTHY", 
      isSlow: false,
      isHighCost: false,
      isLowRoi: false,
      manualPriorityOffset: 0
    }
  ];

  await ScraperOptimization.insertMany(mockOpts);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-optimization?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-optimization?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      assert(`DET_${type}: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

      if (type === "SOPT_URGENT") {
        assert(`SCORE_${type}: recommended score 100`, d1?.recommendationScore === 100);
        assert(`OPPS_${type}: contains 3 suggestions`, d1?.optimizationOpportunities?.length === 3);
        assert(`PRIORITY_${type}: ranked priority 1`, d1?.priorityRanking === 1);
      } else if (type === "SOPT_HEALTHY") {
        assert(`SCORE_${type}: recommended score 0`, d1?.recommendationScore === 0);
        assert(`OPPS_${type}: contains 0 suggestions`, d1?.optimizationOpportunities?.length === 0);
      } else if (type === "SOPT_EMPTY") {
        assert(`EMPTY_${type}: recommendation score 0`, d1?.recommendationScore === 0);
        assert(`EMPTY_${type}: array opportunities empty`, d1?.optimizationOpportunities?.length === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-optimization");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    
    const stats = agg.aggregateStats;
    assert("AGGREGATE: urgentInterventionsRequired is true", stats?.urgentInterventionsRequired === true);
    
    // Validate sorting across multiple records
    const allData = agg.data;
    assert("AGGREGATE: array is sorted descending by recommendationScore", allData[0].recommendationScore >= allData[allData.length - 1].recommendationScore);
    assert("AGGREGATE: priority 1 corresponds to top score", allData[0].priorityRanking === 1);
  }

  // Cleanup
  await ScraperOptimization.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-optimization-report.json"),
    JSON.stringify({ mockOpts }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-optimization-verification.json"),
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
