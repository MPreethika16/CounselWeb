// server/routes/scraperFailureRoutes.js
import express from "express";
import RawCollegePage from "../models/RawCollegePage.js";
import { calculateScraperFailures } from "../services/scraperFailureService.js";

const router = express.Router();

/**
 * GET /api/scraper-failures
 * Returns scraper failure intelligence.
 * Optional query parameter: ?scraperName=NAME (maps to pageType)
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;

    const query = { crawlStatus: "failed" };
    if (scraperName) {
      query.pageType = scraperName;
    }

    const failedPages = await RawCollegePage.find(query)
      .select("pageType collegeCode failureReason statusCode crawledAt")
      .lean();

    // Group by pageType (scraperName)
    const grouped = failedPages.reduce((acc, page) => {
      const type = page.pageType || "unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(page);
      return acc;
    }, {});

    const results = [];
    let aggregateStats = null;
    let totalFailuresOverall = 0;
    const globalReasonCounts = { timeout: 0, dns: 0, parse: 0, blocked: 0, other: 0 };
    const globalCollegeFailures = {};

    for (const [type, runs] of Object.entries(grouped)) {
      const failures = calculateScraperFailures(type, runs);
      results.push(failures);

      totalFailuresOverall += failures.totalFailures;
      
      // Accumulate global reasons
      for (const reason of Object.keys(globalReasonCounts)) {
        globalReasonCounts[reason] += failures.reasons[reason].count;
      }

      // Accumulate global colleges
      for (const run of runs) {
        const code = run.collegeCode || "UNKNOWN";
        globalCollegeFailures[code] = (globalCollegeFailures[code] || 0) + 1;
      }
    }

    // Sort results alphabetically by scraperName for determinism
    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
       results.push(calculateScraperFailures(scraperName, []));
    }

    if (!scraperName && results.length > 0) {
      // Calculate global reason percentages
      const overallReasons = {};
      for (const [key, count] of Object.entries(globalReasonCounts)) {
        overallReasons[key] = {
          count,
          percentage: totalFailuresOverall > 0 ? Math.round((count / totalFailuresOverall) * 100) : 0
        };
      }

      // Top failing scrapers
      const topFailingScrapers = results
        .map((r) => ({ scraperName: r.scraperName, totalFailures: r.totalFailures }))
        .sort((a, b) => b.totalFailures - a.totalFailures)
        .slice(0, 5);

      // Top failing colleges globally
      const topFailingColleges = Object.entries(globalCollegeFailures)
        .map(([collegeCode, count]) => ({ collegeCode, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      aggregateStats = {
        totalFailuresOverall,
        overallReasons,
        topFailingScrapers,
        topFailingColleges
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalFailuresOverall: 0,
        overallReasons: {
          timeout: { count: 0, percentage: 0 },
          dns: { count: 0, percentage: 0 },
          parse: { count: 0, percentage: 0 },
          blocked: { count: 0, percentage: 0 },
          other: { count: 0, percentage: 0 }
        },
        topFailingScrapers: [],
        topFailingColleges: []
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString() // UTC Date
    });
  } catch (err) {
    console.error("Scraper Failure API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
