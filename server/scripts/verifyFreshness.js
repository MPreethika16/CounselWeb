// server/scripts/verifyFreshness.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import CollegeMaster from "../models/CollegeMaster.js";

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
  console.log("=== Phase 2.15 Data Freshness & Re-Crawl Verification ===");
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

  // Connect DB
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Check indexes
  const collection = mongoose.connection.db.collection("collegemasters");
  const indexes = await collection.listIndexes().toArray();
  const indexNames = indexes.map(i => i.name);
  assert("INDEX_01: idx_freshness_classification exists", indexNames.includes("idx_freshness_classification"), "Checking classification index");
  assert("INDEX_02: idx_freshness_score exists", indexNames.includes("idx_freshness_score"), "Checking score index");

  // Seed mock data
  const now = new Date();
  const mockColleges = [
    { code: "TEST_FRESH", ageDays: 5, expectedClass: "FRESH" },
    { code: "TEST_AGING", ageDays: 60, expectedClass: "AGING" },
    { code: "TEST_STALE", ageDays: 120, expectedClass: "STALE" },
    { code: "TEST_CRIT", ageDays: 200, expectedClass: "CRITICAL" },
    { code: "TEST_NULL", ageDays: null, expectedClass: "CRITICAL" },
  ];

  for (const mc of mockColleges) {
    const date = mc.ageDays !== null ? new Date(now.getTime() - (mc.ageDays * 24 * 60 * 60 * 1000)) : null;
    await CollegeMaster.findOneAndUpdate(
      { collegeCode: mc.code },
      { 
        collegeCode: mc.code, 
        collegeName: `Mock College ${mc.expectedClass}`,
        officialData: {
          freshness: {
            lastScrapedAt: date,
            lastVerifiedAt: date,
            score: mc.expectedClass === "CRITICAL" ? 0 : 
                   mc.expectedClass === "STALE" ? 33 :
                   mc.expectedClass === "AGING" ? 66 : 97 
          }
        }
      },
      { upsert: true, new: true }
    );
  }

  // Wait a moment before making HTTP request
  await new Promise(r => setTimeout(r, 1000));

  // 1. Fetch /api/freshness
  const res = await httpRequest("GET", "/api/freshness?limit=5000");
  assert("API_01: GET /api/freshness returns 200", res.status === 200, `status=${res.status}`);
  
  if (res.status === 200) {
    const queue = res.data.queue;
    assert("API_02: Queue is returned and valid", Array.isArray(queue) && queue.length >= 5, `queue length=${queue?.length}`);
    
    // Check our mock colleges
    const fresh = queue.find(c => c.collegeCode === "TEST_FRESH");
    const aging = queue.find(c => c.collegeCode === "TEST_AGING");
    const stale = queue.find(c => c.collegeCode === "TEST_STALE");
    const crit = queue.find(c => c.collegeCode === "TEST_CRIT");
    const nullCase = queue.find(c => c.collegeCode === "TEST_NULL");

    assert("CLASS_01: FRESH classification is correct", fresh && fresh.classification === "FRESH", `classification=${fresh?.classification}`);
    assert("CLASS_02: AGING classification is correct", aging && aging.classification === "AGING", `classification=${aging?.classification}`);
    assert("CLASS_03: STALE classification is correct", stale && stale.classification === "STALE", `classification=${stale?.classification}`);
    assert("CLASS_04: CRITICAL classification is correct", crit && crit.classification === "CRITICAL", `classification=${crit?.classification}`);
    
    assert("CLASS_05: NULL date maps to CRITICAL classification", nullCase && nullCase.classification === "CRITICAL", `classification=${nullCase?.classification}`);
    assert("SCORE_02: NULL date scores exactly 0", nullCase && nullCase.score === 0, `score=${nullCase?.score}`);

    assert("SCORE_01: Freshness scores are valid numbers (0-100)", 
      fresh?.score >= 0 && fresh?.score <= 100 && crit?.score === 0, 
      `fresh=${fresh?.score}, crit=${crit?.score}`
    );

    // Queue ordering
    if (fresh && aging && stale && crit && nullCase) {
      const critIdx = queue.findIndex(c => c.collegeCode === "TEST_CRIT");
      const nullIdx = queue.findIndex(c => c.collegeCode === "TEST_NULL");
      const staleIdx = queue.findIndex(c => c.collegeCode === "TEST_STALE");
      const agingIdx = queue.findIndex(c => c.collegeCode === "TEST_AGING");
      const freshIdx = queue.findIndex(c => c.collegeCode === "TEST_FRESH");

      // Criticals (including null) should be before Stale, which is before Aging, which is before Fresh
      const maxCritIdx = Math.max(critIdx, nullIdx);
      const correctOrder = maxCritIdx < staleIdx && staleIdx < agingIdx && agingIdx < freshIdx;
      assert("ORDER_01: Queue ordering prioritizes lowest score first (DB-Level Sorting)", correctOrder, 
        `Indices: CRIT=${critIdx}, NULL=${nullIdx}, STALE=${staleIdx}, AGING=${agingIdx}, FRESH=${freshIdx}`
      );
    } else {
      assert("ORDER_01: Queue ordering prioritizes lowest score first", false, "Missing mock colleges in response");
    }
  }

  // Cleanup mocks
  await CollegeMaster.deleteMany({ collegeCode: { $in: mockColleges.map(c => c.code) } });
  await mongoose.disconnect();

  // Save reports
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(path.join(reportDir, "freshness-hardening-report.json"), JSON.stringify(res.data, null, 2));
  fs.writeFileSync(path.join(reportDir, "freshness-hardening-verification.json"), JSON.stringify(report, null, 2));

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
