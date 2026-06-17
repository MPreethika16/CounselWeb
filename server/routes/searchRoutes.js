import express from "express";
import { executeSearch, getPopularSearches } from "../services/searchService.js";
import { getSuggestions } from "../services/autocompleteService.js";
import { compareColleges } from "../services/comparisonService.js";

const router = express.Router();

/**
 * GET /api/search
 */
router.get("/", async (req, res) => {
  try {
    const params = {
      query: req.query.q || undefined,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 10,
      sortBy: req.query.sortBy || 'bestOverall',
      maxFees: req.query.maxFees ? parseInt(req.query.maxFees) : undefined,
      naacGrade: req.query.naacGrade || undefined,
      nirfRankMax: req.query.nirfRankMax ? parseInt(req.query.nirfRankMax) : undefined,
      course: req.query.course || undefined,
      state: req.query.state || undefined,
      managementQuota: req.query.managementQuota || undefined,
      minPlacementPercentage: req.query.minPlacementPercentage ? parseInt(req.query.minPlacementPercentage) : undefined
    };

    const results = await executeSearch(params);
    res.json({ success: true, ...results });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

/**
 * GET /api/search/autocomplete
 */
router.get("/autocomplete", async (req, res) => {
  try {
    const query = req.query.q;
    const type = req.query.type || 'all';
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    
    const suggestions = await getSuggestions(query, type, limit);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Autocomplete error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

/**
 * POST /api/search/compare
 */
router.post("/compare", async (req, res) => {
  try {
    const { collegeCodes } = req.body;
    if (!collegeCodes || !Array.isArray(collegeCodes)) {
      return res.status(400).json({ success: false, message: "collegeCodes array is required." });
    }

    const comparisonData = await compareColleges(collegeCodes);
    res.json({ success: true, data: comparisonData });
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

/**
 * GET /api/search/popular
 */
router.get("/popular", async (req, res) => {
  try {
    const popular = await getPopularSearches();
    res.json({ success: true, data: popular });
  } catch (error) {
    console.error("Popular searches error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// GET /api/search/facets -> Facets are returned within GET /api/search now to save network calls.
// We can expose an isolated one if required later.

export default router;
