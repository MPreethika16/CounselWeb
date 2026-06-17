// server/scripts/loadTest.js
/**
 * Phase 2.13 – Load Testing Script
 * Simulates 100, 500, and 1000 concurrent users.
 * Generates reports/load-test-report.json.
 */
import http from "http";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function generateRandomPayload() {
  const academicsWeight = Math.floor(Math.random() * 40) + 10;
  const placementsWeight = Math.floor(Math.random() * 30) + 10;
  const infrastructureWeight = Math.floor(Math.random() * 20) + 10;
  const trustWeight = 10;
  const affordabilityWeight = 5;
  const locationWeight = 5;
  return {
    academicsWeight,
    placementsWeight,
    infrastructureWeight,
    trustWeight,
    affordabilityWeight,
    locationWeight,
  };
}

function httpRequest(method, url, body = null) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method,
      headers: { "Content-Type": "application/json" },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        resolve({ status: res.statusCode, latencyMs });
      });
    });
    req.on("error", (err) => {
      const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      resolve({ status: 500, error: err.message, latencyMs });
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function percentile(sortedArr, p) {
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

async function runLoadTestForConcurrency(concurrency) {
  console.log(`Running load test with ${concurrency} concurrent requests...`);
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    const payload = generateRandomPayload();
    // Use query parameters to prevent caching if needed, or unique payloads
    // To ensure cache is bypassed and we hit DB, we pass a random query parameter
    promises.push(httpRequest("POST", `${BASE_URL}/api/match?random=${Math.random()}`, payload));
  }

  const start = process.hrtime.bigint();
  const results = await Promise.all(promises);
  const totalDurationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const successCount = results.filter((r) => r.status === 200).length;
  const failureCount = results.length - successCount;

  const stats = {
    concurrency,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    successCount,
    failureCount,
    avg: Math.round(avg * 100) / 100,
    min: Math.round(latencies[0] * 100) / 100,
    max: Math.round(latencies[latencies.length - 1] * 100) / 100,
    p50: Math.round(percentile(latencies, 50) * 100) / 100,
    p95: Math.round(percentile(latencies, 95) * 100) / 100,
    p99: Math.round(percentile(latencies, 99) * 100) / 100,
  };

  console.log(`Finished ${concurrency} concurrent requests.`);
  console.log(`  Success: ${successCount}, Failures: ${failureCount}`);
  console.log(`  Latency: avg=${stats.avg}ms p95=${stats.p95}ms p99=${stats.p99}ms`);
  return stats;
}

async function main() {
  const concurrencies = [100, 500, 1000];
  const results = [];

  for (const c of concurrencies) {
    const res = await runLoadTestForConcurrency(c);
    results.push(res);
    // Cool down between runs
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    tests: results,
  };

  const reportDir = path.resolve(__dirname, "../../reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "load-test-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nLoad test report written to: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
