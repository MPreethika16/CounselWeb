// server/services/scraperTrendService.js

/**
 * Calculates scraper trend analytics for a given scraper type (pageType).
 * Groups runs by UTC Date (YYYY-MM-DD) and computes daily and windowed metrics.
 * 
 * Metrics calculated:
 *  - dailyTrends: Array of daily runs, success rate, failure trend, and avg duration
 *  - windows: 7d and 30d aggregates (total runs, success rate, avg duration)
 */

export function calculateScraperTrends(scraperName, runs) {
  const dailyMap = {};
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Window counters
  let runs7d = 0, success7d = 0, duration7d = 0;
  let runs30d = 0, success30d = 0, duration30d = 0;

  for (const run of runs) {
    if (!run.crawledAt) continue;

    const dateObj = new Date(run.crawledAt);
    const dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD in UTC
    const ageDays = (now - dateObj.getTime()) / ONE_DAY;

    const duration = run.durationMs || 0;
    const isSuccess = run.crawlStatus === "success";

    // Daily Aggregation
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = {
        date: dateStr,
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
      };
    }

    const dayStats = dailyMap[dateStr];
    dayStats.totalRuns++;
    dayStats.totalDuration += duration;
    if (isSuccess) {
      dayStats.successCount++;
    } else {
      dayStats.failureCount++;
    }

    // Windows Aggregation
    if (ageDays <= 7) {
      runs7d++;
      duration7d += duration;
      if (isSuccess) success7d++;
    }
    if (ageDays <= 30) {
      runs30d++;
      duration30d += duration;
      if (isSuccess) success30d++;
    }
  }

  // Format Daily Trends
  const dailyTrends = Object.values(dailyMap).map((d) => ({
    date: d.date,
    totalRuns: d.totalRuns,
    successCount: d.successCount,
    failureCount: d.failureCount,
    successRate: Math.round((d.successCount / d.totalRuns) * 100),
    avgDuration: Math.round(d.totalDuration / d.totalRuns),
  }));

  // Sort daily trends ascending by date
  dailyTrends.sort((a, b) => a.date.localeCompare(b.date));

  // Format Windows
  const windows = {
    "7d": {
      totalRuns: runs7d,
      successRate: runs7d > 0 ? Math.round((success7d / runs7d) * 100) : 0,
      avgDuration: runs7d > 0 ? Math.round(duration7d / runs7d) : 0,
    },
    "30d": {
      totalRuns: runs30d,
      successRate: runs30d > 0 ? Math.round((success30d / runs30d) * 100) : 0,
      avgDuration: runs30d > 0 ? Math.round(duration30d / runs30d) : 0,
    },
  };

  return {
    scraperName,
    windows,
    dailyTrends,
  };
}
