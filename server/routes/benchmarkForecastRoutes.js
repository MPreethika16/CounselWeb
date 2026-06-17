// server/routes/benchmarkForecastRoutes.js
import express from "express";
import BenchmarkSnapshot from "../models/BenchmarkSnapshot.js";
import { calculateForecast } from "../services/benchmarkForecastService.js";

const router = express.Router();

/**
 * GET /api/benchmark-forecast
 * Pulls historical time-series and returns a deterministic forecast.
 * Query: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName, useEma } = req.query;
    
    if (!scraperName) {
      return res.status(400).json({ success: false, error: "scraperName is required" });
    }

    // Pull all snapshots for this scraper, up to 30 days old
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const snapshots = await BenchmarkSnapshot.find({ 
      scraperName,
      snapshotDate: { $gte: thirtyDaysAgo }
    })
      .sort({ snapshotDate: -1 })
      .lean();

    const isEma = useEma === "true";
    const forecast = calculateForecast(snapshots, isEma);

    res.status(200).json({
      success: true,
      scraperName,
      data: forecast,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Benchmark Forecast API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
