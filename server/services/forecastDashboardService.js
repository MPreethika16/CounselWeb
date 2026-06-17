// server/services/forecastDashboardService.js
import BenchmarkSnapshot from "../models/BenchmarkSnapshot.js";
import { calculateForecast } from "./benchmarkForecastService.js";

/**
 * Deterministic comparator: sort by score DESC, then scraperName ASC.
 * @param {string} scoreKey  The numeric field to sort by (e.g. 'confidenceScore')
 */
function deterministicSort(a, b, scoreKey = "confidenceScore") {
  if (b[scoreKey] !== a[scoreKey]) return b[scoreKey] - a[scoreKey];
  return a.scraperName.localeCompare(b.scraperName);
}

/**
 * Builds the forecast dashboard by running calculateForecast over every
 * distinct scraperName that has snapshots within the last 30 days.
 *
 * @param {object} options
 * @param {boolean} [options.useEma=false]   Use EMA slope instead of linear
 * @param {number}  [options.limit=5]        Top-N per ranked list
 * @returns {Promise<object>}                Dashboard payload
 */
export async function buildForecastDashboard({ useEma = false, limit = 5 } = {}) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. Discover all distinct scraperNames active in the window
  const scraperNames = await BenchmarkSnapshot.distinct("scraperName", {
    snapshotDate: { $gte: thirtyDaysAgo },
  });

  if (scraperNames.length === 0) {
    return {
      topImproving:       [],
      topDeclining:       [],
      highestConfidence:  [],
      lowestConfidence:   [],
      summaryStats: {
        totalScrapers:       0,
        improving:           0,
        declining:           0,
        stable:              0,
        insufficientHistory: 0,
        avgConfidence:       0,
      },
    };
  }

  // 2. Bulk-fetch all snapshots for those scrapers in one query, group by scraperName
  const allSnapshots = await BenchmarkSnapshot.find({
    scraperName: { $in: scraperNames },
    snapshotDate: { $gte: thirtyDaysAgo },
  })
    .sort({ snapshotDate: -1 })
    .lean();

  const snapshotsByName = {};
  for (const snap of allSnapshots) {
    if (!snapshotsByName[snap.scraperName]) snapshotsByName[snap.scraperName] = [];
    snapshotsByName[snap.scraperName].push(snap);
  }

  // 3. Run forecast for each scraper
  const forecasts = [];
  for (const name of scraperNames) {
    const snaps = snapshotsByName[name] || [];
    const result = calculateForecast(snaps, useEma);
    forecasts.push({
      scraperName:     name,
      prediction:      result.prediction,
      trend:           result.trend,
      confidenceScore: result.confidenceScore,
      status:          result.status,
      forecast7d:      result.forecast7d,
      forecast30d:     result.forecast30d,
      forecastMethod:  result.forecastMethod,
      dataPointsUsed:  result.dataPointsUsed,
      outliersRemoved: result.outliersRemoved,
    });
  }

  // 4. Partition into groups
  const improving   = forecasts.filter(f => f.prediction === "IMPROVING");
  const declining   = forecasts.filter(f => f.prediction === "DECLINING");
  const stable      = forecasts.filter(f => f.status === "OK" && f.prediction === "STABLE");
  const insufficient = forecasts.filter(f => f.status === "INSUFFICIENT_HISTORY");

  // 5. Build ranked lists (deterministic: confidenceScore DESC → scraperName ASC)
  const topImproving  = [...improving].sort((a, b) => deterministicSort(a, b)).slice(0, limit);
  const topDeclining  = [...declining].sort((a, b) => deterministicSort(a, b)).slice(0, limit);

  // highestConfidence / lowestConfidence from all OK forecasts
  const okForecasts   = forecasts.filter(f => f.status === "OK");
  const highestConfidence = [...okForecasts]
    .sort((a, b) => deterministicSort(a, b))
    .slice(0, limit);
  const lowestConfidence  = [...okForecasts]
    .sort((a, b) => a.confidenceScore !== b.confidenceScore
      ? a.confidenceScore - b.confidenceScore                   // ASC score
      : a.scraperName.localeCompare(b.scraperName))             // ASC name
    .slice(0, limit);

  // 6. Summary stats
  const avgConfidence = okForecasts.length > 0
    ? Math.round(okForecasts.reduce((s, f) => s + f.confidenceScore, 0) / okForecasts.length)
    : 0;

  const summaryStats = {
    totalScrapers:       forecasts.length,
    improving:           improving.length,
    declining:           declining.length,
    stable:              stable.length,
    insufficientHistory: insufficient.length,
    avgConfidence,
  };

  return {
    topImproving,
    topDeclining,
    highestConfidence,
    lowestConfidence,
    summaryStats,
  };
}
