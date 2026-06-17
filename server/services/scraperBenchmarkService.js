// server/services/scraperBenchmarkService.js

/**
 * Calculates scraper benchmark intelligence dynamically.
 * Correlates an individual scraper's performance against the provided global averages safely natively.
 */

export function calculateScraperBenchmark(config, globals) {
  if (!config || !globals) return null;

  // Compare local config vs global medians
  const successDelta = config.successRate - globals.medianSuccessRate;
  const durationDelta = config.durationMs - globals.medianDurationMs;
  const roiDelta = config.roiScore - globals.medianRoiScore;
  const costDelta = config.costUsd - globals.medianCostUsd;

  const isSuccessAbove = successDelta >= 0;
  // Lower duration is better, so 'above average performance' means duration is lower
  const isDurationBetter = durationDelta <= 0;
  const isRoiAbove = roiDelta >= 0;
  // Lower cost is better
  const isCostBetter = costDelta <= 0;

  // We assign a simple relative "performance strength" score from 0 to 4 based on beating averages
  let performanceScore = 0;
  if (isSuccessAbove) performanceScore++;
  if (isDurationBetter) performanceScore++;
  if (isRoiAbove) performanceScore++;
  if (isCostBetter) performanceScore++;

  // Convert 0-4 into a 0-100 percentile-like score for absolute representation natively
  const percentileRanking = (performanceScore / 4) * 100;

  let overallStatus = "AVERAGE";
  if (performanceScore >= 3) overallStatus = "ABOVE_AVERAGE";
  if (performanceScore <= 1) overallStatus = "BELOW_AVERAGE";

  // Phase 2.33 - Hardening Min Runs
  if ((config.totalRuns || 0) < 20) {
    overallStatus = "INSUFFICIENT_DATA";
  }

  return {
    scraperName: config.scraperName,
    metrics: {
      successRate: config.successRate,
      durationMs: config.durationMs,
      roiScore: config.roiScore,
      costUsd: config.costUsd,
      totalRuns: config.totalRuns || 0
    },
    comparisons: {
      successRateAboveAvg: isSuccessAbove,
      durationBetterThanAvg: isDurationBetter,
      roiScoreAboveAvg: isRoiAbove,
      costBetterThanAvg: isCostBetter
    },
    trends: {
      trend7d: config.trend7d || 0,
      trend30d: config.trend30d || 0
    },
    percentileRanking,
    overallStatus
  };
}
