// server/routes/scraperBenchmarkRoutes.js
import express from "express";
import ScraperBenchmark from "../models/ScraperBenchmark.js";
import { calculateScraperBenchmark } from "../services/scraperBenchmarkService.js";

const router = express.Router();

/**
 * GET /api/scraper-benchmarks
 * Returns scraper benchmark intelligence, ranking models dynamically natively against global arrays.
 * Optional query parameter: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;

    // We must query ALL records to accurately generate global averages,
    // even if a specific scraperName is requested, otherwise the relative math breaks.
    const allConfigs = await ScraperBenchmark.find({}).lean();
    
    // To calculate medians, we need arrays
    const successArr = [];
    const durationArr = [];
    const roiArr = [];
    const costArr = [];

    for (const config of allConfigs) {
      successArr.push(config.successRate || 0);
      durationArr.push(config.durationMs || 0);
      roiArr.push(config.roiScore || 0);
      costArr.push(config.costUsd || 0);
    }

    const getMedian = (arr) => {
      if (arr.length === 0) return 0;
      arr.sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      if (arr.length % 2 !== 0) return arr[mid];
      return (arr[mid - 1] + arr[mid]) / 2;
    };

    const globals = {
      medianSuccessRate: getMedian(successArr),
      medianDurationMs: getMedian(durationArr),
      medianRoiScore: getMedian(roiArr),
      medianCostUsd: getMedian(costArr)
    };

    const results = [];
    
    // If a scraperName was provided, filter *after* calculating globals.
    const targetConfigs = scraperName 
      ? allConfigs.filter(c => c.scraperName === scraperName)
      : allConfigs;

    for (const config of targetConfigs) {
      const benchmarkIntel = calculateScraperBenchmark(config, globals);
      if (benchmarkIntel) {
        results.push(benchmarkIntel);
      }
    }

    // Sort descending by percentileRanking, with tie-breaking via scraperName
    results.sort((a, b) => {
      if (b.percentileRanking === a.percentileRanking) {
        return a.scraperName.localeCompare(b.scraperName);
      }
      return b.percentileRanking - a.percentileRanking;
    });

    if (scraperName && results.length === 0) {
      // Return an empty template safely
      results.push({
        scraperName,
        metrics: { successRate: 0, durationMs: 0, roiScore: 0, costUsd: 0, totalRuns: 0 },
        comparisons: { successRateAboveAvg: false, durationBetterThanAvg: false, roiScoreAboveAvg: false, costBetterThanAvg: false },
        trends: { trend7d: 0, trend30d: 0 },
        percentileRanking: 0,
        overallStatus: "INSUFFICIENT_DATA"
      });
    }

    let aggregateStats = null;
    if (!scraperName) {
      aggregateStats = {
        totalScrapersConfigured: allConfigs.length,
        globals: {
          medianSuccessRate: Number(globals.medianSuccessRate.toFixed(4)),
          medianDurationMs: Math.round(globals.medianDurationMs),
          medianRoiScore: Math.round(globals.medianRoiScore),
          medianCostUsd: Number(globals.medianCostUsd.toFixed(4))
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
    console.error("Scraper Benchmark API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
