import College from "../models/College.js";

export const generateWebOptions = async (req, res) => {
  try {
    const {
      rank,
      category,
      gender,
      preferences,
      preferTopColleges,
      preferredDistricts,
      maxFees,
      riskFilter,
      optionLimit
    } = req.body;

    const page = Number(req.query.page) || 1;
    const limit =
      Number(req.query.limit) || Number(optionLimit) || 50;

    if (!rank || !category || !gender || !preferences?.length) {
      return res.status(400).json({ error: "Missing inputs" });
    }

    const userRank = Number(rank);

    const query = {
      category,
      gender
    };

    if (maxFees) {
      query.fees = { $lte: Number(maxFees) };
    }

    if (preferredDistricts?.length > 0) {
      query.district = { $in: preferredDistricts };
    }

    const candidates = await College.find(query)
      .select(
        "name collegeCode branch branchCode cutoff fees district affiliated place"
      )
      .sort({ cutoff: 1 })
      .limit(5000);

    let options = [];

    candidates.forEach((college) => {
      preferences.forEach((pref, index) => {
        const prefLower = pref.toLowerCase();
        const branchLower = college.branch?.toLowerCase() || "";
        const branchCodeLower = college.branchCode?.toLowerCase() || "";

        const isBranchMatched =
          branchLower.includes(prefLower) ||
          branchCodeLower === prefLower;

        if (!isBranchMatched) return;

        let score = 0;

        const rankDiff = college.cutoff - userRank;

        if (rankDiff >= 30000) score += 60;
        else if (rankDiff >= 20000) score += 50;
        else if (rankDiff >= 10000) score += 40;
        else if (rankDiff >= 0) score += 30;
        else if (rankDiff >= -10000) score += 15;
        else score += 5;

        const totalPrefs = preferences.length;
        score += ((totalPrefs - index) / totalPrefs) * 25;

        if (preferTopColleges) {
          score += Math.max(0, 50000 - college.cutoff) / 200;
        }

        if (college.fees <= 50000) score += 15;
        else if (college.fees <= 80000) score += 10;
        else if (college.fees <= 120000) score += 5;

        let riskLabel = "Dream";

        const diffPercent =
          ((college.cutoff - userRank) / college.cutoff) * 100;

        if (diffPercent >= 30) {
          riskLabel = "Safe";
        } else if (diffPercent >= -5) {
          riskLabel = "Moderate";
        }

        options.push({
          ...college._doc,
          score: Math.round(score),
          riskLabel
        });
      });
    });

    if (riskFilter && riskFilter !== "ALL") {
      options = options.filter((option) => option.riskLabel === riskFilter);
    }

    options.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.fees - b.fees || a.cutoff - b.cutoff;
    });

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