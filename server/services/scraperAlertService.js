// server/services/scraperAlertService.js

/**
 * Calculates scraper alert intelligence metrics.
 * 
 * Tracks:
 * - active alerts
 * - resolved alerts
 * - alert severity grouped counts (for active alerts)
 * - alert counts by type (for active alerts)
 * - alert age (average age of active alerts in ms)
 */

export function calculateScraperAlerts(scraperName, alerts, nowMs = Date.now()) {
  if (!alerts || alerts.length === 0) {
    return {
      scraperName,
      activeAlertsCount: 0,
      resolvedAlertsCount: 0,
      severityCounts: { INFO: 0, WARNING: 0, CRITICAL: 0, FATAL: 0 },
      typeCounts: {},
      avgActiveAlertAgeMs: 0
    };
  }

  let activeAlertsCount = 0;
  let resolvedAlertsCount = 0;
  let totalAgeMs = 0;
  
  const severityCounts = {
    INFO: 0,
    WARNING: 0,
    CRITICAL: 0,
    FATAL: 0
  };

  const typeCounts = {};

  for (const alert of alerts) {
    if (alert.isResolved) {
      resolvedAlertsCount++;
    } else {
      activeAlertsCount++;
      
      const severity = alert.severity || "WARNING";
      if (severityCounts[severity] !== undefined) {
        severityCounts[severity]++;
      } else {
        severityCounts[severity] = 1;
      }

      const type = alert.type || "UNKNOWN";
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      if (alert.createdAt) {
        const age = nowMs - new Date(alert.createdAt).getTime();
        if (age >= 0) {
          totalAgeMs += age;
        }
      }
    }
  }

  // Convert type counts to sorted array for consistent API output
  const sortedTypes = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    scraperName,
    activeAlertsCount,
    resolvedAlertsCount,
    severityCounts,
    typeCounts: sortedTypes,
    avgActiveAlertAgeMs: activeAlertsCount > 0 ? Math.round(totalAgeMs / activeAlertsCount) : 0
  };
}
