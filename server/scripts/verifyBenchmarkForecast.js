// server/scripts/verifyBenchmarkForecast.js
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
  console.log("=== Phase 2.36A Benchmark Forecast Polish Verification ===");
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

  const mockTypes = ["FCST_OUTLIER", "FCST_STALE", "FCST_BOUNDS", "FCST_EMA", "FCST_NEG_CONF"];
  await BenchmarkSnapshot.deleteMany({ scraperName: { $in: mockTypes } });

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  let mockSnaps = [];

  // FCST_OUTLIER: 5 days of normal data, but day 3 has a crazy outlier
  const outlierBase = [
    { percentileRanking: 50, successRate: 50, durationMs: 500, roiScore: 50 },
    { percentileRanking: 51, successRate: 51, durationMs: 490, roiScore: 51 },
    { percentileRanking: 99, successRate: 99, durationMs: 10, roiScore: 99 }, // Outlier
    { percentileRanking: 53, successRate: 53, durationMs: 470, roiScore: 53 },
    { percentileRanking: 54, successRate: 54, durationMs: 460, roiScore: 54 },
  ];
  outlierBase.forEach((val, i) => {
    mockSnaps.push({
      scraperName: "FCST_OUTLIER",
      snapshotDate: new Date(now.getTime() - (4 - i) * dayMs),
      ...val,
      benchmarkStatus: "AVERAGE"
    });
  });

  // FCST_STALE: 5 days of data, but the latest is 10 days old
  const staleBase = [
    { percentileRanking: 50, successRate: 50, durationMs: 500, roiScore: 50 },
    { percentileRanking: 51, successRate: 51, durationMs: 490, roiScore: 51 },
    { percentileRanking: 52, successRate: 52, durationMs: 480, roiScore: 52 },
    { percentileRanking: 53, successRate: 53, durationMs: 470, roiScore: 53 },
    { percentileRanking: 54, successRate: 54, durationMs: 460, roiScore: 54 },
  ];
  staleBase.forEach((val, i) => {
    mockSnaps.push({
      scraperName: "FCST_STALE",
      snapshotDate: new Date(now.getTime() - (14 - i) * dayMs), // Ends 10 days ago
      ...val,
      benchmarkStatus: "AVERAGE"
    });
  });

  // FCST_BOUNDS: Extreme upward trend that would normally exceed 100
  const boundsBase = [
    { percentileRanking: 80, successRate: 80, durationMs: 500, roiScore: 80 },
    { percentileRanking: 85, successRate: 85, durationMs: 400, roiScore: 85 },
    { percentileRanking: 90, successRate: 90, durationMs: 300, roiScore: 90 },
    { percentileRanking: 95, successRate: 95, durationMs: 200, roiScore: 95 },
  ];
  boundsBase.forEach((val, i) => {
    mockSnaps.push({
      scraperName: "FCST_BOUNDS",
      snapshotDate: new Date(now.getTime() - (3 - i) * dayMs),
      ...val,
      benchmarkStatus: "AVERAGE"
    });
  });

  // FCST_EMA: 10 days of slow growth, then acceleration, but kept low to avoid 100 cap
  const emaBase = [
    { percentileRanking: 2, successRate: 2, durationMs: 1000, roiScore: 2 },
    { percentileRanking: 3, successRate: 3, durationMs: 990, roiScore: 3 },
    { percentileRanking: 4, successRate: 4, durationMs: 980, roiScore: 4 },
    { percentileRanking: 5, successRate: 5, durationMs: 970, roiScore: 5 },
    { percentileRanking: 6, successRate: 6, durationMs: 960, roiScore: 6 },
    { percentileRanking: 10, successRate: 10, durationMs: 800, roiScore: 10 },
    { percentileRanking: 15, successRate: 15, durationMs: 600, roiScore: 15 },
    { percentileRanking: 20, successRate: 20, durationMs: 400, roiScore: 20 },
  ];
  emaBase.forEach((val, i) => {
    mockSnaps.push({
      scraperName: "FCST_EMA",
      snapshotDate: new Date(now.getTime() - (7 - i) * dayMs),
      ...val,
      benchmarkStatus: "AVERAGE"
    });
  });

  // FCST_NEG_CONF: 3 data points but latest snapshot is 30 days old → decay = 29*5 = 145% > base
  const negConfBase = [
    { percentileRanking: 50, successRate: 50, durationMs: 500, roiScore: 50 },
    { percentileRanking: 51, successRate: 51, durationMs: 490, roiScore: 51 },
    { percentileRanking: 52, successRate: 52, durationMs: 480, roiScore: 52 },
  ];
  negConfBase.forEach((val, i) => {
    mockSnaps.push({
      scraperName: "FCST_NEG_CONF",
      snapshotDate: new Date(now.getTime() - (32 - i) * dayMs), // latest is 30 days ago
      ...val,
      benchmarkStatus: "AVERAGE"
    });
  });

  for (const snap of mockSnaps) {
    await BenchmarkSnapshot.create(snap);
  }

  await new Promise(r => setTimeout(r, 1000));

  for (const type of mockTypes) {
    const resLinear = await httpRequest("GET", `/api/benchmark-forecast?scraperName=${type}`);
    const resEma    = await httpRequest("GET", `/api/benchmark-forecast?scraperName=${type}&useEma=true`);

    assert(`API_${type}: status 200`, resLinear.status === 200, `status=${resLinear.status}`);

    if (resLinear.status === 200) {
      const { data: linear } = resLinear.data;
      const { data: ema }    = resEma.data;

      // ── Scenario-specific assertions ──────────────────────────────────────
      if (type === "FCST_OUTLIER") {
        assert(`FCST_${type}: Outlier filtered linearly`,
          linear.forecast7d.successRate > 55 && linear.forecast7d.successRate < 65);

      } else if (type === "FCST_STALE") {
        assert(`FCST_${type}: Confidence decayed for stale data`, linear.confidenceScore < 10);

      } else if (type === "FCST_BOUNDS") {
        assert(`FCST_${type}: Forecast strictly bounded <= 100`, linear.forecast30d.successRate === 100);
        assert(`FCST_${type}: Duration strictly bounded >= 0`,   linear.forecast30d.durationMs  === 0);

      } else if (type === "FCST_EMA") {
        assert(`FCST_${type}: EMA responds faster to recent acceleration`,
          ema.forecast7d.successRate > linear.forecast7d.successRate);
        assert(`FCST_${type}: Deterministic distinct algorithms`,
          ema.isEma === true && linear.isEma === false);

      } else if (type === "FCST_NEG_CONF") {
        // 3 pts / 30 max = 10% base. Decay = 29 days * 5 = 145. Net = 10 - 145 = -135 → clamped to 0.
        assert(`FCST_${type}: Negative confidence prevented (clamped to 0)`,
          linear.confidenceScore === 0,
          `got ${linear.confidenceScore}`);
      }

      // ── Metadata accuracy assertions (all OK scenarios) ───────────────────
      if (linear.status === "OK") {
        assert(`META_${type}: forecastMethod is 'linear'`,
          linear.forecastMethod === "linear",
          `got '${linear.forecastMethod}'`);
        assert(`META_${type}: EMA forecastMethod is 'ema'`,
          ema.forecastMethod === "ema",
          `got '${ema.forecastMethod}'`);
        assert(`META_${type}: dataPointsUsed is a positive integer`,
          Number.isInteger(linear.dataPointsUsed) && linear.dataPointsUsed > 0,
          `got ${linear.dataPointsUsed}`);
        assert(`META_${type}: outliersRemoved is a non-negative integer`,
          Number.isInteger(linear.outliersRemoved) && linear.outliersRemoved >= 0,
          `got ${linear.outliersRemoved}`);
        assert(`META_${type}: confidenceScore is within [0, 100]`,
          linear.confidenceScore >= 0 && linear.confidenceScore <= 100,
          `got ${linear.confidenceScore}`);
      }

      // ── Outlier count sanity ──────────────────────────────────────────────
      if (type === "FCST_OUTLIER" && linear.status === "OK") {
        assert(`META_${type}: outliersRemoved > 0 for spiked dataset`,
          linear.outliersRemoved > 0,
          `got ${linear.outliersRemoved}`);
      }
    }
  }

  // Cleanup
  await BenchmarkSnapshot.deleteMany({ scraperName: { $in: mockTypes } });
  await mongoose.disconnect();

  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(reportDir, "benchmark-forecast-hardening-report.json"),
    JSON.stringify({ generated: new Date().toISOString(), mockSnaps }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "benchmark-forecast-hardening-verification.json"),
    JSON.stringify({ generated: new Date().toISOString(), ...report }, null, 2)
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
