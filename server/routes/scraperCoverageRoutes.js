// server/routes/scraperCoverageRoutes.js
import express from "express";
import College from "../models/College.js";
import RawCollegePage from "../models/RawCollegePage.js";
import { calculateScraperCoverage } from "../services/scraperCoverageService.js";

const router = express.Router();

/**
 * GET /api/scraper-coverage
 * Returns scraper coverage intelligence.
 */
router.get("/", async (req, res) => {
  try {
    const colleges = await College.find({})
      .select("collegeCode ranking placements facilities fees gallery")
      .lean();

    const rawPages = await RawCollegePage.find({ crawlStatus: "success" })
      .select("collegeCode canonicalDomain")
      .lean();

    const coverageIntel = calculateScraperCoverage(colleges, rawPages);

    res.status(200).json({
      success: true,
      data: coverageIntel,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Scraper Coverage API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
