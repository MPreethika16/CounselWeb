// server/scripts/verifyBenchmarkSnapshot.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import BenchmarkSnapshot from "../models/BenchmarkSnapshot.js";

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
  console.log("=== Phase 2.35A Benchmark Snapshot Verification ===");
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

  const mockTypes = ["SSNAP_FULL", "SSNAP_EMPTY", "SSNAP_MISSING_7D", "SSNAP_MISSING_30D", "SSNAP_TZ", "SSNAP_DUP"];
  await BenchmarkSnapshot.deleteMany({ scraperName: { $in: mockTypes } });

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const mockSnaps = [
    // ── SSNAP_FULL (Has current, 7d, and 30d snapshots) ──────────────────────
    {
      scraperName: "SSNAP_FULL",
      snapshotDate: now,
      percentileRanking: 100,
      successRate: 100,
      durationMs: 100,
      roiScore: 100,
      benchmarkStatus: "ABOVE_AVERAGE"
    },
    {
      scraperName: "SSNAP_FULL",
      snapshotDate: new Date(now.getTime() - 7 * dayMs),
      percentileRanking: 90,
      successRate: 90,
      durationMs: 200,
      roiScore: 90,
      benchmarkStatus: "ABOVE_AVERAGE"
    },
    {
      scraperName: "SSNAP_FULL",
      snapshotDate: new Date(now.getTime() - 30 * dayMs),
      percentileRanking: 80,
      successRate: 80,
      durationMs: 300,
      roiScore: 80,
      benchmarkStatus: "AVERAGE"
    },
    // ── SSNAP_MISSING_7D (Missing 7d but has 30d) ───────────────────────────
    {
      scraperName: "SSNAP_MISSING_7D",
      snapshotDate: now,
      percentileRanking: 100,
      successRate: 100,
      durationMs: 100,
      roiScore: 100,
      benchmarkStatus: "ABOVE_AVERAGE"
    },
    {
      scraperName: "SSNAP_MISSING_7D",
      snapshotDate: new Date(now.getTime() - 30 * dayMs),
      percentileRanking: 80,
      successRate: 80,
      durationMs: 300,
      roiScore: 80,
      benchmarkStatus: "AVERAGE"
    },
    // ── SSNAP_MISSING_30D (Missing 30d but has 7d) ──────────────────────────
    {
      scraperName: "SSNAP_MISSING_30D",
      snapshotDate: now,
      percentileRanking: 100,
      successRate: 100,
      durationMs: 100,
      roiScore: 100,
      benchmarkStatus: "ABOVE_AVERAGE"
    },
    {
      scraperName: "SSNAP_MISSING_30D",
      snapshotDate: new Date(now.getTime() - 7 * dayMs),
      percentileRanking: 90,
      successRate: 90,
      durationMs: 200,
      roiScore: 90,
      benchmarkStatus: "ABOVE_AVERAGE"
    }
  ];

  // Insert mock data using create() to trigger pre-save hook and unique constraints
  for (const snap of mockSnaps) {
    await BenchmarkSnapshot.create(snap);
  }

  // ── TEST: Timezone Boundary & Duplicate Protection ───────────────────────
  // A snapshot at 23:59:59 and one at 00:00:01 on the same UTC day
  const baseDate = new Date(Date.UTC(2025, 0, 15, 12, 0, 0)); // Jan 15 2025
  const snap1Date = new Date(baseDate.getTime() + 11 * 60 * 60 * 1000 + 59 * 60 * 1000); // 23:59
  const snap2Date = new Date(baseDate.getTime() - 11 * 60 * 60 * 1000); // 01:00

  await BenchmarkSnapshot.create({
    scraperName: "SSNAP_TZ",
    snapshotDate: snap1Date,
    percentileRanking: 50,
    successRate: 50,
    durationMs: 50,
    roiScore: 50,
    benchmarkStatus: "AVERAGE"
  });

  let duplicateCaught = false;
  try {
    await BenchmarkSnapshot.create({
      scraperName: "SSNAP_TZ",
      snapshotDate: snap2Date,
      percentileRanking: 60,
      successRate: 60,
      durationMs: 60,
      roiScore: 60,
      benchmarkStatus: "AVERAGE"
    });
  } catch (err) {
    if (err.code === 11000) {
      duplicateCaught = true;
    }
  }

  assert("DB_TZ_DUPLICATE: Timezone normalization enforces duplicate protection", duplicateCaught, "Should catch duplicate date due to UTC normalization");

  await new Promise(r => setTimeout(r, 1000));

  for (const type of ["SSNAP_FULL", "SSNAP_EMPTY", "SSNAP_MISSING_7D", "SSNAP_MISSING_30D"]) {
    const res1 = await httpRequest("GET", `/api/benchmark-snapshots?scraperName=${type}`);
    
    assert(`API_${type}: status 200`, res1.status === 200, `status=${res1.status}`);

    if (res1.status === 200) {
      const data = res1.data.data;
      if (type === "SSNAP_FULL") {
        assert(`SNAP_${type}: latest snapshot pulled`, data.current.percentileRanking === 100);
        assert(`SNAP_${type}: 7d history mapped`, data.changes.from7d.percentileRankingDelta === 10);
        assert(`SNAP_${type}: 30d history mapped`, data.changes.from30d.percentileRankingDelta === 20);
      } else if (type === "SSNAP_EMPTY") {
        assert(`SNAP_${type}: handles empty history gracefully`, data.snapshotDate === null);
      } else if (type === "SSNAP_MISSING_7D") {
        assert(`SNAP_${type}: handles missing 7d gracefully`, data.changes.from7d === null);
        assert(`SNAP_${type}: still maps 30d`, data.changes.from30d.percentileRankingDelta === 20);
      } else if (type === "SSNAP_MISSING_30D") {
        assert(`SNAP_${type}: handles missing 30d gracefully`, data.changes.from30d === null);
        assert(`SNAP_${type}: still maps 7d`, data.changes.from7d.percentileRankingDelta === 10);
      }
    }
  }

  // Cleanup
  await BenchmarkSnapshot.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(reportDir, "benchmark-snapshot-hardening-report.json"),
    JSON.stringify({ mockSnaps }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "benchmark-snapshot-hardening-verification.json"),
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
