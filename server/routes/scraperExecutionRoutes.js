// server/routes/scraperExecutionRoutes.js
import express from "express";
import RawCollegePage from "../models/RawCollegePage.js";
import { calculateScraperExecution } from "../services/scraperExecutionService.js";

const router = express.Router();

/**
 * GET /api/scraper-execution
 * Returns scraper execution analytics.
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
    let totalJobsSucceeded = 0;
    let totalJobsFailed = 0;
    let totalDuration = 0;
    let totalJobsRun = 0;

    for (const [type, runs] of Object.entries(grouped)) {
      const execStats = calculateScraperExecution(type, runs);
      results.push(execStats);

      totalJobsSucceeded += execStats.jobsSucceeded;
      totalJobsFailed += execStats.jobsFailed;
      totalDuration += execStats.avgDuration * execStats.jobsRun; // re-accumulate
      totalJobsRun += execStats.jobsRun;
    }

    // Sort results alphabetically by scraperName
    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    // Handle case where specific scraper is requested but no data exists
    if (scraperName && results.length === 0) {
       results.push(calculateScraperExecution(scraperName, []));
    }

    if (!scraperName && results.length > 0) {
      const overallSuccessRate = Math.round((totalJobsSucceeded / totalJobsRun) * 100);
      const overallAvgDuration = Math.round(totalDuration / totalJobsRun);

      aggregateStats = {
        totalScrapers: results.length,
        totalJobsRun,
        totalJobsSucceeded,
        totalJobsFailed,
        overallSuccessRate,
        overallAvgDuration
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapers: 0,
        totalJobsRun: 0,
        totalJobsSucceeded: 0,
        totalJobsFailed: 0,
        overallSuccessRate: 0,
        overallAvgDuration: 0
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Execution API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
