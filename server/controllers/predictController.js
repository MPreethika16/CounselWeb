import College from "../models/College.js";

export const predictColleges = async (req, res) => {
  try {
    const {
      rank,
      category,
      gender,
      district,
      selectedBranch,
      maxFees
    } = req.body;

    if (!rank || !category || !gender) {
      return res.status(400).json({ error: "Missing inputs" });
    }

    const query = { category, gender };

    if (district) query.district = district;
    if (selectedBranch) query.branch = selectedBranch;
    if (maxFees) query.fees = { $lte: maxFees };

    let colleges = await College.find(query)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place");

  
    colleges = colleges.map((c) => {
      const diff = c.cutoff - rank;

      let score = 0;

      if (diff >= 20000) score = 100;
      else if (diff >= 10000) score = 80;
      else if (diff >= 5000) score = 60;
      else if (diff >= 0) score = 40;
      else if (diff >= -5000) score = 20;
      else score = 10;

      return { ...c._doc, score };
    });

    colleges.sort((a, b) => b.score - a.score);

  
    const safeColleges = colleges.filter(c => c.score >= 80);

  
    const top3 = safeColleges.slice(0, 3);

    res.json({
      recommendations: top3
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};