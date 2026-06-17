// server/scripts/verifyMonitoring.js
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function httpRequest(method, urlPath, body = null) {
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
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
      });
    });
    
    req.on("error", (err) => {
      resolve({ status: 500, error: err.message });
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verify() {
  console.log("=== Phase 2.14 Monitoring Verification ===");
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

  // 1. Health endpoint works
  const healthRes = await httpRequest("GET", "/health");
  assert("HEALTH_01: GET /health returns 200 ok", healthRes.status === 200, `status=${healthRes.status}`);

  // 2. Send valid request to /api/match
  console.log("\nSending valid request...");
  await httpRequest("POST", "/api/match", { academicsWeight: 100 });

  // 3. Send invalid request to /api/match (triggers 400 error)
  console.log("Sending invalid request...");
  await httpRequest("POST", "/api/match", { invalidWeight: "not-a-number" });

  // 4. Trigger rate limit (default max is 60, we'll send 65)
  console.log("Triggering rate limit (sending 65 requests)...");
  const promises = [];
  for (let i = 0; i < 65; i++) {
    promises.push(httpRequest("POST", "/api/match", { academicsWeight: 100 }));
  }
  const rlResults = await Promise.all(promises);
  const hasRateLimit = rlResults.some(r => r.status === 429);
  assert("RATE_01: Triggered 429 Too Many Requests", hasRateLimit, "At least one request returned 429");

  // Allow time for async logging hooks to complete
  await new Promise(r => setTimeout(r, 1000));

  // 5. Fetch metrics
  const metricsRes = await httpRequest("GET", "/api/metrics");
  assert("METRICS_01: /api/metrics returns 200 JSON", metricsRes.status === 200, `status=${metricsRes.status}`);

  const metrics = metricsRes.data;
  console.log("\nMetrics Output:");
  console.log(JSON.stringify(metrics, null, 2));

  // Assertions
  assert("METRICS_02: requests.total is collected and > 0", metrics.requests?.total > 0, `total=${metrics.requests?.total}`);
  assert("METRICS_03: requests.errors tracking works", metrics.requests?.errors > 0, `errors=${metrics.requests?.errors}`);
  assert("METRICS_04: rateLimitViolations tracking works", metrics.requests?.rateLimitViolations > 0, `rateLimitViolations=${metrics.requests?.rateLimitViolations}`);
  assert("METRICS_05: latency.p95 is reported", typeof metrics.latency?.p95 === "number" && metrics.latency?.p95 > 0, `p95=${metrics.latency?.p95}ms`);

  // Save reports
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(path.join(reportDir, "metrics-report.json"), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(reportDir, "metrics-verification.json"), JSON.stringify(report, null, 2));

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
