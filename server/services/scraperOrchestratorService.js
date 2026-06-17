// server/services/scraperOrchestratorService.js
import ScraperSchedule from "../models/ScraperSchedule.js";
import ScraperJob from "../models/ScraperJob.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { acquireLock, releaseLock, cleanupLocks } from "./scraperLockService.js";
import { processQueue, recoverStuckJobs } from "./scraperWorkerService.js";

/**
 * Dispatches scraper jobs for colleges missing data for a specific scraper.
 * @param {string} scraperName 
 * @param {object} queryConstraint Optional additional mongodb query filters
 */
export async function dispatchScraperJob(scraperName, queryConstraint = {}) {
  // Query for valid colleges that need scraping for this specific category
  const targetColleges = await CollegeMaster.find({
    ...queryConstraint,
    "officialWebsite.url": { $exists: true, $ne: "" },
    $or: [
      { [`officialData.coverageDetails.${scraperName}`]: { $ne: true } },
      // Fallbacks if coverage flag isn't set, depending on scraper name
      ...(scraperName === "fees" ? [{ "officialData.fees.tuitionFee": null }] : []),
      ...(scraperName === "placements" ? [{ "officialData.placements.highestPackage": null }] : []),
      ...(scraperName === "accreditation" || scraperName === "naac" ? [{ "officialData.accreditation.naacGrade": null }] : []),
      ...(scraperName === "rankings" ? [{ "officialData.rankings": { $size: 0 } }] : []),
      ...(scraperName === "academics" ? [{ "officialData.academics.departments": { $size: 0 } }] : [])
    ]
  }).lean();

  for (const college of targetColleges) {
    // Prevent duplicate queued jobs
    const existingJob = await ScraperJob.findOne({
      collegeCode: college.collegeCode,
      scraperName: scraperName,
      status: { $in: ["queued", "running"] }
    });

    if (!existingJob) {
      await ScraperJob.create({
        collegeCode: college.collegeCode,
        scraperName: scraperName,
        url: college.officialWebsite.url,
        status: "queued",
        queuedAt: new Date()
      });

      // Update discovery status to reflect scraping has started if it was just discovered
      if (college.discoveryStatus === "discovered" || college.discoveryStatus === "verified") {
        await CollegeMaster.updateOne(
          { _id: college._id },
          { $set: { discoveryStatus: "scraping" } }
        );
      }
    }
  }
}

/**
 * Checks for schedules that are due and creates corresponding jobs.
 */
export async function checkSchedules() {
  const now = new Date();
  
  // Find active schedules that are due
  const dueSchedules = await ScraperSchedule.find({
    isActive: true,
    nextRunAt: { $lte: now }
  });

  for (const schedule of dueSchedules) {
    // Dispatch real jobs for this scraper
    await dispatchScraperJob(schedule.scraperName);

    // Update the schedule's nextRunAt
    schedule.lastRunAt = now;
    schedule.nextRunAt = new Date(now.getTime() + schedule.executionFrequencyMs);
    await schedule.save();
  }
}

/**
 * Orchestrates the full scraper lifecycle.
 * @param {object} options
 * @param {number} [options.maxWorkers=5]
 */
export async function runOrchestration({ maxWorkers = 5 } = {}) {
  const lockKey = "scraper_orchestrator";
  
  if (!acquireLock(lockKey, 30000)) { // 30s lock
    return { success: false, message: "Orchestration already running (locked)" };
  }

  try {
    // 0. Periodic maintenance
    cleanupLocks();
    await recoverStuckJobs(30000); // 30s threshold for stuck jobs

    // 1. Trigger scheduled jobs
    await checkSchedules();

    // 2. Discover all distinct scrapers that have queued or running jobs
    const activeScrapers = await ScraperJob.distinct("scraperName", {
      status: { $in: ["queued", "running"] }
    });

    // 3. Process queues for each scraper
    for (const scraperName of activeScrapers) {
      await processQueue(scraperName, maxWorkers);
    }

    return { success: true, message: "Orchestration run initiated" };
  } finally {
    releaseLock(lockKey);
  }
}

/**
 * Gets aggregated metrics across all scrapers.
 */
export async function getMetrics() {
  const [runningJobs, queuedJobs, completedJobs, failedJobs, retryingJobs] = await Promise.all([
    ScraperJob.countDocuments({ status: "running" }),
    ScraperJob.countDocuments({ status: "queued", retryCount: 0 }),
    ScraperJob.countDocuments({ status: "completed" }),
    ScraperJob.countDocuments({ status: "failed" }),
    ScraperJob.countDocuments({ status: "queued", retryCount: { $gt: 0 } })
  ]);

  return {
    runningJobs,
    queuedJobs,
    completedJobs,
    failedJobs,
    retries: retryingJobs
  };
}
