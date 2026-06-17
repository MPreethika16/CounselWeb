// server/routes/benchmarkDashboardRoutes.js
import express from "express";
import ScraperBenchmark from "../models/ScraperBenchmark.js";
import { calculateScraperBenchmark } from "../services/scraperBenchmarkService.js";
import { calculateBenchmarkDashboard } from "../services/benchmarkDashboardService.js";

const router = express.Router();

/**
 * GET /api/benchmark-dashboard
 * Returns aggregated tracking distribution across the ecosystem perfectly natively.
 */
router.get("/", async (req, res) => {
  try {
    const allConfigs = await ScraperBenchmark.find({}).lean();
    
    // 1. First recreate the medians exactly like the standard benchmark route
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

    // 2. Generate the intel for every array
    const intelResults = [];
    for (const config of allConfigs) {
      const benchmarkIntel = calculateScraperBenchmark(config, globals);
      if (benchmarkIntel) {
        intelResults.push(benchmarkIntel);
      }
    }

    // 3. Sort identically to benchmark routes (Percentile + ScraperName fallback)
    intelResults.sort((a, b) => {
      if (b.percentileRanking === a.percentileRanking) {
        return a.scraperName.localeCompare(b.scraperName);
      }
      return b.percentileRanking - a.percentileRanking;
    });

    // 4. Pass sorted logic to dashboard service
    const dashboardStats = calculateBenchmarkDashboard(intelResults);

    res.status(200).json({
      success: true,
      data: dashboardStats,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Benchmark Dashboard API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
