// server/routes/scraperAlertRoutes.js
import express from "express";
import ScraperAlert from "../models/ScraperAlert.js";
import { calculateScraperAlerts } from "../services/scraperAlertService.js";

const router = express.Router();

/**
 * GET /api/scraper-alerts
 * Returns scraper alert intelligence.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const alerts = await ScraperAlert.find(query)
      .select("scraperName type severity isResolved createdAt resolvedAt")
      .lean();

    const grouped = alerts.reduce((acc, alert) => {
      const type = alert.scraperName || "unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(alert);
      return acc;
    }, {});

    const results = [];
    let aggregateStats = null;

    let globalActiveAlertsCount = 0;
    let globalResolvedAlertsCount = 0;
    const globalSeverityCounts = { INFO: 0, WARNING: 0, CRITICAL: 0, FATAL: 0 };
    let globalTotalAgeMs = 0;

    for (const [type, typeAlerts] of Object.entries(grouped)) {
      const alertIntel = calculateScraperAlerts(type, typeAlerts);
      results.push(alertIntel);

      globalActiveAlertsCount += alertIntel.activeAlertsCount;
      globalResolvedAlertsCount += alertIntel.resolvedAlertsCount;
      
      globalSeverityCounts.INFO += alertIntel.severityCounts.INFO;
      globalSeverityCounts.WARNING += alertIntel.severityCounts.WARNING;
      globalSeverityCounts.CRITICAL += alertIntel.severityCounts.CRITICAL;
      globalSeverityCounts.FATAL += alertIntel.severityCounts.FATAL;

      // Extract raw active age to re-calculate global average accurately
      for (const alert of typeAlerts) {
        if (!alert.isResolved && alert.createdAt) {
          const age = Date.now() - new Date(alert.createdAt).getTime();
          if (age >= 0) {
            globalTotalAgeMs += age;
          }
        }
      }
    }

    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
      results.push(calculateScraperAlerts(scraperName, []));
    }

    if (!scraperName && results.length > 0) {
      let systemHealthStatus = "HEALTHY";
      if (globalSeverityCounts.FATAL > 0) {
        systemHealthStatus = "FATAL";
      } else if (globalSeverityCounts.CRITICAL > 0) {
        systemHealthStatus = "CRITICAL";
      } else if (globalSeverityCounts.WARNING > 0) {
        systemHealthStatus = "WARNING";
      }

      aggregateStats = {
        totalScrapersConfigured: results.length,
        globalActiveAlertsCount,
        globalResolvedAlertsCount,
        globalSeverityCounts,
        globalAvgActiveAlertAgeMs: globalActiveAlertsCount > 0 ? Math.round(globalTotalAgeMs / globalActiveAlertsCount) : 0,
        systemHealthStatus
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapersConfigured: 0,
        globalActiveAlertsCount: 0,
        globalResolvedAlertsCount: 0,
        globalSeverityCounts: { INFO: 0, WARNING: 0, CRITICAL: 0, FATAL: 0 },
        globalAvgActiveAlertAgeMs: 0,
        systemHealthStatus: "HEALTHY"
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Alert API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
