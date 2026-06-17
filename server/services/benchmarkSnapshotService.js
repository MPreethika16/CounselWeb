// server/services/benchmarkSnapshotService.js

/**
 * Calculates historical shifts securely isolating dynamic parameters directly.
 */

export function calculateSnapshotChanges(latest, history7d, history30d) {
  if (!latest) return null;

  const result = {
    scraperName: latest.scraperName,
    snapshotDate: latest.snapshotDate,
    current: {
      percentileRanking: latest.percentileRanking,
      successRate: latest.successRate,
      durationMs: latest.durationMs,
      roiScore: latest.roiScore,
      benchmarkStatus: latest.benchmarkStatus
    },
    changes: {
      from7d: null,
      from30d: null
    }
  };

  if (history7d) {
    result.changes.from7d = {
      percentileRankingDelta: latest.percentileRanking - history7d.percentileRanking,
      successRateDelta: latest.successRate - history7d.successRate,
      durationMsDelta: latest.durationMs - history7d.durationMs,
      roiScoreDelta: latest.roiScore - history7d.roiScore
    };
  }

  if (history30d) {
    result.changes.from30d = {
      percentileRankingDelta: latest.percentileRanking - history30d.percentileRanking,
      successRateDelta: latest.successRate - history30d.successRate,
      durationMsDelta: latest.durationMs - history30d.durationMs,
      roiScoreDelta: latest.roiScore - history30d.roiScore
    };
  }

  return result;
}
