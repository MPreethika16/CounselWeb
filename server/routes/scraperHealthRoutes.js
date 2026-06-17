// server/routes/scraperHealthRoutes.js
import express from "express";
import RawCollegePage from "../models/RawCollegePage.js";
import { calculateScraperHealth } from "../services/scraperHealthService.js";

const router = express.Router();

/**
 * GET /api/scraper-health
 * Returns scraper health analytics.
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
    let totalSuccess = 0;
    let totalFailure = 0;
    let totalDuration = 0;
    let totalRunsOverall = 0;
    const statusCounts = { HEALTHY: 0, WARNING: 0, CRITICAL: 0 };

    for (const [type, runs] of Object.entries(grouped)) {
      const health = calculateScraperHealth(type, runs);
      results.push(health);

      totalSuccess += health.successCount;
      totalFailure += health.failureCount;
      totalDuration += health.avgDuration * health.totalRuns; // re-accumulate
      totalRunsOverall += health.totalRuns;
      statusCounts[health.healthStatus]++;
    }

    // Sort results alphabetically by scraperName
    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    // Handle case where specific scraper is requested but no data exists
    if (scraperName && results.length === 0) {
       results.push(calculateScraperHealth(scraperName, []));
    }

    if (!scraperName && results.length > 0) {
      const overallSuccessRate = Math.round((totalSuccess / totalRunsOverall) * 100);
      const overallFailureRate = Math.round((totalFailure / totalRunsOverall) * 100);
      const overallAvgDuration = Math.round(totalDuration / totalRunsOverall);
      
      let overallHealthStatus;
      if (overallSuccessRate >= 90) overallHealthStatus = "HEALTHY";
      else if (overallSuccessRate >= 70) overallHealthStatus = "WARNING";
      else overallHealthStatus = "CRITICAL";

      aggregateStats = {
        totalScrapers: results.length,
        totalRunsOverall,
        overallSuccessRate,
        overallFailureRate,
        overallAvgDuration,
        overallHealthStatus,
        statusCounts
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapers: 0,
        totalRunsOverall: 0,
        overallSuccessRate: 0,
        overallFailureRate: 0,
        overallAvgDuration: 0,
        overallHealthStatus: "CRITICAL",
        statusCounts: { HEALTHY: 0, WARNING: 0, CRITICAL: 0 }
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Health API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
