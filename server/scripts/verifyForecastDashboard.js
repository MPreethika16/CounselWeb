// server/scripts/verifyForecastDashboard.js
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
const PORT      = process.env.PORT || 5000;
const BASE_URL  = `http://localhost:${PORT}`;

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function httpRequest(urlPath) {
  return new Promise((resolve) => {
    const parsed  = new URL(BASE_URL + urlPath);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port,
      path:     parsed.pathname + parsed.search,
      method:   "GET",
      headers:  { "Content-Type": "application/json" },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
    req.on("error", (err) => resolve({ status: 500, error: err.message }));
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function verify() {
  console.log("=== Phase 2.37 Forecast Dashboard Verification ===");
  const report = { tests: [], summary: { passed: 0, failed: 0 } };

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      report.tests.push({ name, status: "pass", details: String(details) });
      report.summary.passed++;
    } else {
      console.error(`  [FAIL] ${name} — ${details}`);
      report.tests.push({ name, status: "fail", details: String(details) });
      report.summary.failed++;
    }
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // ─── Seed data ─────────────────────────────────────────────────────────────
  // Prefix all test scrapers so cleanup is easy
  const PREFIX  = "DASH_";
  const scrapers = {
    IMP_A: "DASH_IMP_A",  // IMPROVING, high confidence
    IMP_B: "DASH_IMP_B",  // IMPROVING, medium confidence
    IMP_C: "DASH_IMP_C",  // IMPROVING, low confidence
    DEC_A: "DASH_DEC_A",  // DECLINING, high confidence
    DEC_B: "DASH_DEC_B",  // DECLINING, low confidence
    FLAT:  "DASH_FLAT",   // STABLE
    FLAT2: "DASH_FLAT2",  // STABLE
    INSUF: "DASH_INSUF",  // INSUFFICIENT_HISTORY (only 2 points)
  };

  await BenchmarkSnapshot.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });

  const now    = new Date();
  const dayMs  = 24 * 60 * 60 * 1000;
  const mockSnaps = [];

  /** Helper: create N daily snapshots with a fixed delta per metric */
  function makeSeries(scraperName, days, start, delta) {
    return Array.from({ length: days }).map((_, i) => ({
      scraperName,
      snapshotDate:      new Date(now.getTime() - (days - 1 - i) * dayMs),
      percentileRanking: start.p + delta.p * i,
      successRate:       start.s + delta.s * i,
      durationMs:        start.d + delta.d * i,
      roiScore:          start.r + delta.r * i,
      benchmarkStatus:   "AVERAGE",
    }));
  }

  // IMPROVING scrapers — successRate rising > 0.1/day
  mockSnaps.push(...makeSeries(scrapers.IMP_A, 20, { p:50, s:50, d:500, r:50 }, { p:1,  s:1,  d:-5,  r:1  })); // 20pts → high conf
  mockSnaps.push(...makeSeries(scrapers.IMP_B, 10, { p:40, s:40, d:600, r:40 }, { p:1,  s:1,  d:-5,  r:1  })); // 10pts → medium conf
  mockSnaps.push(...makeSeries(scrapers.IMP_C, 5,  { p:30, s:30, d:700, r:30 }, { p:1,  s:1,  d:-5,  r:1  })); // 5pts  → low conf

  // DECLINING scrapers — successRate falling
  mockSnaps.push(...makeSeries(scrapers.DEC_A, 15, { p:80, s:80, d:200, r:80 }, { p:-1, s:-1, d:5,   r:-1 })); // 15pts → higher conf
  mockSnaps.push(...makeSeries(scrapers.DEC_B, 5,  { p:70, s:70, d:300, r:70 }, { p:-1, s:-1, d:5,   r:-1 })); // 5pts  → lower conf

  // STABLE scrapers — no change
  mockSnaps.push(...makeSeries(scrapers.FLAT,  8,  { p:60, s:60, d:400, r:60 }, { p:0,  s:0,  d:0,   r:0  }));
  mockSnaps.push(...makeSeries(scrapers.FLAT2, 6,  { p:55, s:55, d:420, r:55 }, { p:0,  s:0,  d:0,   r:0  }));

  // INSUFFICIENT — only 2 points (below minHistoryPoints = 3)
  mockSnaps.push(...makeSeries(scrapers.INSUF, 2,  { p:50, s:50, d:500, r:50 }, { p:1,  s:1,  d:-5,  r:1  }));

  for (const snap of mockSnaps) {
    await BenchmarkSnapshot.create(snap);
  }

  // Allow server to see the new data
  await new Promise(r => setTimeout(r, 1000));

  // ─── Tests ─────────────────────────────────────────────────────────────────
  const res1 = await httpRequest("/api/forecast-dashboard");
  const res2 = await httpRequest("/api/forecast-dashboard");  // determinism check

  assert("API: status 200", res1.status === 200, `got ${res1.status}`);

  if (res1.status !== 200) {
    console.error("Fatal — API returned non-200. Aborting further assertions.");
  } else {
    const d1 = res1.body.data;
    const d2 = res2.body.data;

    // ── Shape ────────────────────────────────────────────────────────────────
    assert("SHAPE: topImproving is array",      Array.isArray(d1.topImproving));
    assert("SHAPE: topDeclining is array",      Array.isArray(d1.topDeclining));
    assert("SHAPE: highestConfidence is array", Array.isArray(d1.highestConfidence));
    assert("SHAPE: lowestConfidence is array",  Array.isArray(d1.lowestConfidence));
    assert("SHAPE: summaryStats present",       typeof d1.summaryStats === "object");

    // ── summaryStats ─────────────────────────────────────────────────────────
    const ss = d1.summaryStats;
    assert("STATS: totalScrapers >= 8",         ss.totalScrapers >= 8, `got ${ss.totalScrapers}`);
    assert("STATS: improving >= 3",             ss.improving >= 3,     `got ${ss.improving}`);
    assert("STATS: declining >= 2",             ss.declining >= 2,     `got ${ss.declining}`);
    assert("STATS: stable >= 2",                ss.stable >= 2,        `got ${ss.stable}`);
    assert("STATS: insufficientHistory >= 1",   ss.insufficientHistory >= 1, `got ${ss.insufficientHistory}`);
    assert("STATS: avgConfidence in [0,100]",
      ss.avgConfidence >= 0 && ss.avgConfidence <= 100, `got ${ss.avgConfidence}`);

    // ── Correct members in topImproving ──────────────────────────────────────
    const improvingNames = d1.topImproving.map(f => f.scraperName);
    assert("IMPROVING: IMP_A present",  improvingNames.includes(scrapers.IMP_A));
    assert("IMPROVING: IMP_B present",  improvingNames.includes(scrapers.IMP_B));
    assert("IMPROVING: IMP_C present",  improvingNames.includes(scrapers.IMP_C));
    assert("IMPROVING: all have prediction=IMPROVING",
      d1.topImproving.every(f => f.prediction === "IMPROVING"));

    // ── Correct members in topDeclining ──────────────────────────────────────
    const decliningNames = d1.topDeclining.map(f => f.scraperName);
    assert("DECLINING: DEC_A present",  decliningNames.includes(scrapers.DEC_A));
    assert("DECLINING: DEC_B present",  decliningNames.includes(scrapers.DEC_B));
    assert("DECLINING: all have prediction=DECLINING",
      d1.topDeclining.every(f => f.prediction === "DECLINING"));

    // ── Deterministic sort: topImproving should be IMP_A (most pts → highest conf) first ──
    if (d1.topImproving.length >= 2) {
      assert("SORT: topImproving[0] has highest confidence",
        d1.topImproving[0].confidenceScore >= d1.topImproving[1].confidenceScore,
        `[0]=${d1.topImproving[0].confidenceScore} vs [1]=${d1.topImproving[1].confidenceScore}`);
    }

    if (d1.topDeclining.length >= 2) {
      assert("SORT: topDeclining[0] has highest confidence",
        d1.topDeclining[0].confidenceScore >= d1.topDeclining[1].confidenceScore,
        `[0]=${d1.topDeclining[0].confidenceScore} vs [1]=${d1.topDeclining[1].confidenceScore}`);
    }

    // ── highestConfidence is sorted DESC ─────────────────────────────────────
    for (let i = 0; i < d1.highestConfidence.length - 1; i++) {
      const a = d1.highestConfidence[i], b = d1.highestConfidence[i + 1];
      assert(`SORT: highestConf[${i}] >= highestConf[${i+1}]`,
        a.confidenceScore >= b.confidenceScore ||
        (a.confidenceScore === b.confidenceScore && a.scraperName.localeCompare(b.scraperName) <= 0),
        `${a.scraperName}(${a.confidenceScore}) vs ${b.scraperName}(${b.confidenceScore})`);
    }

    // ── lowestConfidence is sorted ASC ───────────────────────────────────────
    for (let i = 0; i < d1.lowestConfidence.length - 1; i++) {
      const a = d1.lowestConfidence[i], b = d1.lowestConfidence[i + 1];
      assert(`SORT: lowestConf[${i}] <= lowestConf[${i+1}]`,
        a.confidenceScore <= b.confidenceScore ||
        (a.confidenceScore === b.confidenceScore && a.scraperName.localeCompare(b.scraperName) <= 0),
        `${a.scraperName}(${a.confidenceScore}) vs ${b.scraperName}(${b.confidenceScore})`);
    }

    // ── Metadata fields present on each entry ─────────────────────────────────
    const allEntries = [
      ...d1.topImproving,
      ...d1.topDeclining,
      ...d1.highestConfidence,
    ];
    assert("META: forecastMethod present on all entries",
      allEntries.every(f => ["linear", "ema"].includes(f.forecastMethod)),
      `failing: ${allEntries.filter(f => !["linear","ema"].includes(f.forecastMethod)).map(f=>f.scraperName).join(",")}`);
    assert("META: dataPointsUsed is positive int on all entries",
      allEntries.every(f => Number.isInteger(f.dataPointsUsed) && f.dataPointsUsed > 0));
    assert("META: outliersRemoved is non-negative int on all entries",
      allEntries.every(f => Number.isInteger(f.outliersRemoved) && f.outliersRemoved >= 0));

    // ── Determinism ───────────────────────────────────────────────────────────
    assert("DET: two identical calls produce identical output",
      JSON.stringify(d1) === JSON.stringify(d2));

    // ── limit param ──────────────────────────────────────────────────────────
    const resLim = await httpRequest("/api/forecast-dashboard?limit=2");
    if (resLim.status === 200) {
      const dl = resLim.body.data;
      assert("LIMIT: topImproving capped at 2",  dl.topImproving.length  <= 2);
      assert("LIMIT: topDeclining capped at 2",  dl.topDeclining.length  <= 2);
      assert("LIMIT: highestConf capped at 2",   dl.highestConfidence.length <= 2);
      assert("LIMIT: lowestConf capped at 2",    dl.lowestConfidence.length  <= 2);
    }

    // ── EMA flag propagated ───────────────────────────────────────────────────
    const resEma = await httpRequest("/api/forecast-dashboard?useEma=true");
    if (resEma.status === 200) {
      const de = resEma.body.data;
      assert("EMA: forecastMethod is 'ema' for all entries",
        [...de.topImproving, ...de.topDeclining].every(f => f.forecastMethod === "ema"));
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  await BenchmarkSnapshot.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });
  await mongoose.disconnect();

  // ─── Reports ──────────────────────────────────────────────────────────────
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportDir, "forecast-dashboard-report.json"),
    JSON.stringify({ generated: new Date().toISOString(), mockSnaps }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "forecast-dashboard-verification.json"),
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
