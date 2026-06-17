// server/services/scraperRetryService.js
import ScraperAlert from "../models/ScraperAlert.js";

const BASE_DELAY_MS = 5000; // 5 seconds base delay

/**
 * Calculates exponential backoff delay.
 * @param {number} retryCount 
 * @returns {number} Delay in milliseconds
 */
export function calculateNextRetryDelay(retryCount) {
  // Exponential backoff: baseDelay * 2^retryCount
  return BASE_DELAY_MS * Math.pow(2, retryCount);
}

/**
 * Handles a scraper job failure. Updates job fields and triggers alerts if max retries exceeded.
 * @param {object} job The ScraperJob document
 * @param {Error|string} error The error encountered
 * @param {number} maxRetries Maximum allowed retries before permanent failure
 * @returns {Promise<object>} The updated job document
 */
export async function handleFailure(job, error, maxRetries = 3) {
  // Idempotent retry protection: don't process if already failed or completed
  if (job.status === "failed" || job.status === "completed") {
    return job;
  }

  const errorMessage = typeof error === "string" ? error : (error?.message || "Unknown error");
  
  if (job.retryCount < maxRetries) {
    // Schedule for retry
    job.status = "queued";
    job.error = errorMessage;
    job.retryCount += 1;
    job.nextRetryAt = new Date(Date.now() + calculateNextRetryDelay(job.retryCount));
    job.startedAt = null; // Reset startedAt since it goes back to queue
  } else {
    // Permanent failure
    job.status = "failed";
    job.error = `Max retries exceeded: ${errorMessage}`;
    job.completedAt = new Date();

    // Create an alert
    await ScraperAlert.create({
      scraperName: job.scraperName,
      type: "JOB_FAILURE",
      severity: "CRITICAL",
      message: `Job ${job._id} failed after ${job.retryCount} retries. Error: ${errorMessage}`,
      isResolved: false
    });
  }

  return await job.save();
}
