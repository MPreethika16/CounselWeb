import express from "express";
import College from "../models/College.js";

const router = express.Router();

// GET all filters for frontend
router.get("/filters", async (req, res) => {
  try {
    const districts = await College.distinct("district");

    const branches = await College.aggregate([
      {
        $group: {
          _id: "$branch",
          branch: { $first: "$branch" },
          branchCode: { $first: "$branchCode" }
        }
      },
      {
        $sort: {
          branch: 1
        }
      }
    ]);

    res.json({
      districts: districts.filter(Boolean).sort(),
      branches: branches.filter((b) => b.branch && b.branchCode)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique branches
router.get("/branches", async (req, res) => {
  try {
    const branches = await College.aggregate([
      {
        $group: {
          _id: "$branch",
          branch: { $first: "$branch" },
          branchCode: { $first: "$branchCode" }
        }
      },
      {
        $sort: {
          branch: 1
        }
      }
    ]);

    res.json({
      branches: branches.filter((b) => b.branch && b.branchCode)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET colleges with filters
router.get("/", async (req, res) => {
  try {
    const { category, gender, district } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (district) filter.district = district;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const colleges = await College.find(filter)
      .select(
        "name collegeCode branch branchCode category gender cutoff fees district affiliated place"
      )
      .skip(skip)
      .limit(limit);

    const total = await College.countDocuments(filter);

    res.json({
      page,
      limit,
      total,
      count: colleges.length,
      colleges
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;