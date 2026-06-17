// server/scripts/verifyQualityHardening.js
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
  const start = performance.now();
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
      res.on("end", () => {
        resolve({ 
          status: res.statusCode, 
          data: data ? JSON.parse(data) : null,
          durationMs: performance.now() - start
        });
      });
    });
    req.on("error", (err) => {
      resolve({ status: 500, error: err.message, durationMs: performance.now() - start });
    });
    req.end();
  });
}

const STALE_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000;
const CONFIDENCE_MIN = 50;

function computeExpected(mc) {
  if (mc._nullData) {
    return { score: 0, level: "POOR", missing: 5, invalid: 0, stale: 0 };
  }
  const od = mc.officialData || {};
  const now = Date.now();
  let present = 0, missing = 0, invalid = 0, stale = 0;

  // contact
  const hasPhone = (od.contact?.phones?.length ?? 0) > 0;
  const hasEmail = (od.contact?.emails?.length ?? 0) > 0;
  const contactConf = od.contact?.confidence; // might be undefined
  if (!hasPhone && !hasEmail) { missing++; }
  else if (contactConf === undefined || contactConf < CONFIDENCE_MIN) { invalid++; }
  else { present++; }

  // accreditation
  const naac = od.accreditation?.naacGrade ?? "";
  const accredConf = od.accreditation?.confidence;
  if (!naac) { missing++; }
  else if (accredConf === undefined || accredConf < CONFIDENCE_MIN) { invalid++; }
  else { present++; }

  // placements
  const pkg = od.placements?.highestPackage ?? 0;
  const placConf = od.placements?.confidence;
  if (!pkg || pkg <= 0) { missing++; }
  else if (placConf === undefined || placConf < CONFIDENCE_MIN) { invalid++; }
  else { present++; }

  // facilities
  const fac = od.facilitiesCount ?? 0;
  if (fac <= 0) { missing++; }
  else if (fac < 3) { invalid++; }
  else { present++; }

  // freshness
  const scrapedAt = od.freshness?.lastScrapedAt
    ? new Date(od.freshness.lastScrapedAt).getTime()
    : null;
  if (!scrapedAt) { missing++; }
  else if (now - scrapedAt > STALE_THRESHOLD_MS) { stale++; }
  else { present++; }

  const score = Math.round((present / 5) * 100);
  const level =
    score >= 80 ? "EXCELLENT" :
    score >= 60 ? "GOOD" :
    score >= 40 ? "FAIR" : "POOR";

  return { score, level, missing, invalid, stale };
}

