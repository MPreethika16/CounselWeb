// server/routes/scraperCostRoutes.js
import express from "express";
import ScraperCost from "../models/ScraperCost.js";
import { calculateScraperCost } from "../services/scraperCostService.js";

const router = express.Router();

/**
 * GET /api/scraper-cost
 * Returns scraper cost intelligence and global financial aggregations.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const configs = await ScraperCost.find(query).lean();

    const results = [];
    let aggregateStats = null;

    let globalTotalRequests = 0;
    let globalTotalBandwidthGB = 0;
    let globalTotalStorageGB = 0;
    let globalTotalComputeHours = 0;
    let globalEstimatedTotalCost = 0;

    for (const config of configs) {
      const costIntel = calculateScraperCost(config);
      if (costIntel) {
        results.push(costIntel);
        globalTotalRequests += costIntel.resources.requests;
        globalTotalBandwidthGB += costIntel.resources.bandwidthGB;
        globalTotalStorageGB += costIntel.resources.storageGB;
        globalTotalComputeHours += costIntel.resources.computeHours;
        globalEstimatedTotalCost += costIntel.costs.estimatedTotalCost;
      }
    }

    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
      results.push({
        scraperName,
        resources: { requests: 0, bandwidthGB: 0, storageGB: 0, computeHours: 0 },
        costs: { requestCost: 0, bandwidthCost: 0, storageCost: 0, computeCost: 0, estimatedTotalCost: 0 }
      });
    }

    if (!scraperName && results.length > 0) {
      aggregateStats = {
        totalScrapersConfigured: results.length,
        globalResources: {
          totalRequests: globalTotalRequests,
          totalBandwidthGB: Number(globalTotalBandwidthGB.toFixed(4)),
          totalStorageGB: Number(globalTotalStorageGB.toFixed(4)),
          totalComputeHours: Number(globalTotalComputeHours.toFixed(4))
        },
        globalEstimatedTotalCost: Number(globalEstimatedTotalCost.toFixed(4)),
        systemFinancialStatus: globalEstimatedTotalCost > 100 ? "WARNING" : "HEALTHY" // example arbitrary threshold 100$
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapersConfigured: 0,
        globalResources: {
          totalRequests: 0,
          totalBandwidthGB: 0,
          totalStorageGB: 0,
          totalComputeHours: 0
        },
        globalEstimatedTotalCost: 0,
        systemFinancialStatus: "HEALTHY"
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Cost API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
