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
          _id: "$branchCode",
          branch: { $first: "$branch" },
          branchCode: { $first: "$branchCode" },
        },
      },
      {
        $sort: {
          branch: 1,
        },
      },
    ]);

    res.json({
      districts: districts.filter(Boolean).sort(),
      branches: branches.filter((b) => b.branch && b.branchCode),
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
          _id: "$branchCode",
          branch: { $first: "$branch" },
          branchCode: { $first: "$branchCode" },
        },
      },
      {
        $sort: {
          branch: 1,
        },
      },
    ]);

    res.json({
      branches: branches.filter((b) => b.branch && b.branchCode),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET detailed college profile
router.get("/details/:collegeCode", async (req, res) => {
  try {
    const { collegeCode } = req.params;
    let year = 2025;
    if (req.query.year) {
      const parsedYear = Number(req.query.year);
      if (!isNaN(parsedYear)) {
        year = parsedYear;
      }
    }
    
    // Check if 2025 data exists in database
    const has2025 = await College.exists({ year: 2025 });
    let selectedYear;
    if (year === 2025 && !has2025) {
      selectedYear = 2024;
    } else {
      selectedYear = [2024, 2025].includes(year) ? year : 2025;
    }

    const colleges = await College.find({
      collegeCode: collegeCode.toUpperCase(),
      year: selectedYear,
    }).select(
      "name collegeCode branch branchCode category gender cutoff fees district place affiliated placements facilities ranking reviews gallery sourceUrl",
    );

    if (!colleges.length) {
      return res.status(404).json({ error: "College not found" });
    }

    const first = colleges[0];

    const branchMap = new Map();

    colleges.forEach((college) => {
      if (!college.branchCode || !college.branch) return;

      const key = college.branchCode;

      if (!branchMap.has(key)) {
        branchMap.set(key, {
          branch: college.branch,
          branchCode: college.branchCode,
          bestCutoff: college.cutoff,
          cutoffs: [],
        });
      }

      const branchItem = branchMap.get(key);

      if (college.cutoff < branchItem.bestCutoff) {
        branchItem.bestCutoff = college.cutoff;
      }

      branchItem.cutoffs.push({
        category: college.category,
        gender: college.gender,
        cutoff: college.cutoff,
      });
    });

    const branches = [...branchMap.values()]
      .map((branch) => ({
        ...branch,
        cutoffs: branch.cutoffs.sort((a, b) => a.cutoff - b.cutoff),
      }))
      .sort((a, b) => a.bestCutoff - b.bestCutoff);

    res.json({
      name: first.name,
      collegeCode: first.collegeCode,
      place: first.place,
      district: first.district,
      affiliated: first.affiliated,
      fees: first.fees,
      placements: first.placements || {},
      facilities: first.facilities || {},
      ranking: first.ranking || {},
      reviews: first.reviews || [],
      gallery: first.gallery || [],
      sourceUrl: first.sourceUrl || null,
      branches,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET colleges with filters
router.get("/", async (req, res) => {
  try {
    const { category, gender, district, search } = req.query;
    let year = 2025;
    if (req.query.year) {
      const parsedYear = Number(req.query.year);
      if (!isNaN(parsedYear)) {
        year = parsedYear;
      }
    }
    
    // Check if 2025 data exists in database
    const has2025 = await College.exists({ year: 2025 });
    let selectedYear;
    if (year === 2025 && !has2025) {
      selectedYear = 2024;
    } else {
      selectedYear = [2024, 2025].includes(year) ? year : 2025;
    }

    const match = { year: selectedYear };
    if (category) match.category = category;
    if (gender) match.gender = gender;
    if (district) match.district = district;
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: "i" } },
        { collegeCode: { $regex: search, $options: "i" } },
        { district: { $regex: search, $options: "i" } },
        { place: { $regex: search, $options: "i" } }
      ];
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const colleges = await College.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$collegeCode",
          realId: { $first: "$_id" },
          collegeCode: { $first: "$collegeCode" },
          name: { $first: "$name" },
          place: { $first: "$place" },
          district: { $first: "$district" },
          affiliated: { $first: "$affiliated" },
          fees: { $first: "$fees" },
          placements: { $first: "$placements" },
          facilities: { $first: "$facilities" },
          ranking: { $first: "$ranking" }
        }
      },
      {
        $project: {
          _id: "$realId",
          collegeCode: 1,
          name: 1,
          place: 1,
          district: 1,
          affiliated: 1,
          fees: 1,
          placements: 1,
          facilities: 1,
          ranking: 1
        }
      },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const totalUnique = await College.distinct("collegeCode", match);

    res.json({
      page,
      limit,
      total: totalUnique.length,
      count: colleges.length,
      colleges,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
