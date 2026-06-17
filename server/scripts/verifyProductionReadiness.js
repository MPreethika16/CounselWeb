// server/scripts/verifyProductionReadiness.js
/**
 * Phase 2.13 – Production Readiness Verification
 * Validates all 10 success criteria and writes:
 *   reports/production-readiness-verification.json
 *   reports/production-readiness-report.json
 *
 * Exits 0 if all assertions pass; 1 otherwise.
 */
import mongoose from "mongoose";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const P95_THRESHOLD_MS = 500;

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function httpRequest(method, url, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Assertion runner ─────────────────────────────────────────────────────────
const results = [];
let failures = 0;

function assert(id, name, passed, detail = "") {
  const status = passed ? "PASS" : "FAIL";
  if (!passed) failures++;
  results.push({ id, name, status, detail });
  console.log(`  [${status}] ${id}: ${name}${detail ? " – " + detail : ""}`);
}

// ─── Test payloads ─────────────────────────────────────────────────────────────
const WEIGHT_PAYLOAD = {
  academicsWeight: 30,
  placementsWeight: 25,
  infrastructureWeight: 20,
  trustWeight: 15,
  affordabilityWeight: 5,
  locationWeight: 5,
};

// ─── Main verification ─────────────────────────────────────────────────────────
async function verify() {
  console.log("=== Phase 2.13 Production Readiness Verification ===\n");

  // ── 1. MongoDB indexes exist ───────────────────────────────────────────────
  console.log("1. Checking MongoDB indexes...");
  const REQUIRED_INDEX_NAMES = [
    "idx_ranking_overallScore",
    "idx_trustScore_score",
    "idx_collegeCode",
    "idx_district",
    "idx_academicStrength",
  ];
  try {
    await mongoose.connect(MONGO_URI);
    const existing = await mongoose.connection.db
      .collection("collegemasters")
      .listIndexes()
      .toArray();
    const existingNames = new Set(existing.map((i) => i.name));
    const missing = REQUIRED_INDEX_NAMES.filter((n) => !existingNames.has(n));
    assert(
      "INDEX_01",
      "All required indexes exist",
      missing.length === 0,
      missing.length > 0 ? `Missing: ${missing.join(", ")}` : `All ${REQUIRED_INDEX_NAMES.length} present`
    );
    await mongoose.disconnect();
  } catch (err) {
    assert("INDEX_01", "All required indexes exist", false, err.message);
  }

  // ── 2. Cache hit on repeated request ──────────────────────────────────────
  console.log("2. Checking cache hit/miss...");
  try {
    // First call – must be miss (no X-Cache header or miss)
    const r1 = await httpRequest("POST", `${BASE_URL}/api/match`, WEIGHT_PAYLOAD);
    // Second identical call – must be hit (cache populated)
    const r2 = await httpRequest("POST", `${BASE_URL}/api/match`, WEIGHT_PAYLOAD);
    const cacheStats = await httpRequest("GET", `${BASE_URL}/health/cache`);
    const hits = cacheStats.body?.cache?.hits ?? 0;
    assert("CACHE_02", "Cache returns hit on repeated identical request", hits >= 1,
      `hits=${hits}`);
    // Verify determinism: data must match (excluding generatedAt)
    const d1 = r1.body?.data?.map(c => c.collegeCode) ?? [];
    const d2 = r2.body?.data?.map(c => c.collegeCode) ?? [];
    assert("CACHE_02b", "Cached response is deterministic (same order)", JSON.stringify(d1) === JSON.stringify(d2),
      `first=${d1.slice(0,3)} second=${d2.slice(0,3)}`);
  } catch (err) {
    assert("CACHE_02", "Cache returns hit on repeated identical request", false, err.message);
    assert("CACHE_02b", "Cached response is deterministic", false, err.message);
  }

  // ── 3. Rate limiting returns 429 after exceeding limit ────────────────────
  console.log("3. Checking rate limiting...");
  try {
    const MAX = parseInt(process.env.RATE_LIMIT_MAX ?? "60", 10);
    let got429 = false;
    // Use a distinct payload (not cached) and hammer with more than MAX requests
    const uniquePayload = { academicsWeight: 99, placementsWeight: 1 };
    const requests = [];
    for (let i = 0; i <= MAX + 5; i++) {
      requests.push(httpRequest("POST", `${BASE_URL}/api/match`, uniquePayload));
    }
    const responses = await Promise.all(requests);
    got429 = responses.some((r) => r.status === 429);
    assert("RATE_03", "Rate limiter returns 429 after limit exceeded", got429,
      `Sent ${MAX + 6} requests. Got 429: ${got429}`);
  } catch (err) {
    assert("RATE_03", "Rate limiter returns 429 after limit exceeded", false, err.message);
  }

  // ── 4. Swagger UI is accessible ───────────────────────────────────────────
  console.log("4. Checking Swagger UI...");
  try {
    const r = await httpRequest("GET", `${BASE_URL}/api-docs.json`);
    const hasOpenApi = r.body?.openapi?.startsWith("3.");
    assert("SWAGGER_04", "Swagger JSON endpoint returns valid OpenAPI spec", r.status === 200 && hasOpenApi,
      `status=${r.status} openapi=${r.body?.openapi}`);
  } catch (err) {
    assert("SWAGGER_04", "Swagger JSON endpoint returns valid OpenAPI spec", false, err.message);
  }

  // ── 5. GET /health returns ok ─────────────────────────────────────────────
  console.log("5. Checking /health...");
  try {
    const r = await httpRequest("GET", `${BASE_URL}/health`);
    assert("HEALTH_05", "GET /health returns status ok", r.status === 200 && r.body?.status === "ok",
      `status=${r.status} body.status=${r.body?.status}`);
  } catch (err) {
    assert("HEALTH_05", "GET /health returns status ok", false, err.message);
  }

  // ── 6. GET /health/db returns connected ───────────────────────────────────
  console.log("6. Checking /health/db...");
  try {
    const r = await httpRequest("GET", `${BASE_URL}/health/db`);
    assert("HEALTH_06", "GET /health/db returns db connected", r.status === 200 && r.body?.status === "ok",
      `status=${r.status} dbState=${r.body?.dbState}`);
  } catch (err) {
    assert("HEALTH_06", "GET /health/db returns db connected", false, err.message);
  }

  // ── 7. GET /health/recommendation returns ok ──────────────────────────────
  console.log("7. Checking /health/recommendation...");
  try {
    const r = await httpRequest("GET", `${BASE_URL}/health/recommendation`);
    assert("HEALTH_07", "GET /health/recommendation returns ok", r.status === 200 && r.body?.status === "ok",
      `status=${r.status} matchCount=${r.body?.matchCount} latency=${r.body?.latencyMs}ms`);
  } catch (err) {
    assert("HEALTH_07", "GET /health/recommendation returns ok", false, err.message);
  }

  // ── 8. Performance report meets p95 threshold ─────────────────────────────
  console.log("8. Checking performance report...");
  const perfPath = path.resolve(__dirname, "../../reports/performance-report.json");
  if (existsSync(perfPath)) {
    const perf = JSON.parse(readFileSync(perfPath, "utf8"));
    const p95 = perf?.aggregate?.p95;
    assert("PERF_08", `p95 latency (${p95}ms) < ${P95_THRESHOLD_MS}ms`, p95 < P95_THRESHOLD_MS,
      `p95=${p95}ms threshold=${P95_THRESHOLD_MS}ms`);
  } else {
    assert("PERF_08", "Performance report exists", false,
      "Run 'node server/scripts/benchmarkQueries.js' first");
  }

  // ── 9. Sorting determinism (two calls, same order) ────────────────────────
  console.log("9. Checking deterministic sorting...");
  try {
    // Use a fresh payload different from rate-limit test to avoid 429
    const detPayload = { academicsWeight: 40, placementsWeight: 60 };
    const ra = await httpRequest("POST", `${BASE_URL}/api/match`, detPayload);
    const rb = await httpRequest("POST", `${BASE_URL}/api/match`, detPayload);
    const codesA = (ra.body?.data ?? []).map((c) => c.collegeCode).join(",");
    const codesB = (rb.body?.data ?? []).map((c) => c.collegeCode).join(",");
    assert("SORT_09", "Sorting is deterministic across two identical calls", codesA === codesB,
      `firstLen=${ra.body?.data?.length} secondLen=${rb.body?.data?.length}`);
  } catch (err) {
    assert("SORT_09", "Sorting is deterministic across two identical calls", false, err.message);
  }

  // ── 10. Warning uniqueness in response ────────────────────────────────────
  console.log("10. Checking warning uniqueness...");
  try {
    const r = await httpRequest("POST", `${BASE_URL}/api/match`, WEIGHT_PAYLOAD);
    const items = r.body?.data ?? [];
    let allUnique = true;
    let detail = "";
    for (const item of items) {
      const warnings = item.warnings ?? [];
      const unique = new Set(warnings);
      if (unique.size !== warnings.length) {
        allUnique = false;
        detail = `collegeCode=${item.collegeCode} has duplicate warnings`;
        break;
      }
    }
    assert("WARN_10", "All warnings arrays contain only unique values", allUnique,
      allUnique ? `Checked ${items.length} items` : detail);
  } catch (err) {
    assert("WARN_10", "All warnings arrays contain only unique values", false, err.message);
  }

  // ─── Write reports ────────────────────────────────────────────────────────
  const reportDir = path.resolve(__dirname, "../../reports");
  mkdirSync(reportDir, { recursive: true });

  const verification = {
    generatedAt: new Date().toISOString(),
    totalAssertions: results.length,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: failures,
    results,
  };
  writeFileSync(
    path.join(reportDir, "production-readiness-verification.json"),
    JSON.stringify(verification, null, 2)
  );

  // Aggregate report
  const subReports = {};
  for (const name of ["index-report.json", "performance-report.json", "load-test-report.json"]) {
    const p = path.join(reportDir, name);
    if (existsSync(p)) {
      subReports[name] = JSON.parse(readFileSync(p, "utf8"));
    }
  }
  const fullReport = {
    generatedAt: new Date().toISOString(),
    phase: "2.13",
    verification,
    ...subReports,
  };
  writeFileSync(
    path.join(reportDir, "production-readiness-report.json"),
    JSON.stringify(fullReport, null, 2)
  );

  console.log("\n=== Summary ===");
  console.log(`Total:  ${results.length}`);
  console.log(`Passed: ${verification.passed}`);
  console.log(`Failed: ${failures}`);
  console.log(`Reports written to: ${reportDir}`);

  process.exit(failures > 0 ? 1 : 0);
}

verify().catch((err) => {
  console.error("Fatal verification error:", err.message);
  process.exit(1);
});
