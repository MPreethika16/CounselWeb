// server/routes/scraperSlaRoutes.js
import express from "express";
import ScraperSla from "../models/ScraperSla.js";
import { calculateScraperSla } from "../services/scraperSlaService.js";

const router = express.Router();

/**
 * GET /api/scraper-sla
 * Returns scraper SLA intelligence metrics.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const configs = await ScraperSla.find(query).lean();

    const results = [];
    let aggregateStats = null;

    let globalSlaBreaches = 0;
    let globalTotalBreachDurationMs = 0;
    let globalRecordedSuccessSum = 0;
    let globalRecordedUptimeSum = 0;
    let globalRecordedLatencySum = 0;

    for (const config of configs) {
      const slaIntel = calculateScraperSla(config);
      if (slaIntel) {
        results.push(slaIntel);
        if (slaIntel.isBreaching) {
          globalSlaBreaches++;
        }
        globalTotalBreachDurationMs += slaIntel.breachDurationMs;
        globalRecordedSuccessSum += slaIntel.recorded.successPercent;
        globalRecordedUptimeSum += slaIntel.recorded.uptimePercent;
        globalRecordedLatencySum += slaIntel.recorded.latencyMs;
      }
    }

    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
      // Return empty default
      results.push({
        scraperName,
        targets: { successPercent: 0, uptimePercent: 0, latencyMs: 0 },
        recorded: { successPercent: 0, uptimePercent: 0, latencyMs: 0 },
        isBreaching: false,
        breachDurationMs: 0
      });
    }

    if (!scraperName && results.length > 0) {
      const len = results.length;
      aggregateStats = {
        totalScrapersConfigured: len,
        globalSlaBreaches,
        globalTotalBreachDurationMs,
        avgRecordedSuccessPercent: Math.round(globalRecordedSuccessSum / len),
        avgRecordedUptimePercent: Math.round(globalRecordedUptimeSum / len),
        avgRecordedLatencyMs: Math.round(globalRecordedLatencySum / len),
        systemHealthStatus: globalSlaBreaches > 0 ? "WARNING" : "HEALTHY"
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapersConfigured: 0,
        globalSlaBreaches: 0,
        globalTotalBreachDurationMs: 0,
        avgRecordedSuccessPercent: 0,
        avgRecordedUptimePercent: 0,
        avgRecordedLatencyMs: 0,
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
    console.error("Scraper SLA API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
