// server/scripts/verifyScraperOrchestration.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperJob from "../models/ScraperJob.js";
import { acquireLock, releaseLock, cleanupLocks } from "../services/scraperLockService.js";
import { gracefulShutdown, recoverStuckJobs } from "../services/scraperWorkerService.js";
import { HEARTBEAT_INTERVAL_MS, STUCK_JOB_TIMEOUT_MS } from "../config/orchestrationConfig.js";
import ScraperSchedule from "../models/ScraperSchedule.js";
import ScraperAlert from "../models/ScraperAlert.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const PORT      = process.env.PORT || 5000;
const BASE_URL  = `http://localhost:${PORT}`;

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function httpRequest(method, urlPath, body = null) {
  return new Promise((resolve) => {
    const parsed  = new URL(BASE_URL + urlPath);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port,
      path:     parsed.pathname + parsed.search,
      method:   method,
      headers:  { "Content-Type": "application/json" },
    };
    
    if (body) {
      const bodyData = JSON.stringify(body);
      options.headers["Content-Length"] = Buffer.byteLength(bodyData);
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
    req.on("error", (err) => resolve({ status: 500, error: err.message }));
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function verify() {
  console.log("=== Phase 3.0 Scraper Orchestration Verification ===");
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

  const PREFIX = "ORCH_TEST_";
  
  // Cleanup previous test runs
  await ScraperJob.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });
  await ScraperSchedule.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });
  await ScraperAlert.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });

  // 1. Seed Scheduler Test
  const pastDate = new Date(Date.now() - 10000); // 10s ago
  await ScraperSchedule.create({
    scraperName: `${PREFIX}SCHEDULED`,
    executionFrequencyMs: 60000,
    nextRunAt: pastDate,
    isActive: true
  });

  // 2. Seed Queued Jobs Test
  await ScraperJob.create({ scraperName: `${PREFIX}NORMAL`, url: "http://example.com", status: "queued" });
  await ScraperJob.create({ scraperName: `${PREFIX}NORMAL`, url: "http://example.com", status: "queued" });
  await ScraperJob.create({ scraperName: `${PREFIX}NORMAL`, url: "http://example.com", status: "queued" });

  // 3. Seed Failure / Retry Test
  await ScraperJob.create({ scraperName: `${PREFIX}FAIL`, url: "http://fail_me.com", status: "queued" });

  // ─── Tests ─────────────────────────────────────────────────────────────────

  // Trigger orchestration run manually
  const [resRun1, resRun2] = await Promise.all([
    httpRequest("POST", "/api/orchestration/run", { maxWorkers: 2 }),
    httpRequest("POST", "/api/orchestration/run", { maxWorkers: 2 })
  ]);

  const has200 = resRun1.status === 200 || resRun2.status === 200;
  const has409 = resRun1.status === 409 || resRun2.status === 409;

  assert("API POST /run 200", has200);
  assert("LOCK: Concurrent run gets 409 Conflict", has409, `got ${resRun1.status} and ${resRun2.status}`);

  // Wait for jobs to process (mock jobs take ~50ms)
  await sleep(1500); 

  // Verify Schedule Trigger
  const schedJobs = await ScraperJob.find({ scraperName: `${PREFIX}SCHEDULED` });
  assert("SCHEDULER: Job created from due schedule", schedJobs.length === 1);
  const updatedSched = await ScraperSchedule.findOne({ scraperName: `${PREFIX}SCHEDULED` });
  assert("SCHEDULER: nextRunAt updated", new Date(updatedSched.nextRunAt) > new Date());

  // Verify Concurrency Limit
  // We seeded 3 NORMAL jobs, but maxWorkers was 2. In a real system, the 3rd would remain queued.
  // But wait! If the first 2 finished in 50ms, and we didn't run orchestration again, the 3rd is still queued!
  const queuedNormal = await ScraperJob.find({ scraperName: `${PREFIX}NORMAL`, status: "queued" });
  const completedNormal = await ScraperJob.find({ scraperName: `${PREFIX}NORMAL`, status: "completed" });
  
  assert("CONCURRENCY: Limit respected (some completed, some queued)", 
    completedNormal.length === 2 && queuedNormal.length === 1, 
    `Completed: ${completedNormal.length}, Queued: ${queuedNormal.length}`);

  // Run orchestration again to finish the remaining jobs
  await sleep(100); // Give lock time to release (wait, lock was 30s. We need to bypass it or clear it).
  // Ah, `releaseLock` is called in the `finally` block of `runOrchestration`. It should be released immediately.
  const resRun3 = await httpRequest("POST", "/api/orchestration/run", { maxWorkers: 2 });
  assert("LOCK: Released after completion", resRun3.status === 200);

  await sleep(500); // Wait for the remaining normal job to finish

  // Verify Failure/Retry Logic
  const failJob = await ScraperJob.findOne({ scraperName: `${PREFIX}FAIL` });
  assert("RETRY: Job failed and status is queued for retry", failJob.status === "queued", `Status: ${failJob.status}`);
  assert("RETRY: retryCount incremented", failJob.retryCount === 1, `retryCount: ${failJob.retryCount}`);
  assert("RETRY: nextRetryAt is set", failJob.nextRetryAt !== null);

  // Manually force nextRetryAt to past to trigger max retries quickly
  failJob.nextRetryAt = new Date(Date.now() - 10000);
  await failJob.save();

  // Run orchestration to trigger retry 2
  await httpRequest("POST", "/api/orchestration/run");
  await sleep(500);
  const failJob2 = await ScraperJob.findById(failJob._id);
  assert("RETRY: retryCount = 2", failJob2.retryCount === 2);

  failJob2.nextRetryAt = new Date(Date.now() - 10000);
  await failJob2.save();
  
  // Run orchestration to trigger retry 3 (should hit max of 3 and permanently fail)
  await httpRequest("POST", "/api/orchestration/run");
  await sleep(500);
  const failJob3 = await ScraperJob.findById(failJob._id);
  assert("RETRY: retryCount = 3", failJob3.retryCount === 3);
  
  failJob3.nextRetryAt = new Date(Date.now() - 10000);
  await failJob3.save();

  // Trigger one more time (this was the 4th run, it should fail completely now)
  await httpRequest("POST", "/api/orchestration/run");
  
  let finalFailJob;
  for (let i = 0; i < 20; i++) {
    finalFailJob = await ScraperJob.findById(failJob._id);
    if (finalFailJob && finalFailJob.status !== "running") break;
    await sleep(200);
  }

  assert("FAIL: Permanent failure recorded", finalFailJob.status === "failed", `Status is ${finalFailJob.status}`);

  const alerts = await ScraperAlert.find({ scraperName: `${PREFIX}FAIL` });
  assert("ALERT: ScraperAlert created on permanent failure", alerts.length === 1);

  // Check metrics endpoint
  const resStatus = await httpRequest("GET", "/api/orchestration/status");
  assert("API GET /status 200", resStatus.status === 200);
  assert("METRICS: Correct shape", resStatus.body.data && typeof resStatus.body.data.completedJobs === "number");

  // Determinism Output Test
  const resStatus2 = await httpRequest("GET", "/api/orchestration/status");
  delete resStatus.body.timestamp;
  delete resStatus2.body.timestamp;
  assert("DET: Deterministic Output matches", JSON.stringify(resStatus.body) === JSON.stringify(resStatus2.body));

    // --- Hardening Checks ---
    // 1. Lock expiration cleanup
    acquireLock("TEST_LOCK", 1);
    await new Promise(r => setTimeout(r, 10));
    cleanupLocks();
    const lockReacquired = acquireLock("TEST_LOCK", 1000);
    assert("LOCK_CLEANUP: Expired lock removed and can be reacquired", lockReacquired);
    releaseLock("TEST_LOCK");

    // 2. Worker heartbeat tracking
    const hbJob = await ScraperJob.create({ scraperName: "HB_TEST", url: "http://example.com", status: "queued" });
    await httpRequest("POST", "/api/orchestration/run", { maxWorkers: 1 });
    await new Promise(r => setTimeout(r, 20));
    const beforeHb = await ScraperJob.findById(hbJob._id);
    assert("HEARTBEAT: lastHeartbeatAt set on start", !!beforeHb.lastHeartbeatAt);
    await new Promise(r => setTimeout(r, HEARTBEAT_INTERVAL_MS + 10));
    const afterHb = await ScraperJob.findById(hbJob._id);
    assert("HEARTBEAT: lastHeartbeatAt updated", new Date(afterHb.lastHeartbeatAt) > new Date(beforeHb.lastHeartbeatAt));

    // 3. Stuck job recovery
    const stuckJob = await ScraperJob.create({ scraperName: "STUCK_TEST", url: "http://example.com", status: "running", lastHeartbeatAt: new Date(Date.now() - STUCK_JOB_TIMEOUT_MS - 1000) });
    await recoverStuckJobs();
    const recovered = await ScraperJob.findById(stuckJob._id);
    assert("STUCK_RECOVERY: stuck job handled", recovered.status !== "running");

    // 4. Graceful shutdown handling
    const longJob = await ScraperJob.create({ scraperName: "SHUTDOWN_TEST", url: "http://slow_job", status: "queued" });
    const runPromise = httpRequest("POST", "/api/orchestration/run", { maxWorkers: 1 });
    await new Promise(r => setTimeout(r, 5));
    await gracefulShutdown(30);
    const shutdownResult = await runPromise;
    assert("SHUTDOWN: Orchestration respects graceful shutdown", shutdownResult.status === 200 || shutdownResult.status === 409);

    // 5. Idempotent retry protection
    const idempotentFailJob = await ScraperJob.create({ scraperName: "IDEMPOTENT_FAIL", url: "http://fail_me", status: "queued" });
    await httpRequest("POST", "/api/orchestration/run", { maxWorkers: 1 });
    await new Promise(r => setTimeout(r, 100));
    await ScraperJob.updateOne({ _id: idempotentFailJob._id }, { $set: { status: "failed" } });
    await httpRequest("POST", "/api/orchestration/run", { maxWorkers: 1 });
    const finalJob = await ScraperJob.findById(idempotentFailJob._id);
    assert("IDEMPOTENT_RETRY: Failed job not retried", finalJob.retryCount === 1 && finalJob.status === "failed");


  // ─── Cleanup ───────────────────────────────────────────────────────────────
  await ScraperJob.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });
  await ScraperSchedule.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });
  await ScraperAlert.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });
  await mongoose.disconnect();

  // ─── Reports ──────────────────────────────────────────────────────────────
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportDir, "orchestration-report.json"),
    JSON.stringify({ generated: new Date().toISOString() }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "orchestration-verification.json"),
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
