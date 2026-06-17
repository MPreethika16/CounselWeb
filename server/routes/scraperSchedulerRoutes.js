// server/routes/scraperSchedulerRoutes.js
import express from "express";
import ScraperSchedule from "../models/ScraperSchedule.js";
import { calculateScraperScheduler } from "../services/scraperSchedulerService.js";

const router = express.Router();

/**
 * GET /api/scraper-scheduler
 * Returns scraper scheduler intelligence metrics.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    const query = {};
    if (scraperName) {
      query.scraperName = scraperName;
    }

    const schedules = await ScraperSchedule.find(query)
      .select("scraperName executionFrequencyMs lastRunAt nextRunAt isActive")
      .lean();

    const grouped = schedules.reduce((acc, sched) => {
      const type = sched.scraperName || "unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(sched);
      return acc;
    }, {});

    const results = [];
    let aggregateStats = null;
    let globalScheduledJobs = 0;
    let globalMissedRuns = 0;
    let globalOverdueJobs = 0;

    for (const [type, typeSchedules] of Object.entries(grouped)) {
      const scheduleIntel = calculateScraperScheduler(type, typeSchedules);
      results.push(scheduleIntel);

      globalScheduledJobs += scheduleIntel.scheduledJobs;
      globalMissedRuns += scheduleIntel.missedRuns;
      globalOverdueJobs += scheduleIntel.overdueJobs;
    }

    results.sort((a, b) => a.scraperName.localeCompare(b.scraperName));

    if (scraperName && results.length === 0) {
      results.push(calculateScraperScheduler(scraperName, []));
    }

    if (!scraperName && results.length > 0) {
      aggregateStats = {
        totalScrapersConfigured: results.length,
        globalScheduledJobs,
        globalMissedRuns,
        globalOverdueJobs,
        systemHealthStatus: globalMissedRuns > 0 ? "WARNING" : "HEALTHY"
      };
    } else if (!scraperName && results.length === 0) {
      aggregateStats = {
        totalScrapersConfigured: 0,
        globalScheduledJobs: 0,
        globalMissedRuns: 0,
        globalOverdueJobs: 0,
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
    console.error("Scraper Scheduler API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
