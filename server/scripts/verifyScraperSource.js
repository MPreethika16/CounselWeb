// server/scripts/verifyScraperSource.js
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
  console.log("=== Phase 2.22 Scraper Source Intelligence Verification ===");
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
  const yesterday = new Date(now - DAY_MS);
  
  const mockTypes = ["SS_DOMAIN_TEST", "SS_EMPTY"];
  await RawCollegePage.deleteMany({ pageType: { $in: mockTypes } });

  const mockRuns = [
    // ── SS_DOMAIN_TEST ───────────────────────────────────────────────────
    // wikipedia.org (2 success, 1 fail)
    { collegeCode: "SS_C1", canonicalDomain: "wikipedia.org", url: "http://wikipedia.org/1", pageType: "SS_DOMAIN_TEST", crawlStatus: "success", crawledAt: yesterday, durationMs: 100 },
    { collegeCode: "SS_C2", canonicalDomain: "wikipedia.org", url: "http://wikipedia.org/2", pageType: "SS_DOMAIN_TEST", crawlStatus: "failed", crawledAt: today, durationMs: 200 },
    { collegeCode: "SS_C3", canonicalDomain: "wikipedia.org", url: "http://wikipedia.org/3", pageType: "SS_DOMAIN_TEST", crawlStatus: "success", crawledAt: today, durationMs: 300 },
    
    // google.com (1 success, 0 fail)
    { collegeCode: "SS_C4", canonicalDomain: "google.com", url: "http://google.com/1", pageType: "SS_DOMAIN_TEST", crawlStatus: "success", crawledAt: today, durationMs: 50 },
    
    // yelp.com (0 success, 2 fail)
    { collegeCode: "SS_C5", canonicalDomain: "yelp.com", url: "http://yelp.com/1", pageType: "SS_DOMAIN_TEST", crawlStatus: "failed", crawledAt: yesterday, durationMs: 100 },
    { collegeCode: "SS_C6", canonicalDomain: "yelp.com", url: "http://yelp.com/2", pageType: "SS_DOMAIN_TEST", crawlStatus: "failed", crawledAt: today, durationMs: 150 }
  ];

  await RawCollegePage.insertMany(mockRuns);
  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const first = await httpRequest("GET", `/api/scraper-sources?scraperName=${type}`);
    const second = await httpRequest("GET", `/api/scraper-sources?scraperName=${type}`);

    assert(`API_${type}_first: status 200`, first.status === 200, `status=${first.status}`);
    assert(`API_${type}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      // Determinism
      assert(`DET_${type}: deterministic output`,
        JSON.stringify(d1?.sources) === JSON.stringify(d2?.sources),
        `sources match`);

      if (type === "SS_DOMAIN_TEST") {
        // Sources should be sorted alphabetically by domain: google.com, wikipedia.org, yelp.com
        const sGoogle = d1?.sources?.find(s => s.domain === "google.com");
        const sWiki = d1?.sources?.find(s => s.domain === "wikipedia.org");
        const sYelp = d1?.sources?.find(s => s.domain === "yelp.com");
        
        assert(`SORT_${type}: sorted alphabetically`, d1?.sources[0]?.domain === "google.com" && d1?.sources[1]?.domain === "wikipedia.org");

        assert(`METRICS_${type}_WIKI: totalRuns 3`, sWiki?.totalRuns === 3);
        assert(`METRICS_${type}_WIKI: successRate 67`, sWiki?.successRate === 67); // 2/3
        assert(`METRICS_${type}_WIKI: avgDuration 200`, sWiki?.avgDuration === 200); // 600/3
        assert(`METRICS_${type}_WIKI: lastSuccessAt`, sWiki?.lastSuccessAt === today.toISOString());
        assert(`METRICS_${type}_WIKI: lastFailureAt`, sWiki?.lastFailureAt === today.toISOString());

        assert(`METRICS_${type}_GOOGLE: successRate 100`, sGoogle?.successRate === 100);
        assert(`METRICS_${type}_GOOGLE: lastFailureAt null`, sGoogle?.lastFailureAt === null);

        assert(`METRICS_${type}_YELP: failureRate 100`, sYelp?.failureRate === 100);
        assert(`METRICS_${type}_YELP: lastSuccessAt null`, sYelp?.lastSuccessAt === null);

      } else if (type === "SS_EMPTY") {
        assert(`EMPTY_${type}: 0 sources`, d1?.sources?.length === 0);
      }
    }
  }

  // Aggregate checks
  const aggRes = await httpRequest("GET", "/api/scraper-sources");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: valid generatedAt date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(agg.generatedAt));
    assert("AGGREGATE: topDomains exists", Array.isArray(agg.aggregateStats?.topDomains));
    
    // We expect wikipedia.org to be in topDomains with at least 3 runs
    const wikiGlobal = agg.aggregateStats?.topDomains?.find(d => d.domain === "wikipedia.org");
    assert("AGGREGATE: wikipedia.org tracked globally", !!wikiGlobal);
    assert("AGGREGATE: wikipedia.org global runs >= 3", wikiGlobal?.totalRuns >= 3);
  }

  // Cleanup
  await RawCollegePage.deleteMany({ pageType: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-source-report.json"),
    JSON.stringify({ mockRuns }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-source-verification.json"),
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
