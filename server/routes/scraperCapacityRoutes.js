// server/routes/scraperCapacityRoutes.js
import express from "express";
import ScraperCapacity from "../models/ScraperCapacity.js";
import { calculateScraperCapacity } from "../services/scraperCapacityService.js";

const router = express.Router();

/**
 * GET /api/scraper-capacity
 * Returns scraper capacity intelligence.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const configs = await ScraperCapacity.find(query).lean();

    const results = [];
    let aggregateStats = null;

    let globalMaxCapacity = 0;
    let globalActiveJobs = 0;
    let globalQueuedJobs = 0;
    let sumPeakUtilization = 0;

    for (const config of configs) {
      const capacityIntel = calculateScraperCapacity(config);
      if (capacityIntel) {
        results.push(capacityIntel);
        globalMaxCapacity += capacityIntel.maxCapacity;
        globalActiveJobs += capacityIntel.activeJobs;
        globalQueuedJobs += config.queuedJobs || 0;
        sumPeakUtilization += capacityIntel.peakUtilization;
      }
    }

    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
      results.push({
        scraperName,
        maxCapacity: 10,
        activeJobs: 0,
        utilizationPercent: 0,
        idleCapacity: 10,
        queuePressurePercent: 0,
        peakUtilization: 0
      });
    }

    if (!scraperName && results.length > 0) {
      const len = results.length;
      let globalUtilizationPercent = Math.round((globalActiveJobs / Math.max(1, globalMaxCapacity)) * 100);
      if (globalUtilizationPercent > 100) globalUtilizationPercent = 100;
      
      const globalQueuePressurePercent = Math.round((globalQueuedJobs / Math.max(1, globalMaxCapacity)) * 100);

      aggregateStats = {
        totalScrapersConfigured: len,
        globalMaxCapacity,
        globalActiveJobs,
        globalUtilizationPercent,
        globalIdleCapacity: Math.max(0, globalMaxCapacity - globalActiveJobs),
        globalQueuePressurePercent,
        avgPeakUtilizationPercent: Math.round(sumPeakUtilization / len),
        systemHealthStatus: globalQueuePressurePercent > 100 ? "WARNING" : "HEALTHY"
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapersConfigured: 0,
        globalMaxCapacity: 0,
        globalActiveJobs: 0,
        globalUtilizationPercent: 0,
        globalIdleCapacity: 0,
        globalQueuePressurePercent: 0,
        avgPeakUtilizationPercent: 0,
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
    console.error("Scraper Capacity API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
