import express from "express";
import { getRecommendations } from "../services/recommendationService.js";

const router = express.Router();

/**
 * GET /api/recommendations
 * Query parameters:
 *  - maxFees (number)
 *  - naacGrade (string)
 *  - nirfRankMax (number)
 *  - course (string)
 *  - state (string)
 *  - managementQuota (boolean string)
 *  - minPlacementPercentage (number)
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      maxFees: req.query.maxFees ? parseInt(req.query.maxFees) : undefined,
      naacGrade: req.query.naacGrade || undefined,
      nirfRankMax: req.query.nirfRankMax ? parseInt(req.query.nirfRankMax) : undefined,
      course: req.query.course || undefined,
      state: req.query.state || undefined,
      managementQuota: req.query.managementQuota || undefined,
      minPlacementPercentage: req.query.minPlacementPercentage ? parseInt(req.query.minPlacementPercentage) : undefined
    };

    const options = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 10,
      sortBy: req.query.sortBy || 'bestOverall'
    };

    const recommendations = await getRecommendations(filters, options);
    res.json({ 
      success: true, 
      count: recommendations.data.length,
      total: recommendations.total,
      page: recommendations.page,
      limit: recommendations.limit,
      isFallback: recommendations.isFallback,
      data: recommendations.data
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
