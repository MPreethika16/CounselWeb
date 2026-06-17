// server/services/benchmarkForecastService.js

/**
 * Centralised configuration for all forecasting constants.
 * Override these for testing or environment-specific tuning.
 */
export const FORECAST_CONFIG = {
  /** Multiplier applied to IQR when computing outlier bounds. Default: 1.5 (Tukey fence). */
  iqrMultiplier: 1.5,
  /** Days of grace before staleness decay begins (i.e. latest snapshot age tolerated). */
  staleDaysThreshold: 1,
  /** Confidence points deducted per full day of staleness beyond the threshold. */
  confidenceDecayPerDay: 5,
  /** Minimum number of (post-outlier-filter) data points required to produce a forecast. */
  minHistoryPoints: 3,
};

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Removes outliers using the Tukey IQR fence method.
 * Returns { filtered, removed } counts alongside the clean point array.
 * If fewer than 4 points exist, no filtering is applied (not enough data for IQR).
 *
 * @param {Array<{x: number, y: number}>} points
 * @param {number} multiplier  IQR multiplier (from FORECAST_CONFIG)
 * @returns {{ clean: Array, removedCount: number }}
 */
function removeOutliers(points, multiplier) {
  if (points.length < 4) return { clean: points, removedCount: 0 };

  const sorted = [...points].sort((a, b) => a.y - b.y);
  const q1 = sorted[Math.floor(sorted.length * 0.25)].y;
  const q3 = sorted[Math.floor(sorted.length * 0.75)].y;
  const iqr = q3 - q1;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  const clean = points.filter(p => p.y >= lowerBound && p.y <= upperBound);
  return { clean, removedCount: points.length - clean.length };
}

/**
 * Standard OLS linear regression slope (daily rate of change).
 * @param {Array<{x: number, y: number}>} points
 * @returns {number}
 */
