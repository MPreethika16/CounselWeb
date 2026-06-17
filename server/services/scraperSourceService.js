// server/services/scraperSourceService.js

/**
 * Calculates scraper source intelligence for a given scraper.
 * Groups runs by `canonicalDomain` and extracts:
 *  - success rate, failure rate
 *  - avg duration
 *  - last success, last failure dates
 */

export function calculateScraperSources(scraperName, runs) {
  if (!runs || runs.length === 0) {
    return {
      scraperName,
      sources: []
    };
  }

  const domainMap = {};

  for (const run of runs) {
    const domain = run.canonicalDomain || "unknown";
    if (!domainMap[domain]) {
      domainMap[domain] = {
        domain,
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
      };
    }

    const stats = domainMap[domain];
    stats.totalRuns++;
    stats.totalDuration += (run.durationMs || 0);

    const runDate = new Date(run.crawledAt).getTime();

    if (run.crawlStatus === "success") {
      stats.successCount++;
      if (!stats.lastSuccessAt || runDate > new Date(stats.lastSuccessAt).getTime()) {
        stats.lastSuccessAt = run.crawledAt;
      }
    } else {
      stats.failureCount++;
      if (!stats.lastFailureAt || runDate > new Date(stats.lastFailureAt).getTime()) {
        stats.lastFailureAt = run.crawledAt;
      }
    }
  }

  const sources = Object.values(domainMap).map((d) => {
    return {
      domain: d.domain,
      totalRuns: d.totalRuns,
      successCount: d.successCount,
      failureCount: d.failureCount,
      successRate: Math.round((d.successCount / d.totalRuns) * 100),
      failureRate: Math.round((d.failureCount / d.totalRuns) * 100),
      avgDuration: Math.round(d.totalDuration / d.totalRuns),
      lastSuccessAt: d.lastSuccessAt ? new Date(d.lastSuccessAt).toISOString() : null,
      lastFailureAt: d.lastFailureAt ? new Date(d.lastFailureAt).toISOString() : null,
    };
  });

  // Sort sources alphabetically by domain for determinism
  sources.sort((a, b) => a.domain.localeCompare(b.domain));

  return {
    scraperName,
    sources
  };
}
