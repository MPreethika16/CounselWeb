import College from "../models/College.js";
import { getEffectiveRank, getRiskLabel, getSpecialCategoryBonus } from "../utils/riskUtils.js";

const getPlacementScore = (college) => {
  const avg = college.placements?.avgPackage;
  const highest = college.placements?.highestPackage;
  let score = 0;
  if (avg >= 10) score += 12;
  else if (avg >= 7) score += 9;
  else if (avg >= 5) score += 6;
  else if (avg >= 3) score += 3;
  if (highest >= 40) score += 3;
  else if (highest >= 25) score += 2;
  else if (highest >= 15) score += 1;
  return score;
};

const getFacilitiesScore = (college) => {
  let score = 0;
  if (college.facilities?.hostel) score += 2;
  if (college.facilities?.sports) score += 1;
  if (college.facilities?.library) score += 1;
  if (college.facilities?.wifi) score += 1;
  if (college.facilities?.labs) score += 1;
  if (college.facilities?.transport) score += 1;
  if (college.facilities?.events) score += 1;
  if (college.facilities?.ncc) score += 1;
  if (college.facilities?.nss) score += 1;
  return Math.min(score, 10);
};

const getRankingScore = (college) => {
  let score = 0;
  if (college.ranking?.nba) score += 3;
  if (college.ranking?.naac) score += 2;
  return score;
};

const matchesPreference = (college, pref) => {
  const p = String(pref).trim().toLowerCase();
  const branch = college.branch?.trim().toLowerCase() || "";
  const code = college.branchCode?.trim().toLowerCase() || "";
  if (code === p) return true;
  if (branch === p) return true;
  return false;
};

