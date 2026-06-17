// server/services/scraperHealthService.js

/**
 * Calculates scraper health analytics for a given scraper type (pageType).
 * Metrics calculated:
 *  - successRate: (success / total) * 100
 *  - failureRate: (failed / total) * 100
 *  - avgDuration: Average durationMs across all runs
 *  - lastSuccessAt: Most recent crawledAt for successful runs
 *  - lastFailureAt: Most recent crawledAt for failed runs
 *  - healthStatus: HEALTHY (>= 90%), WARNING (>= 70%), CRITICAL (< 70%)
 */

export function calculateScraperHealth(scraperName, runs) {
  if (!runs || runs.length === 0) {
    return {
      scraperName,
      successRate: 0,
      failureRate: 0,
      avgDuration: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      healthStatus: "CRITICAL",
      totalRuns: 0,
      successCount: 0,
      failureCount: 0
    };
  }

  let successCount = 0;
  let failureCount = 0;
  let totalDuration = 0;
  let lastSuccessAt = null;
  let lastFailureAt = null;

  for (const run of runs) {
    const duration = run.durationMs || 0;
    totalDuration += duration;
    
    const crawledAt = run.crawledAt ? new Date(run.crawledAt).getTime() : null;

    if (run.crawlStatus === "success") {
      successCount++;
      if (crawledAt && (!lastSuccessAt || crawledAt > lastSuccessAt)) {
        lastSuccessAt = crawledAt;
      }
    } else {
      failureCount++;
      if (crawledAt && (!lastFailureAt || crawledAt > lastFailureAt)) {
        lastFailureAt = crawledAt;
      }
    }
  }

  const totalRuns = runs.length;
  const successRate = Math.round((successCount / totalRuns) * 100);
  const failureRate = Math.round((failureCount / totalRuns) * 100);
  const avgDuration = Math.round(totalDuration / totalRuns);

  let healthStatus;
  if (successRate >= 90) {
    healthStatus = "HEALTHY";
  } else if (successRate >= 70) {
    healthStatus = "WARNING";
  } else {
    healthStatus = "CRITICAL";
  }

  return {
    scraperName,
    successRate,
    failureRate,
    avgDuration,
    lastSuccessAt: lastSuccessAt ? new Date(lastSuccessAt).toISOString() : null,
    lastFailureAt: lastFailureAt ? new Date(lastFailureAt).toISOString() : null,
    healthStatus,
    totalRuns,
    successCount,
    failureCount
  };
}
