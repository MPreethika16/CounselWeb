// server/services/scraperCapacityService.js

/**
 * Calculates scraper capacity intelligence.
 * Tracks concurrent execution limits, utilization percentages, idle headroom, and historical high-water marks.
 */

export function calculateScraperCapacity(config) {
  if (!config) {
    return null;
  }

  const maxCapacity = Math.max(1, config.maxCapacity || 10);
  const activeJobs = Math.max(0, config.activeJobs || 0);
  const queuedJobs = Math.max(0, config.queuedJobs || 0);

  // Utilization cannot exceed 100% technically for active jobs vs capacity,
  // but if for some reason activeJobs > maxCapacity, we'll cap it or just show the real math.
  // We'll cap utilization at 100% to represent hardware limit, but track queue pressure separately.
  let utilizationPercent = Math.round((activeJobs / maxCapacity) * 100);
  if (utilizationPercent > 100) utilizationPercent = 100;

  const idleCapacity = Math.max(0, maxCapacity - activeJobs);
  const queuePressurePercent = Math.round((queuedJobs / maxCapacity) * 100);

  // Peak tracking
  const historicalPeak = config.peakUtilizationPercent || 0;
  const peakUtilization = utilizationPercent > historicalPeak ? utilizationPercent : historicalPeak;

  return {
    scraperName: config.scraperName,
    maxCapacity,
    activeJobs,
    utilizationPercent,
    idleCapacity,
    queuePressurePercent,
    peakUtilization
  };
}
