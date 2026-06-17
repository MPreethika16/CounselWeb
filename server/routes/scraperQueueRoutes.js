// server/routes/scraperQueueRoutes.js
import express from "express";
import ScraperJob from "../models/ScraperJob.js";
import { calculateScraperQueue } from "../services/scraperQueueService.js";

const router = express.Router();

/**
 * GET /api/scraper-queue
 * Returns scraper queue intelligence metrics.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const jobs = await ScraperJob.find(query)
      .select("scraperName status queuedAt startedAt completedAt")
      .lean();

    const grouped = jobs.reduce((acc, job) => {
      const type = job.scraperName || "unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(job);
      return acc;
    }, {});

    const results = [];
    let aggregateStats = null;
    const globalCounts = { queued: 0, running: 0, completed: 0, failed: 0 };
    let globalTotalWaitTime = 0;
    let globalWaitTimeSamples = 0;
    let globalOldestQueuedAt = null;

    for (const [type, typeJobs] of Object.entries(grouped)) {
      const queueIntel = calculateScraperQueue(type, typeJobs, 10);
      results.push(queueIntel);

      globalCounts.queued += queueIntel.queued;
      globalCounts.running += queueIntel.running;
      globalCounts.completed += queueIntel.completed;
      globalCounts.failed += queueIntel.failed;

      // Extract wait times directly from jobs for global avg
      for (const job of typeJobs) {
        if (job.queuedAt && job.startedAt) {
          const waitTime = new Date(job.startedAt).getTime() - new Date(job.queuedAt).getTime();
          if (waitTime >= 0) {
            globalTotalWaitTime += waitTime;
            globalWaitTimeSamples++;
          }
        }
      }

      if (queueIntel.oldestQueuedAt) {
        const qTime = new Date(queueIntel.oldestQueuedAt).getTime();
        if (!globalOldestQueuedAt || qTime < new Date(globalOldestQueuedAt).getTime()) {
          globalOldestQueuedAt = queueIntel.oldestQueuedAt;
        }
      }
    }

    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
      results.push(calculateScraperQueue(scraperName, [], 10));
    }

    if (!scraperName && results.length > 0) {
      // Assuming global max capacity is 10 * number of scrapers, or just max capacity 10 if we share a pool.
      // Let's assume a global pool of 10 for simplicity.
      const maxGlobalCapacity = 10;
      
      aggregateStats = {
        totalScrapers: results.length,
        overallCounts: globalCounts,
        overallAvgWaitTimeMs: globalWaitTimeSamples > 0 ? Math.round(globalTotalWaitTime / globalWaitTimeSamples) : 0,
        overallQueueUtilizationPercentage: Math.round((globalCounts.running / maxGlobalCapacity) * 100),
        overallOldestQueuedAt: globalOldestQueuedAt ? new Date(globalOldestQueuedAt).toISOString() : null
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapers: 0,
        overallCounts: { queued: 0, running: 0, completed: 0, failed: 0 },
        overallAvgWaitTimeMs: 0,
        overallQueueUtilizationPercentage: 0,
        overallOldestQueuedAt: null
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Queue API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