function calculateLinearSlope(points) {
  if (points.length < 2) return 0;

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const p of points) {
    sumX  += p.x;
    sumY  += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * EMA-smoothed slope — places higher weight on more recent pairwise day-changes.
 * alpha = 2 / (N + 1) where N is the number of slope samples (n - 1 pairs).
 * @param {Array<{x: number, y: number}>} points
 * @returns {number}
 */
function calculateEmaSlope(points) {
  if (points.length < 2) return 0;

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const n = sorted.length;
  const alpha = 2 / (n + 1);

  let emaSlope = 0;
  let hasEma = false;

  for (let i = 1; i < n; i++) {
    const dx = sorted[i].x - sorted[i - 1].x;
    if (dx === 0) continue;

    const slope = (sorted[i].y - sorted[i - 1].y) / dx;
    if (!hasEma) {
      emaSlope = slope;
      hasEma = true;
    } else {
      emaSlope = (slope - emaSlope) * alpha + emaSlope;
    }
  }

  return hasEma ? emaSlope : 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Calculates a 7d and 30d forecast based on historical snapshots.
 *
 * @param {Array}   snapshots  Array of BenchmarkSnapshot documents / lean objects
 * @param {boolean} useEma     When true, uses EMA slope instead of OLS linear slope
 * @param {object}  config     Optional config overrides (merged with FORECAST_CONFIG)
 * @returns {object}           Forecast result with metadata
 */
export function calculateForecast(snapshots, useEma = false, config = {}) {
  const cfg = { ...FORECAST_CONFIG, ...config };

  // Insufficient history — return early with zero metadata
  if (!snapshots || snapshots.length < cfg.minHistoryPoints) {
    return {
      status:          "INSUFFICIENT_HISTORY",
      forecast7d:      null,
      forecast30d:     null,
      trend:           "FLAT",
      prediction:      "STABLE",
      confidenceScore: 0,
      forecastMethod:  useEma ? "ema" : "linear",
      dataPointsUsed:  snapshots ? snapshots.length : 0,
      outliersRemoved: 0,
      isEma:           useEma,
    };
  }

  // Sort chronologically (oldest → newest)
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshotDate) - new Date(b.snapshotDate)
  );

  const latest     = sorted[sorted.length - 1];
  const latestTime = new Date(latest.snapshotDate).getTime();
  const msPerDay   = 24 * 60 * 60 * 1000;

  // Build raw {x, y} point arrays (x = days relative to latest snapshot)
  const rawPoints = { percentileRanking: [], successRate: [], durationMs: [], roiScore: [] };

  for (const snap of sorted) {
    const days = (new Date(snap.snapshotDate).getTime() - latestTime) / msPerDay;
    rawPoints.percentileRanking.push({ x: days, y: snap.percentileRanking });
    rawPoints.successRate.push(      { x: days, y: snap.successRate });
    rawPoints.durationMs.push(       { x: days, y: snap.durationMs });
    rawPoints.roiScore.push(         { x: days, y: snap.roiScore });
  }

  // Outlier filtering — track removed counts per metric
  const filtered = {};
  let totalOutliersRemoved = 0;
  for (const key of Object.keys(rawPoints)) {
    const result = removeOutliers(rawPoints[key], cfg.iqrMultiplier);
    filtered[key] = result.clean;
    totalOutliersRemoved += result.removedCount;
  }

  // Minimum points guard after outlier removal (use successRate as proxy)
  if (filtered.successRate.length < cfg.minHistoryPoints) {
    return {
      status:          "INSUFFICIENT_HISTORY",
      forecast7d:      null,
      forecast30d:     null,
      trend:           "FLAT",
      prediction:      "STABLE",
      confidenceScore: 0,
      forecastMethod:  useEma ? "ema" : "linear",
      dataPointsUsed:  filtered.successRate.length,
      outliersRemoved: totalOutliersRemoved,
      isEma:           useEma,
    };
  }

  // Slope calculation
  const slopeAlgo = useEma ? calculateEmaSlope : calculateLinearSlope;
  const slopes = {
    percentileRanking: slopeAlgo(filtered.percentileRanking),
    successRate:       slopeAlgo(filtered.successRate),
    durationMs:        slopeAlgo(filtered.durationMs),
    roiScore:          slopeAlgo(filtered.roiScore),
  };

  // Forecast projections with hard bounds
  const cap = (val, min, max) => Math.min(Math.max(val, min), max);
  const predict = (daysAhead) => ({
    percentileRanking: cap(latest.percentileRanking + slopes.percentileRanking * daysAhead, 0, 100),
    successRate:       cap(latest.successRate       + slopes.successRate       * daysAhead, 0, 100),
    durationMs:        Math.max(latest.durationMs   + slopes.durationMs       * daysAhead, 0),
    roiScore:          cap(latest.roiScore          + slopes.roiScore         * daysAhead, 0, 100),
  });

  const forecast7d  = predict(7);
  const forecast30d = predict(30);

  // Trend / prediction classification
  let trend = "FLAT", prediction = "STABLE";
  const { successRate: sr, durationMs: dm } = slopes;

  if (sr > 0.1 || (Math.abs(sr) <= 0.1 && dm < -5)) {
    trend = "UPWARD";   prediction = "IMPROVING";
  } else if (sr < -0.1 || (Math.abs(sr) <= 0.1 && dm > 5)) {
    trend = "DOWNWARD"; prediction = "DECLINING";
  }

  // Confidence score: base (proportional to sample count) minus staleness decay, clamped [0, 100]
  const dataPointsUsed = filtered.successRate.length;
  const baseConfidence = Math.round((sorted.length / 30) * 100);

  const timeSinceLatest = Date.now() - latestTime;
  const daysStale       = Math.max(0, (timeSinceLatest / msPerDay) - cfg.staleDaysThreshold);
  const decay           = Math.floor(daysStale) * cfg.confidenceDecayPerDay;

  const confidenceScore = cap(baseConfidence - decay, 0, 100);

  return {
    status:          "OK",
    forecast7d,
    forecast30d,
    trend,
    prediction,
    confidenceScore,
    forecastMethod:  useEma ? "ema" : "linear",
    dataPointsUsed,
    outliersRemoved: totalOutliersRemoved,
    isEma:           useEma,
  };
}
