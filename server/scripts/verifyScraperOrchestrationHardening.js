// server/scripts/verifyScraperOrchestrationHardening.js
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import ScraperJob from "../models/ScraperJob.js";
import { acquireLock, releaseLock, isLocked, cleanupLocks } from "../services/scraperLockService.js";
import { gracefulShutdown, recoverStuckJobs, executeJob } from "../services/scraperWorkerService.js";
import { handleFailure } from "../services/scraperRetryService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function verify() {
  console.log("=== Phase 3.0A Orchestration Hardening Verification ===");
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

  const PREFIX = "HARD_TEST_";
  
  // Cleanup
  await ScraperJob.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });

  // 1. Lock Expiration Cleanup
  acquireLock("test_lock_expired", -1000); // Create an already expired lock
  acquireLock("test_lock_valid", 10000);   // Create a valid lock
  cleanupLocks();
  
  assert("LOCK: Expired lock was cleaned up", isLocked("test_lock_expired") === false);
  assert("LOCK: Valid lock was kept", isLocked("test_lock_valid") === true);
  releaseLock("test_lock_valid");

  // 2. Stuck Job Recovery & Worker Heartbeat
  const stuckJob = await ScraperJob.create({ 
    scraperName: `${PREFIX}STUCK`, 
    url: "http://example.com", 
    status: "running",
    startedAt: new Date(Date.now() - 60000), // 60s ago
    lastHeartbeatAt: new Date(Date.now() - 40000) // 40s ago
  });

  await recoverStuckJobs(30000); // Recover jobs older than 30s
  const recoveredJob = await ScraperJob.findById(stuckJob._id);
  assert("STUCK: Recovered job is queued for retry", recoveredJob.status === "queued");
  assert("STUCK: Recovered job has error message", recoveredJob.error.includes("heartbeat timeout"));
  assert("STUCK: retryCount incremented", recoveredJob.retryCount === 1);

  // 3. Idempotent Retry Protection
  const failedJob = await ScraperJob.create({ 
    scraperName: `${PREFIX}FAIL_IDEMPOTENT`, 
    url: "http://example.com", 
    status: "failed", // Already failed
    retryCount: 3
  });

  await handleFailure(failedJob, new Error("Should not retry"), 3);
  const reFailedJob = await ScraperJob.findById(failedJob._id);
  // It shouldn't increment retryCount or change fields if it was already failed
  assert("IDEMPOTENT: Already failed job is untouched", reFailedJob.retryCount === 3 && reFailedJob.error === null);

  // 4. Graceful Shutdown & Heartbeat Execution Test
  const mockRunningJob = await ScraperJob.create({ 
    scraperName: `${PREFIX}SHUTDOWN`, 
    url: "http://example.com", 
    status: "queued" 
  });

  // Start job (will take ~50ms inside executeJob)
  executeJob(mockRunningJob);
  
  // Immediately call graceful shutdown with 1s timeout
  const shutdownStart = Date.now();
  await gracefulShutdown(1000);
  const shutdownTime = Date.now() - shutdownStart;
  
  // It should have waited for the job to finish (which takes ~50ms, so shutdown time should be ~50-100ms, not full 1000ms)
  assert("SHUTDOWN: Gracefully waited for workers", shutdownTime >= 40 && shutdownTime < 500, `Took ${shutdownTime}ms`);
  
  const finishedJob = await ScraperJob.findById(mockRunningJob._id);
  assert("SHUTDOWN: Job completed successfully before shutdown", finishedJob.status === "completed");
  assert("HEARTBEAT: lastHeartbeatAt was set during execution", finishedJob.lastHeartbeatAt !== null);


  // ─── Cleanup ───────────────────────────────────────────────────────────────
  await ScraperJob.deleteMany({ scraperName: { $regex: `^${PREFIX}` } });
  await mongoose.disconnect();

  // ─── Reports ──────────────────────────────────────────────────────────────
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportDir, "orchestration-hardening-report.json"),
    JSON.stringify({ generated: new Date().toISOString() }, null, 2)
  );
  fs.writeFileSync(
    path.join(reportDir, "orchestration-hardening-verification.json"),
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