export const generateWebOptions = async (req, res) => {
  try {
    const {
      rank,
      category,
      gender,
      preferences,
      preferTopColleges = true,
      preferredDistricts = [],
      strictDistrictFilter = false,
      maxFees,
      riskFilter = "ALL",
      riskFilters = [],
      optionLimit,
      specialCategory = "None"
    } = req.body;

    const page = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || Number(optionLimit) || 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 500);

    if (!rank || !category || !gender || !preferences?.length) {
      return res.status(400).json({
        error: "Rank, category, gender and preferences are required"
      });
    }

    const userRank = Number(rank);
    const effectiveRank = getEffectiveRank(userRank, specialCategory);
    const specialBonus = getSpecialCategoryBonus(specialCategory);

    const query = { category, gender };
    if (maxFees) query.fees = { $lte: Number(maxFees) };
    
    if (strictDistrictFilter && preferredDistricts.length > 0) {
      query.district = { $in: preferredDistricts };
    }

    const candidates = await College.find(query)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .sort({ cutoff: 1 })
      .limit(10000);

    const processedOptions = [];

    candidates.forEach((college) => {
      let bestPrefIndex = -1;
      preferences.forEach((pref, idx) => {
        if (matchesPreference(college, pref)) {
          if (bestPrefIndex === -1) bestPrefIndex = idx;
        }
      });

      if (bestPrefIndex === -1) return;

      let score = 0;
      const rankDiff = college.cutoff - userRank;
      if (rankDiff >= 30000) score += 60;
      else if (rankDiff >= 20000) score += 50;
      else if (rankDiff >= 10000) score += 40;
      else if (rankDiff >= 0) score += 30;
      else if (rankDiff >= -5000) score += 15;
      else score += 5;

      const totalPrefs = preferences.length;
      const preferenceScore = ((totalPrefs - bestPrefIndex) / totalPrefs) * 30;
      score += preferenceScore;

      const isPreferredDistrict = preferredDistricts.includes(college.district);
      if (isPreferredDistrict) score += 15;

      if (preferTopColleges) {
        score += Math.max(0, 40000 - college.cutoff) / 250;
      }

      score += getPlacementScore(college);
      score += getFacilitiesScore(college);
      score += getRankingScore(college);

      if (college.fees <= 50000) score += 10;
      else if (college.fees <= 100000) score += 5;

      let riskLabel = getRiskLabel(college.cutoff, effectiveRank);

      if (riskLabel === "Dream" || riskLabel === "Moderate") {
        score += specialBonus;
      }

      processedOptions.push({
        ...college._doc,
        score: Math.round(score),
        riskLabel,
        isPreferredDistrict,
        prefIndex: bestPrefIndex
      });
    });

    const sortDreamMod = (a, b) => {
      if (a.prefIndex !== b.prefIndex) return a.prefIndex - b.prefIndex;
      return b.cutoff - a.cutoff;
    };

    const sortSafe = (a, b) => {
      if (a.prefIndex !== b.prefIndex) return a.prefIndex - b.prefIndex;
      return a.cutoff - b.cutoff;
    };

    let dreamPool = processedOptions.filter(o => o.riskLabel === "Dream").sort(sortDreamMod);
    let moderatePool = processedOptions.filter(o => o.riskLabel === "Moderate").sort(sortDreamMod);
    let safePool = processedOptions.filter(o => o.riskLabel === "Safe").sort(sortSafe);

    const targetDream = Math.ceil(limit * 0.2);
    const targetModerate = Math.ceil(limit * 0.5);
    const targetSafe = limit - targetDream - targetModerate;

    let finalSelection = [];
    finalSelection.push(...dreamPool.slice(0, targetDream));
    finalSelection.push(...moderatePool.slice(0, targetModerate));
    finalSelection.push(...safePool.slice(0, targetSafe));

    if (finalSelection.length < limit) {
      const remaining = limit - finalSelection.length;
      const others = processedOptions.filter(o => !finalSelection.find(s => s.collegeCode === o.collegeCode && s.branchCode === o.branchCode))
        .sort((a, b) => b.score - a.score);
      finalSelection.push(...others.slice(0, remaining));
    }

    let filteredResults = finalSelection;
    const activeRiskFilters = Array.isArray(riskFilters) && riskFilters.length > 0 ? riskFilters : (riskFilter !== "ALL" ? [riskFilter] : []);
    
    if (activeRiskFilters.length > 0) {
      filteredResults = finalSelection.filter(o => activeRiskFilters.includes(o.riskLabel));
    }

    const riskOrder = { "Dream": 1, "Moderate": 2, "Safe": 3 };
    filteredResults.sort((a,b) => {
      if (riskOrder[a.riskLabel] !== riskOrder[b.riskLabel]) return riskOrder[a.riskLabel] - riskOrder[b.riskLabel];
      if (a.prefIndex !== b.prefIndex) return a.prefIndex - b.prefIndex;
      if (a.riskLabel === "Safe") return a.cutoff - b.cutoff;
      return b.cutoff - a.cutoff;
    });

    const dreamCount = filteredResults.filter(o => o.riskLabel === "Dream").length;
    const moderateCount = filteredResults.filter(o => o.riskLabel === "Moderate").length;
    const safeCount = filteredResults.filter(o => o.riskLabel === "Safe").length;

    const advice = [];
    if (safeCount < targetSafe * 0.5) advice.push("Your list has very few Safe options. We recommend adding colleges with higher cutoffs to ensure allotment.");
    if (dreamCount > targetDream * 1.5) advice.push("Your list is ambitious. Consider adding more Moderate options for a balanced approach.");
    if (strictDistrictFilter) advice.push(`Strict district filtering is ON. Only colleges in ${preferredDistricts.join(', ')} are shown.`);
    
    if (specialCategory !== "None") {
      advice.push("Special category improves recommendation priority by 10% for strategy only. Final allotment depends on official certificate verification and counselling rules.");
    }

    if (advice.length === 0) advice.push("Your web options list is well-balanced with Dream, Moderate, and Safe choices.");

    const missingRiskMessages = [];
    if (dreamCount === 0) missingRiskMessages.push("No Dream options found. This might be because the selected branch has no colleges in that risk range, or district/fee limits are too strict.");
    if (moderateCount === 0) missingRiskMessages.push("No Moderate options found. Consider expanding your district preferences or adding more branches.");
    if (safeCount === 0) missingRiskMessages.push("No Safe options found. Your rank might be higher than available cutoffs for the selected criteria. Please add more backup branches or remove fee limits.");

    const total = filteredResults.length;
    const start = (page - 1) * limit;
    const paginated = filteredResults.slice(start, start + limit);

    const finalOptions = (paginated || []).map((item, index) => ({ ...item, priority: start + index + 1 }));

    res.json({
      options: finalOptions,
      total: total || 0,
      page: page || 1,
      limit: limit || 50,
      pages: Math.ceil((total || 0) / limit) || 1,
      strategySummary: {
        dreamCount: dreamCount || 0,
        moderateCount: moderateCount || 0,
        safeCount: safeCount || 0,
        userRank: userRank || 0,
        effectiveRank: effectiveRank || 0,
        category: category || "",
        gender: gender || "",
        specialCategoryApplied: specialCategory !== "None" ? specialCategory : null,
        recommendedDream: targetDream || 0,
        recommendedModerate: targetModerate || 0,
        recommendedSafe: targetSafe || 0,
        advice: advice || [],
        missingRiskMessages: missingRiskMessages || []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};