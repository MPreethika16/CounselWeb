// server/services/scraperExecutionService.js

/**
 * Calculates scraper execution metrics for a given scraper type (pageType).
 * Metrics calculated:
 *  - jobsRun: Total number of runs
 *  - jobsSucceeded: Count where crawlStatus === "success"
 *  - jobsFailed: Count where crawlStatus === "failed"
 *  - avgDuration: Average durationMs across all runs
 *  - successRate: (jobsSucceeded / jobsRun) * 100
 *  - lastRunAt: Most recent crawledAt overall
 */

export function calculateScraperExecution(scraperName, runs) {
  if (!runs || runs.length === 0) {
    return {
      scraperName,
      jobsRun: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      avgDuration: 0,
      successRate: 0,
      lastRunAt: null
    };
  }

  let jobsSucceeded = 0;
  let jobsFailed = 0;
  let totalDuration = 0;
  let lastRunAt = null;

  for (const run of runs) {
    const duration = run.durationMs || 0;
    totalDuration += duration;
    
    const crawledAt = run.crawledAt ? new Date(run.crawledAt).getTime() : null;

    if (crawledAt && (!lastRunAt || crawledAt > lastRunAt)) {
      lastRunAt = crawledAt;
    }

    if (run.crawlStatus === "success") {
      jobsSucceeded++;
    } else {
      jobsFailed++;
    }
  }

  const jobsRun = runs.length;
  const successRate = Math.round((jobsSucceeded / jobsRun) * 100);
  const avgDuration = Math.round(totalDuration / jobsRun);

  return {
    scraperName,
    jobsRun,
    jobsSucceeded,
    jobsFailed,
    avgDuration,
    successRate,
    lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null
  };
}
