// server/routes/scraperTrendRoutes.js
import express from "express";
import RawCollegePage from "../models/RawCollegePage.js";
import { calculateScraperTrends } from "../services/scraperTrendService.js";

const router = express.Router();

/**
 * GET /api/scraper-trends
 * Returns scraper trend analytics.
 * Optional query parameter: ?scraperName=NAME (maps to pageType)
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;

    const query = {};
    if (scraperName) {
      query.pageType = scraperName;
    }

    const pages = await RawCollegePage.find(query)
      .select("pageType crawlStatus crawledAt durationMs")
      .lean();

    // Group by pageType (scraperName)
    const grouped = pages.reduce((acc, page) => {
      const type = page.pageType || "unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(page);
      return acc;
    }, {});

    const results = [];
    let aggregateStats = null;
    let totalRuns7d = 0;
    let totalRuns30d = 0;
    let totalSuccess7d = 0;
    let totalSuccess30d = 0;

    for (const [type, runs] of Object.entries(grouped)) {
      const trends = calculateScraperTrends(type, runs);
      results.push(trends);

      totalRuns7d += trends.windows["7d"].totalRuns;
      totalRuns30d += trends.windows["30d"].totalRuns;
      
      // Calculate successes from rates and totals
      totalSuccess7d += Math.round((trends.windows["7d"].successRate / 100) * trends.windows["7d"].totalRuns);
      totalSuccess30d += Math.round((trends.windows["30d"].successRate / 100) * trends.windows["30d"].totalRuns);
    }

    // Sort results alphabetically by scraperName
    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
       results.push(calculateScraperTrends(scraperName, []));
    }

    if (!scraperName && results.length > 0) {
      const overallSuccessRate7d = totalRuns7d > 0 ? Math.round((totalSuccess7d / totalRuns7d) * 100) : 0;
      const overallSuccessRate30d = totalRuns30d > 0 ? Math.round((totalSuccess30d / totalRuns30d) * 100) : 0;

      aggregateStats = {
        totalScrapers: results.length,
        windows: {
          "7d": { totalRuns: totalRuns7d, overallSuccessRate: overallSuccessRate7d },
          "30d": { totalRuns: totalRuns30d, overallSuccessRate: overallSuccessRate30d }
        }
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapers: 0,
        windows: {
          "7d": { totalRuns: 0, overallSuccessRate: 0 },
          "30d": { totalRuns: 0, overallSuccessRate: 0 }
        }
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Trends API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
