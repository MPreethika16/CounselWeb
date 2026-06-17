import express from "express";
import {
  getOverviewDashboard,
  getRecommendationDashboard,
  getSearchAnalyticsDashboard,
  getCoverageDashboard,
  getQualityDashboard,
  getScraperHealthDashboard,
  getTrendsDashboard
} from "../services/dashboardService.js";

const router = express.Router();

router.get("/overview", async (req, res) => {
  try {
    const data = await getOverviewDashboard();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/recommendations", async (req, res) => {
  try {
    const data = await getRecommendationDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/search-analytics", async (req, res) => {
  try {
    const data = await getSearchAnalyticsDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/coverage", async (req, res) => {
  try {
    const data = await getCoverageDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/quality", async (req, res) => {
  try {
    const data = await getQualityDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/scraper-health", async (req, res) => {
  try {
    const data = await getScraperHealthDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/trends", async (req, res) => {
  try {
    const data = await getTrendsDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
