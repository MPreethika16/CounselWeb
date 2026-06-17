// server/scripts/verifyCoverage.js
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
  console.log("=== Phase 2.16 Coverage Analytics Verification (Hardening) ===");
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

  // Prepare mock colleges with different coverage scenarios
  const mockColleges = [
    // Existing scenarios
    {
      code: "COV_FULL",
      officialData: {
        placements: { highestPackage: 500000 },
        facilitiesCount: 10,
        contact: { phones: [{ number: "1234567890", category: "general" }], emails: ["info@full.com"] },
        accreditation: { naacGrade: "A++" },
        academics: {},
        fees: {},
        admissions: {}
      }
    },
    {
      code: "COV_HIGH",
      officialData: {
        placements: { highestPackage: 300000 },
        facilitiesCount: 5,
        contact: { phones: [{ number: "0987654321", category: "general" }] },
        // accreditation missing
        academics: {},
        fees: {},
        admissions: {}
      }
    },
    {
      code: "COV_MEDIUM",
      officialData: {
        placements: {},
        facilitiesCount: 3,
        // contact missing
        // accreditation missing
        academics: {},
        fees: {},
        admissions: {}
      }
    },
    {
      code: "COV_LOW",
      officialData: {}
    },
    // Edge cases for hardening
    {
      code: "COV_NULL",
      officialData: null
    },
    {
      code: "COV_UNDEF",
      // officialData omitted from update => Mongoose applies schema defaults
      // academics:{}, fees:{}, admissions:{} will be present by default => score=43, level=MEDIUM
      _mongooseDefaults: true
    },
    {
      code: "COV_EMPTY",
      officialData: {
        placements: {},
        facilitiesCount: 0,
        contact: { phones: [], emails: [] },
        accreditation: {},
        academics: {},
        fees: {},
        admissions: {}
      }
    },
    // Boundary tests
    {
      code: "COV_BOUND_MEDIUM",
      officialData: {
        // 3 categories present => 43% => MEDIUM
        placements: { highestPackage: 200000 },
        contact: { phones: [{ number: "1111111111", category: "gen" }] },
        academics: {}
      }
    },
    {
      code: "COV_BOUND_HIGH",
      officialData: {
        // 5 categories present => 71% => HIGH
        placements: { highestPackage: 200000 },
        facilitiesCount: 4,
        contact: { phones: [{ number: "2222222222", category: "gen" }] },
        academics: {},
        fees: {}
      }
    },
    {
      code: "COV_BOUND_COMPLETE",
      officialData: {
        // all 7 categories present => COMPLETE
        placements: { highestPackage: 200000 },
        facilitiesCount: 4,
        contact: { phones: [{ number: "3333333333", category: "gen" }] },
        accreditation: { naacGrade: "A" },
        academics: {},
        fees: {},
        admissions: {}
      }
    }
  ];

  // Upsert mock data
  for (const mc of mockColleges) {
    const update = { collegeCode: mc.code, collegeName: `Mock College ${mc.code}` };
    if (Object.prototype.hasOwnProperty.call(mc, "officialData")) {
      update.officialData = mc.officialData;
    }
    await CollegeMaster.findOneAndUpdate({ collegeCode: mc.code }, update, { upsert: true, new: true });
  }

  // Short wait for server readiness
  await new Promise((r) => setTimeout(r, 1000));

  // Verify each college twice for deterministic output
  for (const mc of mockColleges) {
    const first = await httpRequest("GET", `/api/coverage?collegeCode=${mc.code}`);
    assert(`API_${mc.code}_first: status 200`, first.status === 200, `status=${first.status}`);
    const second = await httpRequest("GET", `/api/coverage?collegeCode=${mc.code}`);
    assert(`API_${mc.code}_second: status 200`, second.status === 200, `status=${second.status}`);
    if (first.status === 200 && second.status === 200) {
      const data1 = first.data?.data && first.data.data[0];
      const data2 = second.data?.data && second.data.data[0];
      assert(`DET_${mc.code}: deterministic score`, data1?.coverageScore === data2?.coverageScore, `first=${data1?.coverageScore}, second=${data2?.coverageScore}`);
      // Basic presence checks
      assert(`DATA_${mc.code}: coverageScore number`, typeof data1?.coverageScore === "number", `got ${data1?.coverageScore}`);
      // Expected classification based on present categories
      // For _mongooseDefaults case: Mongoose populates academics:{}, fees:{}, admissions:{} by default
      const od = mc._mongooseDefaults ? { academics: {}, fees: {}, admissions: {} } : (mc.officialData || {});
      const present = [];
      if (od.placements && (od.placements.highestPackage || od.placements.recruiters?.length > 0 || od.placements.totalOffers > 0)) present.push("placements");
      if (od.facilitiesCount && od.facilitiesCount > 0) present.push("infrastructure");
      if (od.contact && (od.contact.phones?.length > 0 || od.contact.emails?.length > 0)) present.push("contact");
      if (od.accreditation && (od.accreditation.naacGrade || od.accreditation.nbaAccredited || od.accreditation.autonomous)) present.push("accreditation");
      if (od.academics) present.push("academics");
      if (od.fees) present.push("fees");
      if (od.admissions) present.push("admissions");
      const expectedScore = Math.round((present.length / 7) * 100);
      const expectedLevel = expectedScore === 100 ? "COMPLETE" : expectedScore >= 70 ? "HIGH" : expectedScore >= 40 ? "MEDIUM" : "LOW";
      assert(`SCORE_${mc.code}: correct`, data1.coverageScore === expectedScore, `expected=${expectedScore}, got=${data1.coverageScore}`);
      assert(`LEVEL_${mc.code}: correct`, data1.completenessLevel === expectedLevel, `expected=${expectedLevel}, got=${data1.completenessLevel}`);
    }
  }

  // Verify aggregate stats (no collegeCode)
  const aggRes = await httpRequest("GET", "/api/coverage");
  assert("AGGREGATE: status 200", aggRes.status === 200, `status=${aggRes.status}`);
  if (aggRes.status === 200) {
    const agg = aggRes.data;
    assert("AGGREGATE: averageCoverageScore present", typeof agg.aggregateStats?.averageCoverageScore === "number");
    assert("AGGREGATE: levelCounts present", agg.aggregateStats?.levelCounts && typeof agg.aggregateStats.levelCounts === "object");
  }

  // Cleanup mock data
  await CollegeMaster.deleteMany({ collegeCode: { $in: mockColleges.map((c) => c.code) } });
  await mongoose.disconnect();

  // Write reports
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "coverage-fix-report.json"), JSON.stringify({ mockColleges }, null, 2));
  fs.writeFileSync(path.join(reportDir, "coverage-fix-verification.json"), JSON.stringify(report, null, 2));

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
