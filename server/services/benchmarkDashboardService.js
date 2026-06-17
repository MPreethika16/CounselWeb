// server/services/benchmarkDashboardService.js

/**
 * Calculates dashboard aggregates natively from fully sorted benchmark intelligence matrices.
 */

export function calculateBenchmarkDashboard(benchmarkIntelArray) {
  if (!benchmarkIntelArray || benchmarkIntelArray.length === 0) {
    return {
      top10: [],
      bottom10: [],
      improving: [],
      declining: [],
      distribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
      },
      trendSummary: {
        improvingCount: 0,
        decliningCount: 0,
        neutralCount: 0
      }
    };
  }

  // benchmarkIntelArray is assumed to be PRE-SORTED descending by percentileRanking from the route

  const top10 = benchmarkIntelArray.slice(0, 10);
  const bottom10 = [...benchmarkIntelArray].reverse().slice(0, 10);

  const distribution = {
    excellent: 0, // 90-100
    good: 0,      // 70-89
    average: 0,   // 40-69
    poor: 0       // 0-39
  };

  const improving = [];
  const declining = [];
  let neutralCount = 0;

  for (const intel of benchmarkIntelArray) {
    const pr = intel.percentileRanking;
    
    // Distribution Mapping
    if (pr >= 90) distribution.excellent++;
    else if (pr >= 70) distribution.good++;
    else if (pr >= 40) distribution.average++;
    else distribution.poor++;

    // Trend Evaluation (trend7d)
    const trend = intel.trends?.trend7d || 0;
    if (trend > 0) {
      improving.push(intel);
    } else if (trend < 0) {
      declining.push(intel);
    } else {
      neutralCount++;
    }
  }

  // Sort improving/declining arrays dynamically for best insights
  improving.sort((a, b) => b.trends.trend7d - a.trends.trend7d);
  declining.sort((a, b) => a.trends.trend7d - b.trends.trend7d);

  return {
    top10,
    bottom10,
    improving: improving.slice(0, 10), // only need top 10 most improving
    declining: declining.slice(0, 10), // only need top 10 most declining
    distribution,
    trendSummary: {
      improvingCount: improving.length,
      decliningCount: declining.length,
      neutralCount
    }
  };
}
