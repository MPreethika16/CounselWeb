// server/routes/qualityRoutes.js
import express from "express";
import CollegeMaster from "../models/CollegeMaster.js";
import { calculateQuality } from "../services/qualityService.js";

const router = express.Router();

/**
 * GET /api/quality
 * Returns data quality analytics across the entire database.
 * Optional query parameter: ?collegeCode=CODE
 */
router.get("/", async (req, res) => {
  try {
    const { collegeCode } = req.query;

    // Build query filter
    const query = {};
    if (collegeCode) {
      query.collegeCode = collegeCode;
    }

    // Lean fetch — we only need fields used by qualityService
    const colleges = await CollegeMaster.find(query)
      .select(
        "collegeCode collegeName officialData.contact officialData.accreditation officialData.placements officialData.facilitiesCount officialData.freshness"
      )
      .lean();

    const results = colleges.map((c) => calculateQuality(c));

    // Aggregate stats when fetching all colleges
    let aggregateStats = null;
    if (!collegeCode && results.length > 0) {
      let totalScore = 0;
      const levelCounts = { EXCELLENT: 0, GOOD: 0, FAIR: 0, POOR: 0 };
      let totalMissing = 0;
      let totalInvalid = 0;
      let totalStale = 0;

      for (const r of results) {
        totalScore += r.qualityScore;
        levelCounts[r.qualityLevel]++;
        totalMissing += r.missingCount;
        totalInvalid += r.invalidCount;
        totalStale += r.staleCount;
      }

      aggregateStats = {
        averageQualityScore: Math.round(totalScore / results.length),
        totalColleges: results.length,
        levelCounts,
        totalMissingCount: totalMissing,
        totalInvalidCount: totalInvalid,
        totalStaleCount: totalStale
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Quality API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
