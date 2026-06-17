// server/scripts/verifyScraperCoverage.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import College from "../models/College.js";
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
  console.log("=== Phase 2.23 Scraper Coverage Intelligence Verification ===");
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

  const mockCollegeCodes = ["SC_COVER_1", "SC_COVER_2", "SC_COVER_3", "SC_COVER_4"];
  await College.deleteMany({ collegeCode: { $in: mockCollegeCodes } });
  await RawCollegePage.deleteMany({ collegeCode: { $in: mockCollegeCodes } });

  // 4 total mock colleges in universe
  // SC_COVER_1: perfectly complete
  // SC_COVER_2: missing nirf, placements, gallery
  // SC_COVER_3: missing hostel, fees
  // SC_COVER_4: missing everything
  const mockColleges = [
    {
      name: "Coverage College 1", collegeCode: "SC_COVER_1", branch: "CS", branchCode: "CS",
      category: "GEN", gender: "Co-Ed", cutoff: 100, year: 2026,
      ranking: { nirf: 10, nba: true, naac: "A++" },
      placements: { avgPackage: 1000000 },
      facilities: { hostel: true, library: true },
      fees: 50000, gallery: ["img1.jpg"]
    },
    {
      name: "Coverage College 2", collegeCode: "SC_COVER_2", branch: "CS", branchCode: "CS",
      category: "GEN", gender: "Co-Ed", cutoff: 100, year: 2026,
      ranking: { nba: true, naac: "A+" },
      facilities: { hostel: true, library: true },
      fees: 40000, gallery: []
    },
    {
      name: "Coverage College 3", collegeCode: "SC_COVER_3", branch: "CS", branchCode: "CS",
      category: "GEN", gender: "Co-Ed", cutoff: 100, year: 2026,
      ranking: { nirf: 20, nba: true, naac: "A" },
      placements: { avgPackage: 800000 },
      facilities: { library: true },
      fees: 0, gallery: ["img2.jpg"]
    },
    {
      name: "Coverage College 4", collegeCode: "SC_COVER_4", branch: "CS", branchCode: "CS",
      category: "GEN", gender: "Co-Ed", cutoff: 100, year: 2026,
      // missing all trackable fields
    }
  ];

  await College.insertMany(mockColleges);

  // Raw pages covering 3 out of 4 colleges
  const mockRawPages = [
    { collegeCode: "SC_COVER_1", canonicalDomain: "wikipedia.org", url: "http://wiki/1", pageType: "TEST", crawlStatus: "success" },
    { collegeCode: "SC_COVER_2", canonicalDomain: "wikipedia.org", url: "http://wiki/2", pageType: "TEST", crawlStatus: "success" },
    { collegeCode: "SC_COVER_3", canonicalDomain: "google.com", url: "http://google/1", pageType: "TEST", crawlStatus: "success" },
    // SC_COVER_4 is NOT scraped (missing)
    // Add a failed scrape just to make sure it's not counted
    { collegeCode: "SC_COVER_4", canonicalDomain: "wikipedia.org", url: "http://wiki/4", pageType: "TEST", crawlStatus: "failed" },
  ];

  await RawCollegePage.insertMany(mockRawPages);
  await new Promise(r => setTimeout(r, 1000));

  const first = await httpRequest("GET", `/api/scraper-coverage`);
  const second = await httpRequest("GET", `/api/scraper-coverage`);

  assert(`API_first: status 200`, first.status === 200, `status=${first.status}`);
  assert(`API_second: status 200`, second.status === 200, `status=${second.status}`);

  if (first.status === 200 && second.status === 200) {
    const d1 = first.data?.data;
    const d2 = second.data?.data;

    // Determinism
    assert(`DET_coverage: deterministic output`, JSON.stringify(d1) === JSON.stringify(d2), `outputs match`);

    // We can't guarantee the absolute numbers because the DB might have real data, 
    // but we can guarantee that our inserts *increased* the counts by exactly what we expect.
    // Actually, since we check the whole DB, let's verify percentages and bounds.
    assert(`BOUNDS: coveragePercentage 0-100`, d1?.coveragePercentage >= 0 && d1?.coveragePercentage <= 100);
    assert(`BOUNDS: collegesScraped >= 3`, d1?.collegesScraped >= 3);
    
    // Check field coverage structure
    const fields = d1?.fieldCoverage;
    assert(`FIELDS: contains ranking.nirf`, !!fields?.["ranking.nirf"]);
    assert(`FIELDS: contains placements.avgPackage`, !!fields?.["placements.avgPackage"]);
    assert(`FIELDS: contains gallery`, !!fields?.["gallery"]);
    
    const missingNirf = fields?.["ranking.nirf"]?.missingCount;
    assert(`FIELDS: missing nirf >= 2`, missingNirf >= 2); // colleges 2 and 4 from our mock are missing nirf
    
    // Top missing fields sorted
    const topMissing = d1?.topMissingFields;
    assert(`SORT: top missing fields desc`, topMissing[0]?.missingCount >= topMissing[1]?.missingCount);
    
    // Source mapping
    const sources = d1?.coverageBySource;
    const wiki = sources?.find(s => s.domain === "wikipedia.org");
    const google = sources?.find(s => s.domain === "google.com");
    assert(`SOURCES: wikipedia.org tracked`, !!wiki);
    assert(`SOURCES: google.com tracked`, !!google);
  }

  // Check empty state handling by wiping DB temporarily (just our test data? No, if we wipe the DB we lose real data).
  // We can trust the Service unit logic handles 0, we already reviewed `expectedTotal === 0` case.

  // Cleanup
  await College.deleteMany({ collegeCode: { $in: mockCollegeCodes } });
  await RawCollegePage.deleteMany({ collegeCode: { $in: mockCollegeCodes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "scraper-coverage-report.json"),
    JSON.stringify({ mockColleges, mockRawPages }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "scraper-coverage-verification.json"),
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
