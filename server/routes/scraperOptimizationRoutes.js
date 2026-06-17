// server/routes/scraperOptimizationRoutes.js
import express from "express";
import ScraperOptimization from "../models/ScraperOptimization.js";
import { calculateScraperOptimization } from "../services/scraperOptimizationService.js";

const router = express.Router();

/**
 * GET /api/scraper-optimization
 * Returns scraper optimization intelligence explicitly sorting structures natively.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const configs = await ScraperOptimization.find(query).lean();

    const results = [];
    let aggregateStats = null;

    let globalSlowCount = 0;
    let globalHighCostCount = 0;
    let globalLowRoiCount = 0;
    let sumRecommendationScore = 0;

    for (const config of configs) {
      const optIntel = calculateScraperOptimization(config);
      if (optIntel) {
        results.push(optIntel);
        if (optIntel.flags.isSlow) globalSlowCount++;
        if (optIntel.flags.isHighCost) globalHighCostCount++;
        if (optIntel.flags.isLowRoi) globalLowRoiCount++;
        sumRecommendationScore += optIntel.recommendationScore;
      }
    }

    // Sort descending by recommendationScore (highest needs optimization first)
    results.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Apply priorityRanking dynamically post-sort (1 is highest priority)
    results.forEach((item, index) => {
      item.priorityRanking = index + 1;
    });

    if (scraperName && results.length === 0) {
      results.push({
        scraperName,
        flags: { isSlow: false, isHighCost: false, isLowRoi: false },
        optimizationOpportunities: [],
        recommendationScore: 0,
        priorityRanking: 1
      });
    }

    if (!scraperName && results.length > 0) {
      const len = results.length;
      aggregateStats = {
        totalScrapersConfigured: len,
        globalOptimizationFlags: {
          slowCount: globalSlowCount,
          highCostCount: globalHighCostCount,
          lowRoiCount: globalLowRoiCount
        },
        avgRecommendationScore: Math.round(sumRecommendationScore / len),
        urgentInterventionsRequired: globalSlowCount > 0 || globalHighCostCount > 0 || globalLowRoiCount > 0
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapersConfigured: 0,
        globalOptimizationFlags: {
          slowCount: 0,
          highCostCount: 0,
          lowRoiCount: 0
        },
        avgRecommendationScore: 0,
        urgentInterventionsRequired: false
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Optimization API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
