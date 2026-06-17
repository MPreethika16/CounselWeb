// server/routes/forecastDashboardRoutes.js
import express from "express";
import { buildForecastDashboard } from "../services/forecastDashboardService.js";

const router = express.Router();

/**
 * GET /api/forecast-dashboard
 *
 * Returns ranked forecast dashboard across all active scrapers.
 *
 * Query params:
 *   useEma  {boolean}  Use EMA slope instead of linear (default: false)
 *   limit   {number}   Top-N per ranked list (default: 5)
 */
router.get("/", async (req, res) => {
  try {
    const useEma = req.query.useEma === "true";
    const limit  = Math.max(1, parseInt(req.query.limit, 10) || 5);

    const dashboard = await buildForecastDashboard({ useEma, limit });

    res.status(200).json({
      success:     true,
      generatedAt: new Date().toISOString(),
      data:        dashboard,
    });
  } catch (err) {
    console.error("Forecast Dashboard API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
