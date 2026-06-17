// server/routes/scraperRoiRoutes.js
import express from "express";
import ScraperRoi from "../models/ScraperRoi.js";
import { calculateScraperRoi } from "../services/scraperRoiService.js";

const router = express.Router();

/**
 * GET /api/scraper-roi
 * Returns scraper ROI intelligence including top/bottom performers dynamically.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const configs = await ScraperRoi.find(query).lean();

    const results = [];
    let aggregateStats = null;

    let globalCostUsd = 0;
    let globalRecordsProduced = 0;
    let sumRoiScore = 0;

    for (const config of configs) {
      const roiIntel = calculateScraperRoi(config);
      if (roiIntel) {
        results.push(roiIntel);
        globalCostUsd += roiIntel.scrapeCost;
        globalRecordsProduced += roiIntel.recordsProduced;
        sumRoiScore += roiIntel.roiScore;
      }
    }

    // Sort by roiScore descending for global arrays
    results.sort((a, b) => b.roiScore - a.roiScore);

    if (scraperName && results.length === 0) {
      results.push({
        scraperName,
        scrapeCost: 0,
        recordsProduced: 0,
        successRate: 0,
        costPerRecord: 0,
        roiScore: 0
      });
    }

    if (!scraperName && results.length > 0) {
      const len = results.length;
      
      const topScraper = results[0];
      const bottomScraper = results[len - 1];

      let globalCostPerRecord = 0;
      if (globalRecordsProduced > 0) {
        globalCostPerRecord = globalCostUsd / globalRecordsProduced;
      }

      aggregateStats = {
        totalScrapersConfigured: len,
        globalCostUsd: Number(globalCostUsd.toFixed(4)),
        globalRecordsProduced,
        globalCostPerRecord: Number(globalCostPerRecord.toFixed(4)),
        avgRoiScore: Math.round(sumRoiScore / len),
        topScraper: {
          scraperName: topScraper.scraperName,
          roiScore: topScraper.roiScore
        },
        bottomScraper: {
          scraperName: bottomScraper.scraperName,
          roiScore: bottomScraper.roiScore
        }
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapersConfigured: 0,
        globalCostUsd: 0,
        globalRecordsProduced: 0,
        globalCostPerRecord: 0,
        avgRoiScore: 0,
        topScraper: null,
        bottomScraper: null
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper ROI API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
