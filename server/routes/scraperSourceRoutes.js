// server/routes/scraperSourceRoutes.js
import express from "express";
import RawCollegePage from "../models/RawCollegePage.js";
import { calculateScraperSources } from "../services/scraperSourceService.js";

const router = express.Router();

/**
 * GET /api/scraper-sources
 * Returns scraper source intelligence.
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
      .select("pageType canonicalDomain crawlStatus crawledAt durationMs")
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
    let globalTotalRuns = 0;
    const globalDomainMap = {};

    for (const [type, runs] of Object.entries(grouped)) {
      const sourceIntel = calculateScraperSources(type, runs);
      results.push(sourceIntel);

      for (const source of sourceIntel.sources) {
        globalTotalRuns += source.totalRuns;
        
        if (!globalDomainMap[source.domain]) {
          globalDomainMap[source.domain] = {
            domain: source.domain,
            totalRuns: 0,
            successCount: 0,
            failureCount: 0,
            totalDuration: 0
          };
        }
        const gStats = globalDomainMap[source.domain];
        gStats.totalRuns += source.totalRuns;
        gStats.successCount += source.successCount;
        gStats.failureCount += source.failureCount;
        gStats.totalDuration += (source.avgDuration * source.totalRuns);
      }
    }

    // Sort results alphabetically by scraperName for determinism
    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
       results.push(calculateScraperSources(scraperName, []));
    }

    if (!scraperName && results.length > 0) {
      const globalSources = Object.values(globalDomainMap).map(g => ({
        domain: g.domain,
        totalRuns: g.totalRuns,
        successRate: Math.round((g.successCount / g.totalRuns) * 100),
        avgDuration: Math.round(g.totalDuration / g.totalRuns)
      })).sort((a, b) => b.totalRuns - a.totalRuns);

      aggregateStats = {
        totalScrapers: results.length,
        totalDomainsScraped: globalSources.length,
        globalTotalRuns,
        topDomains: globalSources.slice(0, 10)
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapers: 0,
        totalDomainsScraped: 0,
        globalTotalRuns: 0,
        topDomains: []
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Source API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
