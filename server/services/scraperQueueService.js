// server/services/scraperQueueService.js

/**
 * Calculates scraper queue intelligence for a set of jobs.
 * 
 * Tracks:
 * - count of queued, running, completed, failed
 * - avg wait time (startedAt - queuedAt)
 * - queue utilization (ratio of running to max capacity)
 * - oldest queued job
 */

export function calculateScraperQueue(scraperName, jobs, maxCapacity = 10) {
  if (!jobs || jobs.length === 0) {
    return {
      scraperName,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      avgWaitTimeMs: 0,
      queueUtilizationPercentage: 0,
      oldestQueuedAt: null
    };
  }

  const counts = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0
  };

  let totalWaitTime = 0;
  let waitTimeSamples = 0;
  let oldestQueuedAt = null;

  for (const job of jobs) {
    const status = job.status || "queued";
    if (counts[status] !== undefined) {
      counts[status]++;
    }

    // Wait time calculations (for jobs that have started or completed/failed)
    if (job.queuedAt && job.startedAt) {
      const waitTime = new Date(job.startedAt).getTime() - new Date(job.queuedAt).getTime();
      if (waitTime >= 0) {
        totalWaitTime += waitTime;
        waitTimeSamples++;
      }
    }

    // Oldest queued job tracking
    if (status === "queued" && job.queuedAt) {
      const qTime = new Date(job.queuedAt).getTime();
      if (!oldestQueuedAt || qTime < new Date(oldestQueuedAt).getTime()) {
        oldestQueuedAt = job.queuedAt;
      }
    }
  }

  const avgWaitTimeMs = waitTimeSamples > 0 ? Math.round(totalWaitTime / waitTimeSamples) : 0;
  const queueUtilizationPercentage = Math.round((counts.running / maxCapacity) * 100);

  return {
    scraperName,
    queued: counts.queued,
    running: counts.running,
    completed: counts.completed,
    failed: counts.failed,
    avgWaitTimeMs,
    queueUtilizationPercentage,
    oldestQueuedAt: oldestQueuedAt ? new Date(oldestQueuedAt).toISOString() : null
  };
}
