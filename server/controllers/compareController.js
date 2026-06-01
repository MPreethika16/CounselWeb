import College from "../models/College.js";

const buildBranchSummary = (collegeDocs) => {
  const branchMap = new Map();

  collegeDocs.forEach((college) => {
    if (!college.branchCode || !college.branch) return;

    const key = college.branchCode;

    if (!branchMap.has(key)) {
      branchMap.set(key, {
        branch: college.branch,
        branchCode: college.branchCode,
        bestCutoff: college.cutoff
      });
    } else {
      const existing = branchMap.get(key);

      if (college.cutoff < existing.bestCutoff) {
        existing.bestCutoff = college.cutoff;
      }
    }
  });

  return [...branchMap.values()].sort((a, b) => a.bestCutoff - b.bestCutoff);
};

export const compareColleges = async (req, res) => {
  try {
    const { collegeCodes } = req.body;

    if (!Array.isArray(collegeCodes) || collegeCodes.length < 2) {
      return res.status(400).json({
        error: "Please provide at least 2 college codes"
      });
    }

    const reqYear = req.query.year || req.body.year;
    const year = reqYear ? Number(reqYear) : 2025;
    
    // Check if 2025 data exists in database
    const count2025 = await College.countDocuments({ year: 2025 });
    let selectedYear;
    if (year === 2025 && count2025 === 0) {
      selectedYear = 2024;
    } else {
      selectedYear = [2024, 2025].includes(year) ? year : 2025;
    }

    const uniqueCodes = [...new Set(collegeCodes.map((c) => c.toUpperCase()))];

    const colleges = await College.find({
      collegeCode: { $in: uniqueCodes },
      year: selectedYear
    }).select(
      "name collegeCode branch branchCode cutoff fees district place affiliated placements facilities ranking reviews gallery sourceUrl"
    );

    if (!colleges.length) {
      return res.status(404).json({
        error: "No colleges found"
      });
    }

    const grouped = new Map();

    colleges.forEach((college) => {
      if (!grouped.has(college.collegeCode)) {
        grouped.set(college.collegeCode, []);
      }

      grouped.get(college.collegeCode).push(college);
    });

    const comparison = [];

    uniqueCodes.forEach((code) => {
      const docs = grouped.get(code);

      if (!docs || docs.length === 0) return;

      const first = docs[0];

      comparison.push({
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
        branches: buildBranchSummary(docs)
      });
    });

    res.json({
      count: comparison.length,
      colleges: comparison
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};