async function verify() {
  console.log("=== Phase 2.17A Quality Hardening Verification ===");
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

  const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago = FRESH

  const mockColleges = [
    // ── Edge: null lastScrapedAt ─────────────────────────────────────────────
    {
      code: "QH_NULL_SCRAPED",
      officialData: {
        contact: { phones: [{ number: "9000000001", category: "general" }], emails: [], confidence: 90 },
        accreditation: { naacGrade: "A", confidence: 90 },
        placements: { highestPackage: 500000, confidence: 90 },
        facilitiesCount: 5,
        freshness: { lastScrapedAt: null } // missing
      }
    },
    // ── Edge: missing confidence ─────────────────────────────────────────────
    {
      code: "QH_MISSING_CONF",
      officialData: {
        contact: { phones: [{ number: "9000000002", category: "general" }], emails: [] }, // no confidence
        accreditation: { naacGrade: "A" }, // no confidence
        placements: { highestPackage: 500000 }, // no confidence
        facilitiesCount: 5,
        freshness: { lastScrapedAt: recentDate }
      }
    },
    // ── Edge: empty officialData ─────────────────────────────────────────────
    {
      code: "QH_EMPTY_DATA",
      officialData: {}
    },
    // ── Boundary: 20 POOR (1/5) - Note: 39 is impossible with 5 dimensions ───
    {
      code: "QH_BOUND_POOR",
      officialData: {
        contact: { phones: [{ number: "9000000004", category: "general" }], emails: [], confidence: 90 },
        accreditation: {},
        placements: {},
        facilitiesCount: 0,
        freshness: {}
      }
    },
    // ── Boundary: 40 FAIR (2/5) ──────────────────────────────────────────────
    {
      code: "QH_BOUND_FAIR",
      officialData: {
        contact: { phones: [{ number: "9000000005", category: "general" }], emails: [], confidence: 90 },
        accreditation: { naacGrade: "A", confidence: 90 },
        placements: {},
        facilitiesCount: 0,
        freshness: {}
      }
    },
    // ── Boundary: 60 GOOD (3/5) ──────────────────────────────────────────────
    {
      code: "QH_BOUND_GOOD",
      officialData: {
        contact: { phones: [{ number: "9000000006", category: "general" }], emails: [], confidence: 90 },
        accreditation: { naacGrade: "A", confidence: 90 },
        placements: { highestPackage: 500000, confidence: 90 },
        facilitiesCount: 0,
        freshness: {}
      }
    },
    // ── Boundary: 80 EXCELLENT (4/5) ─────────────────────────────────────────
    {
      code: "QH_BOUND_EXCELLENT",
      officialData: {
        contact: { phones: [{ number: "9000000007", category: "general" }], emails: [], confidence: 90 },
        accreditation: { naacGrade: "A", confidence: 90 },
        placements: { highestPackage: 500000, confidence: 90 },
        facilitiesCount: 5,
        freshness: {}
      }
    }
  ];

  // Upsert
  for (const mc of mockColleges) {
    const update = { collegeCode: mc.code, collegeName: `Hardening Mock ${mc.code}` };
    if (Object.prototype.hasOwnProperty.call(mc, "officialData")) {
      update.officialData = mc.officialData;
    }
    await CollegeMaster.findOneAndUpdate({ collegeCode: mc.code }, update, { upsert: true, new: true });
  }

  await new Promise((r) => setTimeout(r, 1000));

  for (const mc of mockColleges) {
    const first  = await httpRequest("GET", `/api/quality?collegeCode=${mc.code}`);
    const second = await httpRequest("GET", `/api/quality?collegeCode=${mc.code}`);

    assert(`API_${mc.code}_first: status 200`,  first.status === 200,  `status=${first.status}`);
    assert(`API_${mc.code}_second: status 200`, second.status === 200, `status=${second.status}`);

    if (first.status === 200 && second.status === 200) {
      const d1 = first.data?.data?.[0];
      const d2 = second.data?.data?.[0];

      // Determinism
      assert(`DET_${mc.code}: deterministic score`,
        d1?.qualityScore === d2?.qualityScore,
        `first=${d1?.qualityScore}, second=${d2?.qualityScore}`);

      // Range
      assert(`RANGE_${mc.code}: score 0–100`,
        d1?.qualityScore >= 0 && d1?.qualityScore <= 100,
        `score=${d1?.qualityScore}`);

      const exp = computeExpected(mc);
      assert(`SCORE_${mc.code}: correct`,
        d1?.qualityScore === exp.score,
        `expected=${exp.score}, got=${d1?.qualityScore}`);
      assert(`LEVEL_${mc.code}: correct`,
        d1?.qualityLevel === exp.level,
        `expected=${exp.level}, got=${d1?.qualityLevel}`);
    }
  }

  // ── Aggregate Performance Check ───────────────────────────────────────────
  const aggRes = await httpRequest("GET", "/api/quality");
  assert("AGGREGATE_PERF: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    assert("AGGREGATE_PERF: execution time < 1000ms", 
      aggRes.durationMs < 1000, 
      `duration=${aggRes.durationMs.toFixed(2)}ms`);
      
    const agg = aggRes.data;
    assert("AGGREGATE_PERF: contains averageQualityScore",
      typeof agg.aggregateStats?.averageQualityScore === "number");
  }

  // Cleanup
  await CollegeMaster.deleteMany({ collegeCode: { $in: mockColleges.map((c) => c.code) } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "quality-hardening-report.json"),
    JSON.stringify({ mockColleges }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "quality-hardening-verification.json"),
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
