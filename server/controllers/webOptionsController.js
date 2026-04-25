import College from "../models/College.js";

export const generateWebOptions = async (req, res) => {
  try {
    const {
      rank,
      category,
      gender,
      preferences,
      preferTopColleges,
      preferredLocation,
      maxFees,
      riskFilter
    } = req.body;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (!rank || !category || !gender || !preferences?.length) {
      return res.status(400).json({ error: "Missing inputs" });
    }

    
    const query = { category, gender };

    if (maxFees) {
      query.fees = { $lte: maxFees };
    }

    if (preferredLocation) {
      query.district = preferredLocation;
    }

 
    const candidates = await College.find(query)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place")
      .sort({ cutoff: 1 })
      .limit(500);

    let options = [];


    candidates.forEach((college) => {
      preferences.forEach((pref, index) => {
        if (
          college.branch.toLowerCase().includes(pref.toLowerCase())
        ) {
          let score = 0;

          if (preferTopColleges) {
            score += Math.max(0, 50000 - college.cutoff) / 100;
          }

          const rankDiff = college.cutoff - rank;
          score += rankDiff > 0 ? 20 : 5;

          const totalPrefs = preferences.length;
          score += ((totalPrefs - index) / totalPrefs) * 25;

          let riskLabel = "Dream";

          if (rank <= college.cutoff * 0.9) {
            riskLabel = "Safe";
          } else if (rank <= college.cutoff * 1.1) {
            riskLabel = "Moderate";
          }

          options.push({
            ...college._doc,
            score,
            riskLabel
          });
        }
      });
    });

    if (riskFilter && riskFilter !== "ALL") {
      options = options.filter(o => o.riskLabel === riskFilter);
    }

    
    options.sort((a, b) => b.score - a.score);

    
    const total = options.length;
    const start = (page - 1) * limit;

    const paginated = options.slice(start, start + limit);

    const finalOptions = paginated.map((item, index) => ({
      ...item,
      priority: start + index + 1
    }));

    res.json({
      options: finalOptions,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};