// server/routes/coverageRoutes.js
import express from "express";
import CollegeMaster from "../models/CollegeMaster.js";
import { calculateCoverage } from "../services/coverageService.js";

const router = express.Router();

/**
 * GET /api/coverage
 * Returns scrape completeness coverage analytics across the entire database.
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

    // Fetch colleges efficiently (use lean since we only need data to read)
    const colleges = await CollegeMaster.find(query)
      .select("collegeCode collegeName officialData")
      .lean();

    const results = colleges.map((c) => calculateCoverage(c));

    // Calculate aggregated stats if we're querying all colleges
    let aggregateStats = null;
    if (!collegeCode && results.length > 0) {
      let totalScore = 0;
      const levelCounts = { COMPLETE: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      
      for (const r of results) {
        totalScore += r.coverageScore;
        levelCounts[r.completenessLevel]++;
      }
      
      aggregateStats = {
        averageCoverageScore: Math.round(totalScore / results.length),
        totalColleges: results.length,
        levelCounts
      };
    }

    res.status(200).json({
      success: true,
      aggregateStats,
      data: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Coverage API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
