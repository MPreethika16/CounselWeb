import ScraperJob from "../models/ScraperJob.js";
import { HEARTBEAT_INTERVAL_MS, STUCK_JOB_TIMEOUT_MS, SHUTDOWN_TIMEOUT_MS } from "../config/orchestrationConfig.js";
import { handleFailure } from "./scraperRetryService.js";
import { CollegeCrawler } from "./collegeCrawler.js";

// Active worker tracking for graceful shutdown
const activeWorkers = new Set();
let isShuttingDown = false;

/**
 * Simulates executing a scraper job.
 * In a real environment, this would import the relevant scraper module and execute it.
 * @param {object} job The ScraperJob document
 * @returns {Promise<void>}
 */
export async function executeJob(job) {
  // Graceful shutdown protection
  if (isShuttingDown) return;

  const jobPromise = (async () => {
    let heartbeatInterval;
    try {
      // Transition to running
      job.status = "running";
      job.startedAt = new Date();
      job.lastHeartbeatAt = new Date();
      await job.save();

      // Start heartbeat
      heartbeatInterval = setInterval(async () => {
        try {
          await ScraperJob.updateOne({ _id: job._id }, { $set: { lastHeartbeatAt: new Date() } });
        } catch (e) {
          console.error("Failed to update heartbeat:", e);
        }
      }, HEARTBEAT_INTERVAL_MS); // Configurable heartbeat interval

      // Real fetch using crawler
      const crawler = new CollegeCrawler();
      const crawlResult = await crawler.crawlPage(job.url);

      if (crawlResult.crawlStatus === "failed") {
        throw new Error(crawlResult.error || "Crawl failed with no specific error");
      }

      // Execute specific scraper logic based on scraperName
      if (job.scraperName === "academics") {
        const { runAcademicsScraping } = await import("./academicsScraper.js");
        await runAcademicsScraping(job.collegeCode, crawlResult.html, job.url);
      } else if (job.scraperName === "fees") {
        const { runFeesScraping } = await import("./feesScraper.js");
        await runFeesScraping(job.collegeCode, crawlResult.html, job.url);
      } else if (job.scraperName === "admissions") {
        const { runAdmissionsScraping } = await import("./admissionsScraper.js");
        await runAdmissionsScraping(job.collegeCode, crawlResult.html, job.url);
      } else if (job.scraperName === "placements") {
        const { runPlacementsScraping } = await import("./placementsScraper.js");
        await runPlacementsScraping(job.collegeCode, crawlResult.html, job.url);
      } else if (job.scraperName === "rankings") {
        const { runRankingsScraping } = await import("./rankingsScraper.js");
        await runRankingsScraping(job.collegeCode, crawlResult.html, job.url);
      } else if (job.scraperName === "accreditation" || job.scraperName === "naac") {
        const { runNAACScraping } = await import("./naacScraper.js");
        await runNAACScraping(job.collegeCode, crawlResult.html, job.url);
      } else {
        // Unrecognized scraper
        throw new Error(`Unrecognized scraperName: ${job.scraperName}`);
      }

      // Mark completed
      job.status = "completed";
      job.completedAt = new Date();
      await job.save();

    } catch (error) {
      // Handle failure with retry logic
      await handleFailure(job, error, 3);
    } finally {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    }
  })();

  activeWorkers.add(jobPromise);
  try {
    await jobPromise;
  } finally {
    activeWorkers.delete(jobPromise);
  }
}

/**
 * Processes queued jobs for a given scraper.
 * @param {string} scraperName 
 * @param {number} maxWorkers Maximum concurrent jobs to run
 */
export async function processQueue(scraperName, maxWorkers = 5) {
  if (isShuttingDown) return;
  // Check how many are currently running
  const runningCount = await ScraperJob.countDocuments({ scraperName, status: "running" });
  
  if (runningCount >= maxWorkers) {
    return; // At capacity
  }

  const availableSlots = maxWorkers - runningCount;

  // Find queued jobs that are eligible to run (nextRetryAt is null or in the past)
  const now = new Date();
  const queuedJobs = await ScraperJob.find({
    scraperName,
    status: "queued",
    $or: [
      { nextRetryAt: null },
      { nextRetryAt: { $lte: now } }
    ]
  })
    .sort({ queuedAt: 1 }) // FIFO
    .limit(availableSlots);

  // Execute jobs asynchronously (fire and forget)
  for (const job of queuedJobs) {
    // Double check update to prevent race conditions if multiple workers hit this
    const lockedJob = await ScraperJob.findOneAndUpdate(
      { _id: job._id, status: "queued" },
      { $set: { status: "running", startedAt: new Date() } },
      { new: true }
    );

    if (lockedJob) {
      executeJob(lockedJob).catch(err => console.error("Job execution error:", err));
    }
  }
}

/**
 * Recovers jobs that are marked as running but haven't updated their heartbeat.
 * @param {number} stuckTimeoutMs Threshold for a stuck job (default: 30s)
 */
export async function recoverStuckJobs(stuckTimeoutMs = STUCK_JOB_TIMEOUT_MS) {
  const thresholdTime = new Date(Date.now() - stuckTimeoutMs);
  
  const stuckJobs = await ScraperJob.find({
    status: "running",
    $or: [
      { lastHeartbeatAt: { $lt: thresholdTime } },
      { lastHeartbeatAt: null, startedAt: { $lt: thresholdTime } }
    ]
  });

  for (const job of stuckJobs) {
    console.warn(`Recovering stuck job ${job._id}`);
    await handleFailure(job, new Error("Job recovered from stuck state (heartbeat timeout)"), 3);
  }
}

/**
 * Gracefully waits for running jobs to finish.
 * @param {number} timeoutMs Max wait time
 */
export async function gracefulShutdown(timeoutMs = SHUTDOWN_TIMEOUT_MS) {
  console.log(`Initiating graceful shutdown. Active workers: ${activeWorkers.size}`);
  isShuttingDown = true;

  if (activeWorkers.size === 0) return;

  const timeoutPromise = new Promise(resolve => setTimeout(resolve, timeoutMs));
  await Promise.race([
    Promise.allSettled(activeWorkers),
    timeoutPromise
  ]);

  console.log(`Shutdown wait completed. Active workers remaining: ${activeWorkers.size}`);
}

/**
 * Returns overall scraper health metrics.
 */
export async function getScraperStatus() {
  const [activeCount, waitingCount, failedCount] = await Promise.all([
    ScraperJob.countDocuments({ status: "running" }),
    ScraperJob.countDocuments({ status: "queued" }),
    ScraperJob.countDocuments({ status: "failed" })
  ]);
  
  return {
    activeCount,
    waitingCount,
    failedCount,
    successRate: activeCount + failedCount > 0 
      ? Math.round((activeCount / (activeCount + failedCount)) * 100)
      : 100
  };
}
