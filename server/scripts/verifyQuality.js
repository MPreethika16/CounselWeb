// server/scripts/verifyQuality.js
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

// ─── helpers used by both mock-builder and expectation logic ─────────────────
const STALE_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000;
const CONFIDENCE_MIN = 50;

function computeExpected(mc) {
  if (mc._nullData) {
    // null officialData → everything missing → score=0, level=POOR
    return { score: 0, level: "POOR", missing: 5, invalid: 0, stale: 0 };
  }
  const od = mc.officialData || {};
  const now = Date.now();
  let present = 0, missing = 0, invalid = 0, stale = 0;

  // contact
  const hasPhone = (od.contact?.phones?.length ?? 0) > 0;
  const hasEmail = (od.contact?.emails?.length ?? 0) > 0;
  const contactConf = od.contact?.confidence ?? 0;
  if (!hasPhone && !hasEmail) { missing++; }
  else if (contactConf < CONFIDENCE_MIN) { invalid++; }
  else { present++; }

  // accreditation
  const naac = od.accreditation?.naacGrade ?? "";
  const accredConf = od.accreditation?.confidence ?? 0;
  if (!naac) { missing++; }
  else if (accredConf < CONFIDENCE_MIN) { invalid++; }
  else { present++; }

  // placements
  const pkg = od.placements?.highestPackage ?? 0;
  const placConf = od.placements?.confidence ?? 0;
  if (!pkg || pkg <= 0) { missing++; }
  else if (placConf < CONFIDENCE_MIN) { invalid++; }
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
  console.log("=== Phase 2.17 Data Quality Analytics Verification ===");
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
  const staleDate  = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000); // 200 days ago = STALE

  /**
   * Mock college definitions.
   * Each entry includes an officialData shape and is used both to seed the DB
   * and to compute the expected score deterministically via computeExpected().
   */
  const mockColleges = [
    // ── Level: EXCELLENT (5/5) ──────────────────────────────────────────────
    {
      code: "QL_EXCELLENT",
      officialData: {
        contact: {
          phones: [{ number: "9000000001", category: "general" }],
          emails: ["info@excellent.ac.in"],
          confidence: 90
        },
        accreditation: { naacGrade: "A++", confidence: 95 },
        placements: { highestPackage: 1200000, confidence: 85 },
        facilitiesCount: 12,
        freshness: { lastScrapedAt: recentDate }
      }
    },
    // ── Level: GOOD (3-4/5) ─────────────────────────────────────────────────
    {
      code: "QL_GOOD",
      officialData: {
        contact: {
          phones: [{ number: "9000000002", category: "general" }],
          emails: [],
          confidence: 80
        },
        accreditation: { naacGrade: "A", confidence: 75 },
        placements: { highestPackage: 800000, confidence: 70 },
        facilitiesCount: 5,
        freshness: { lastScrapedAt: staleDate } // stale → not counted
      }
    },
    // ── Level: FAIR (2/5) ───────────────────────────────────────────────────
    {
      code: "QL_FAIR",
      officialData: {
        contact: {
          phones: [{ number: "9000000003", category: "general" }],
          emails: [],
          confidence: 80
        },
        accreditation: { naacGrade: "B+", confidence: 60 },
        placements: { highestPackage: 0, confidence: 0 }, // missing pkg
        facilitiesCount: 1,  // invalid (< 3)
        freshness: {}  // no lastScrapedAt → missing
      }
    },
    // ── Level: POOR (0-1/5) ─────────────────────────────────────────────────
    {
      code: "QL_POOR",
      officialData: {}
    },
    // ── Edge: null officialData ──────────────────────────────────────────────
    {
      code: "QL_NULL",
      officialData: null,
      _nullData: true
    },
    // ── Edge: empty objects / zero confidence ────────────────────────────────
    {
      code: "QL_INVALID_CONF",
      officialData: {
        contact: {
          phones: [{ number: "9000000004", category: "general" }],
          emails: [],
          confidence: 20 // below threshold → invalid
        },
        accreditation: { naacGrade: "C", confidence: 10 }, // below threshold → invalid
        placements: { highestPackage: 500000, confidence: 30 }, // below threshold → invalid
        facilitiesCount: 2, // insufficient → invalid
        freshness: {} // missing
      }
    },
    // ── Boundary: EXCELLENT threshold (score = 80, 4/5) ──────────────────────
    {
      code: "QL_BOUND_EXCELLENT",
      officialData: {
        contact: {
          phones: [{ number: "9000000005", category: "general" }],
          emails: [],
          confidence: 70
        },
        accreditation: { naacGrade: "A", confidence: 80 },
        placements: { highestPackage: 900000, confidence: 75 },
        facilitiesCount: 8,
        freshness: { lastScrapedAt: recentDate }
        // Missing: all 4 present + 1 missing → score = Math.round(4/5*100) = 80 → EXCELLENT
      }
    },
    // ── Boundary: GOOD threshold (score = 60, 3/5) ──────────────────────────
    {
      code: "QL_BOUND_GOOD",
      officialData: {
        contact: {
          phones: [{ number: "9000000006", category: "general" }],
          emails: [],
          confidence: 65
        },
        accreditation: { naacGrade: "B++", confidence: 60 },
        placements: { highestPackage: 600000, confidence: 55 },
        facilitiesCount: 0, // missing
        freshness: {} // missing
        // 3 present / 5 → score = Math.round(3/5*100) = 60 → GOOD
      }
    },
    // ── Boundary: FAIR threshold (score = 40, 2/5) ───────────────────────────
    {
      code: "QL_BOUND_FAIR",
      officialData: {
        contact: {
          phones: [{ number: "9000000007", category: "general" }],
          emails: [],
          confidence: 55
        },
        accreditation: { naacGrade: "B", confidence: 50 },
        placements: {},        // missing
        facilitiesCount: 0,   // missing
        freshness: {}          // missing
        // 2 present / 5 → score = Math.round(2/5*100) = 40 → FAIR
      }
    }
  ];

  // ── Upsert mock data ───────────────────────────────────────────────────────
  for (const mc of mockColleges) {
    const update = { collegeCode: mc.code, collegeName: `Mock College ${mc.code}` };
    if (Object.prototype.hasOwnProperty.call(mc, "officialData")) {
      update.officialData = mc.officialData;
    }
    await CollegeMaster.findOneAndUpdate({ collegeCode: mc.code }, update, { upsert: true, new: true });
  }

  // Short wait for DB write propagation
  await new Promise((r) => setTimeout(r, 1000));

  // ── Run API tests ──────────────────────────────────────────────────────────
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

      // Type checks
      assert(`DATA_${mc.code}: qualityScore is number`,
        typeof d1?.qualityScore === "number", `got ${d1?.qualityScore}`);
      assert(`RANGE_${mc.code}: score 0–100`,
        d1?.qualityScore >= 0 && d1?.qualityScore <= 100,
        `score=${d1?.qualityScore}`);

      // Expected values
      const exp = computeExpected(mc);
      assert(`SCORE_${mc.code}: correct`,
        d1?.qualityScore === exp.score,
        `expected=${exp.score}, got=${d1?.qualityScore}`);
      assert(`LEVEL_${mc.code}: correct`,
        d1?.qualityLevel === exp.level,
        `expected=${exp.level}, got=${d1?.qualityLevel}`);
      assert(`MISSING_${mc.code}: correct`,
        d1?.missingCount === exp.missing,
        `expected=${exp.missing}, got=${d1?.missingCount}`);
    }
  }

  // ── Aggregate stats ────────────────────────────────────────────────────────
  const aggRes = await httpRequest("GET", "/api/quality");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: averageQualityScore present",
      typeof agg.aggregateStats?.averageQualityScore === "number");
    assert("AGGREGATE: levelCounts present",
      agg.aggregateStats?.levelCounts && typeof agg.aggregateStats.levelCounts === "object");
    assert("AGGREGATE: totalMissingCount present",
      typeof agg.aggregateStats?.totalMissingCount === "number");
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  await CollegeMaster.deleteMany({ collegeCode: { $in: mockColleges.map((c) => c.code) } });
  await mongoose.disconnect();

  // ── Write reports ──────────────────────────────────────────────────────────
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "quality-report.json"),
    JSON.stringify({ mockColleges }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "quality-verification.json"),
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
