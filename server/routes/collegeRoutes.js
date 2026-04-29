import express from "express";
import College from "../models/College.js";

const router = express.Router();

// GET colleges with filters
router.get("/", async (req, res) => {
  try {
    const { category, gender, district } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (district) filter.district = district;

    const page = Number(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const colleges = await College.find(filter)
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      count: colleges.length,
      colleges
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;