// server/services/scraperSlaService.js

/**
 * Calculates scraper SLA intelligence.
 * Evaluates configured benchmarks against recorded performance to track breaches and aggregate metrics.
 */

export function calculateScraperSla(slaConfig, nowMs = Date.now()) {
  if (!slaConfig) {
    return null; // Empty config handled at route level
  }

  let currentBreachDurationMs = 0;

  if (slaConfig.breachStatus && slaConfig.breachStartedAt) {
    const duration = nowMs - new Date(slaConfig.breachStartedAt).getTime();
    if (duration > 0) {
      currentBreachDurationMs = duration;
    }
  }

  const totalBreachDurationMs = (slaConfig.historicalBreachDurationMs || 0) + currentBreachDurationMs;

  return {
    scraperName: slaConfig.scraperName,
    targets: {
      successPercent: slaConfig.targetSuccessPercent,
      uptimePercent: slaConfig.targetUptimePercent,
      latencyMs: slaConfig.targetLatencyMs
    },
    recorded: {
      successPercent: slaConfig.recordedSuccessPercent,
      uptimePercent: slaConfig.recordedUptimePercent,
      latencyMs: slaConfig.recordedAvgLatencyMs
    },
    isBreaching: slaConfig.breachStatus || false,
    breachDurationMs: totalBreachDurationMs
  };
}
