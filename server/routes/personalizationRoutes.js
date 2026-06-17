import express from "express";
import {
  getPreferences,
  updatePreferences,
  getPersonalizedRecommendations,
  saveCollege,
  removeSavedCollege,
  getSavedColleges,
  getHistory,
  getInferredPreferences,
  logViewHistory
} from "../services/personalizationService.js";

const router = express.Router();

// Middleware to extract userId (mock implementation for MVP)
const requireUser = (req, res, next) => {
  req.userId = req.headers["x-user-id"] || "default_user_1";
  next();
};

router.use(requireUser);

router.get("/preferences", async (req, res) => {
  try {
    const prefs = await getPreferences(req.userId);
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/preferences", async (req, res) => {
  try {
    const prefs = await updatePreferences(req.userId, req.body);
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/recommendations", async (req, res) => {
  try {
    // Forward query params as filters
    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;
    delete filters.sortBy;

    const options = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 10,
      sortBy: req.query.sortBy || 'bestOverall'
    };

    const recs = await getPersonalizedRecommendations(req.userId, filters, options);
    res.json({ success: true, ...recs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/save/:collegeCode", async (req, res) => {
  try {
    await saveCollege(req.userId, req.params.collegeCode);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.delete("/save/:collegeCode", async (req, res) => {
  try {
    await removeSavedCollege(req.userId, req.params.collegeCode);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/saved", async (req, res) => {
  try {
    const saved = await getSavedColleges(req.userId);
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await getHistory(req.userId);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/view/:collegeCode", async (req, res) => {
  try {
    await logViewHistory(req.userId, req.params.collegeCode);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/inferred", async (req, res) => {
  try {
    const inferred = await getInferredPreferences(req.userId);
    res.json({ success: true, data: inferred });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
