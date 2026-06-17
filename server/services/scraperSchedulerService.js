// server/services/scraperSchedulerService.js

/**
 * Calculates scraper scheduler intelligence.
 * Tracks overdue targets, missed intervals, and execution frequencies.
 */

export function calculateScraperScheduler(scraperName, schedules, nowMs = Date.now()) {
  if (!schedules || schedules.length === 0) {
    return {
      scraperName,
      scheduledJobs: 0,
      nextRunTimes: [],
      missedRuns: 0,
      overdueJobs: 0,
      avgExecutionFrequencyMs: 0
    };
  }

  let missedRuns = 0;
  let overdueJobs = 0;
  let totalFreqMs = 0;
  const nextRunTimes = [];

  for (const schedule of schedules) {
    if (!schedule.isActive) continue;

    const nextRunMs = new Date(schedule.nextRunAt).getTime();
    nextRunTimes.push(schedule.nextRunAt);
    totalFreqMs += schedule.executionFrequencyMs;

    if (nowMs > nextRunMs) {
      overdueJobs++;
      
      // If the current time is past the nextRunAt + frequency, we consider it a missed execution cycle entirely
      if (nowMs > nextRunMs + schedule.executionFrequencyMs) {
        missedRuns++;
      }
    }
  }

  // Sort nextRunTimes chronologically
  nextRunTimes.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Stringify the dates into ISO format for deterministic output
  const isoRunTimes = nextRunTimes.map(d => new Date(d).toISOString());

  const activeCount = nextRunTimes.length;

  return {
    scraperName,
    scheduledJobs: activeCount,
    nextRunTimes: isoRunTimes,
    missedRuns,
    overdueJobs,
    avgExecutionFrequencyMs: activeCount > 0 ? Math.round(totalFreqMs / activeCount) : 0
  };
}
