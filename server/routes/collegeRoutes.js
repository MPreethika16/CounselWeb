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

    const colleges = await College.find(filter);

    res.json(colleges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;