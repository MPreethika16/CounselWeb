import College from "../models/College.js";

export const predictColleges = async (req, res) => {
  try {
    const {
      rank,
      category,
      gender,
      district,
      branch,
      selectedBranch,
      maxFees
    } = req.body;

    if (!rank || !category || !gender) {
      return res.status(400).json({ error: "Missing inputs" });
    }

    const userRank = Number(rank);
    const selected = branch || selectedBranch;

    const query = {
      category,
      gender,
      cutoff: { $gte: userRank }
    };

    if (district) {
      query.district = district;
    }

    if (maxFees) {
      query.fees = { $lte: Number(maxFees) };
    }

    if (selected) {
      query.$or = [
        { branchCode: selected },
        { branchCode: selected.toUpperCase() },
        { branch: { $regex: selected, $options: "i" } }
      ];
    }

    let colleges = await College.find(query)
      .select(
        "name collegeCode branch branchCode cutoff fees district affiliated place"
      )
      .sort({ cutoff: 1 })
      .limit(100);

    colleges = colleges.map((college) => {
      const diff = college.cutoff - userRank;

      let score = 0;

      if (diff >= 20000) score = 100;
      else if (diff >= 10000) score = 90;
      else if (diff >= 5000) score = 80;
      else if (diff >= 0) score = 70;
      else score = 40;

      if (college.fees <= 60000) {
        score += 5;
      }

      return {
        ...college._doc,
        score: Math.min(score, 100)
      };
    });

    colleges.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.fees - b.fees;
    });

    const top3 = colleges.slice(0, 3);

    res.json({
      recommendations: top3
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};