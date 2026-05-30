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


const fetchWebOptionsCandidatesWithFallback = async ({
  category,
  gender,
  year,
  preferredDistricts,
  maxFees,
  preferences
}) => {
  let baseQuery = { category, gender, year };

  // Level 1: Base + Districts + Fees
  let queryLevel1 = { ...baseQuery };
  if (preferredDistricts && preferredDistricts.length > 0) {
    queryLevel1.district = { $in: preferredDistricts };
  }
  if (maxFees) {
    queryLevel1.fees = { $lte: Number(maxFees) };
  }

  console.log("[Web Options Debug] Level 1 query:", JSON.stringify(queryLevel1));
  let candidates = await College.find(queryLevel1)
    .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
    .sort({ cutoff: 1 })
    .lean();
  console.log("[Web Options Debug] Level 1 results count:", candidates.length);

  // Check how many match preferences
  let matchingCount = candidates.filter(c => {
    return preferences.some(pref => matchesPreference(c, pref));
  }).length;
  console.log("[Web Options Debug] Level 1 matching preferences count:", matchingCount);

  let fallbackApplied = false;

  // Level 2 Fallback: Remove districts filter
  if (matchingCount === 0 && preferredDistricts && preferredDistricts.length > 0) {
    console.log("[Web Options Debug] No matches. Level 2 Fallback: Removing district filter...");
    let queryLevel2 = { ...queryLevel1 };
    delete queryLevel2.district;
    fallbackApplied = true;

    console.log("[Web Options Debug] Level 2 query:", JSON.stringify(queryLevel2));
    candidates = await College.find(queryLevel2)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .sort({ cutoff: 1 })
      .lean();
    matchingCount = candidates.filter(c => {
      return preferences.some(pref => matchesPreference(c, pref));
    }).length;
    console.log("[Web Options Debug] Level 2 matching preferences count:", matchingCount);
  }

  // Level 3 Fallback: Remove fees filter
  if (matchingCount === 0 && maxFees) {
    console.log("[Web Options Debug] No matches. Level 3 Fallback: Removing fees filter...");
    let queryLevel3 = { ...queryLevel1 };
    delete queryLevel3.district;
    delete queryLevel3.fees;
    fallbackApplied = true;

    console.log("[Web Options Debug] Level 3 query:", JSON.stringify(queryLevel3));
    candidates = await College.find(queryLevel3)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .sort({ cutoff: 1 })
      .lean();
    matchingCount = candidates.filter(c => {
      return preferences.some(pref => matchesPreference(c, pref));
    }).length;
    console.log("[Web Options Debug] Level 3 matching preferences count:", matchingCount);
  }

  // Level 4 Fallback: Revert fully to base query
  if (matchingCount === 0) {
    console.log("[Web Options Debug] No matches. Level 4 Fallback: Reverting to base query only...");
    fallbackApplied = true;

    console.log("[Web Options Debug] Level 4 query:", JSON.stringify(baseQuery));
    candidates = await College.find(baseQuery)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .sort({ cutoff: 1 })
      .lean();
    
    const matches = candidates.filter(c => {
      return preferences.some(pref => matchesPreference(c, pref));
    });
    
    if (matches.length > 0) {
      candidates = matches;
    } else {
      console.log("[Web Options Debug] Still 0 matching preferences. Relaxing preference match constraint entirely to ensure output!");
    }
  }

  return { candidates, fallbackApplied, queryUsed: queryLevel1 };
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

    // Extract year parameter with default to 2025 (backward safe)
    const reqYear = req.query.year || req.body.year;
    const parsedYear = reqYear ? Number(reqYear) : 2025;

    // Check if 2025 data exists in database
    const count2025 = await College.countDocuments({ year: 2025 });
    console.log(`[Web Options Year Fallback Debug] Count of year 2025 records in DB: ${count2025}`);

    let selectedYear;
    if (parsedYear === 2025 && count2025 === 0) {
      selectedYear = 2024;
      console.log(`[Web Options Year Fallback Debug] No year 2025 records found! Automatically falling back to selectedYear: 2024`);
    } else {
      selectedYear = [2024, 2025].includes(parsedYear) ? parsedYear : 2025;
    }

    // Fetch candidate colleges using fallback mechanism
    let {
      candidates,
      fallbackApplied,
      queryUsed
    } = await fetchWebOptionsCandidatesWithFallback({
      category,
      gender,
      year: selectedYear,
      preferredDistricts,
      maxFees,
      preferences
    });

    console.log("[Web Options Debug] Final Query Used:", queryUsed);
    console.log("[Web Options Debug] Candidates Count:", candidates.length);

    // STEP 6: Reject weak backup matches (cutoff is extremely far away, i.e., cutoff > 3.0 * rank)
    const beforeSafetyCount = candidates.length;
    candidates = candidates.filter(c => c.cutoff <= effectiveRank * 3.0);
    console.log(`[Web Options Debug] Safety filter reduced candidates from ${beforeSafetyCount} to ${candidates.length}`);

    // 1. DEDUPLICATION & BRANCH LIMITATION (Max 1 branch per college)
    const collegeBranchCounts = new Map();
    const uniqueCandidates = [];
    const uniqueKeys = new Set();

    candidates.forEach((college) => {
      const key = `${college.collegeCode}_${college.branchCode}`.toUpperCase();
      if (uniqueKeys.has(key)) return;

      const count = collegeBranchCounts.get(college.collegeCode) || 0;
      if (count >= 1) return; // Show max 1 branch per college code to prevent clutter!

      uniqueKeys.add(key);
      collegeBranchCounts.set(college.collegeCode, count + 1);
      uniqueCandidates.push(college);
    });

    // Bulk query counterpart cutoffs for alternate year to support Trend Score
    const candidateCodes = uniqueCandidates.map(c => c.collegeCode);
    const counterpartYear = selectedYear === 2025 ? 2024 : 2025;
    const counterparts = await College.find({
      collegeCode: { $in: candidateCodes },
      year: counterpartYear,
      category,
      gender
    }).select("collegeCode branchCode cutoff").lean();

    const counterpartMap = new Map();
    counterparts.forEach(cp => {
      const key = `${cp.collegeCode}_${cp.branchCode}`.toUpperCase();
      counterpartMap.set(key, cp.cutoff);
    });

    // Helpers for scoring
    const calculateAdmissionChance = (cutoff, studentRank) => {
      if (cutoff >= studentRank) {
        const r = (cutoff - studentRank) / studentRank;
        if (r <= 0.04) {
          return 100 - (r / 0.04) * 5;
        } else if (r <= 0.30) {
          return 95 - ((r - 0.04) / (0.30 - 0.04)) * 5;
        } else if (r <= 0.80) {
          return 90 - ((r - 0.30) / (0.80 - 0.30)) * 15;
        } else if (r <= 4.00) {
          return 75 - ((r - 0.80) / (4.00 - 0.80)) * 45;
        } else {
          return Math.max(0, 30 - ((r - 4.00) / 10.0) * 30);
        }
      } else {
        const r = (studentRank - cutoff) / studentRank;
        return Math.max(0, 95 - r * 150);
      }
    };

    const calculateQualityScore = (college) => {
      let baseQuality = 40;
      const code = college.collegeCode.toUpperCase();
      if (["OUCE", "JNTUH", "CBIT", "VNR", "VASAVI"].includes(code)) {
        baseQuality = 95;
      } else if (["GRIET", "KMIT", "CVR", "IARE"].includes(code)) {
        baseQuality = 75;
      }

      let dynamicPoints = 0;
      const avgPkg = college.placements?.avgPackage || 0;
      if (avgPkg >= 8) dynamicPoints += 5;
      else if (avgPkg >= 5) dynamicPoints += 3;

      const name = college.name?.toUpperCase() || "";
      const aff = college.affiliated?.toUpperCase() || "";
      if (name.includes("AUTONOMOUS") || aff.includes("AUTONOMOUS")) {
        dynamicPoints += 3;
      }

      const naac = String(college.ranking?.naac || "").toUpperCase();
      if (naac.includes("A")) {
        dynamicPoints += 2;
      }

      return Math.min(100, baseQuality + dynamicPoints);
    };

    const calculateTrendScore = (college, counterpartMap, primaryYear) => {
      const key = `${college.collegeCode}_${college.branchCode}`.toUpperCase();
      const counterpartCutoff = counterpartMap.get(key);
      
      let cutoff2025 = primaryYear === 2025 ? college.cutoff : counterpartCutoff;
      let cutoff2024 = primaryYear === 2024 ? college.cutoff : counterpartCutoff;

      let trendVal = 50; // Stable
      let trendLabel = "Stable";

      if (cutoff2024 && cutoff2025) {
        const diff = cutoff2024 - cutoff2025;
        const pct = diff / cutoff2024;
        
        if (pct >= 0.05) {
          trendVal = 100;
          trendLabel = "High Demand";
        } else if (pct <= -0.05) {
          trendVal = 0;
          trendLabel = "Low Demand";
        } else {
          trendVal = 50;
          trendLabel = "Stable";
        }
      }
      return { trendScore: trendVal, trendLabel };
    };

    const generateReasons = (college, userRank, avgPkg, highestPkg, trendLabel, admissionScore) => {
      const reasons = [];

      if (college.cutoff >= userRank * 0.7 && college.cutoff <= userRank * 1.3) {
        reasons.push("Strong rank match");
      } else if (college.cutoff > userRank * 1.3) {
        reasons.push("Safe backup option");
      } else {
        reasons.push("Dream choice worth trying");
      }

      if (avgPkg >= 5 || highestPkg >= 15) {
        reasons.push("Good placement record");
      }

      if (trendLabel === "High Demand") {
        reasons.push("Increasing student demand");
      } else if (trendLabel === "Stable") {
        reasons.push("Stable admission demand");
      }

      reasons.push("Matches your active filters");

      if (admissionScore >= 85) {
        reasons.push("High seat probability");
      } else if (admissionScore >= 60) {
        reasons.push("Moderate seat probability");
      } else {
        reasons.push("Low seat probability");
      }

      return reasons;
    };

    const processedOptions = [];

    uniqueCandidates.forEach((college) => {
      let bestPrefIndex = -1;
      preferences.forEach((pref, idx) => {
        if (matchesPreference(college, pref)) {
          if (bestPrefIndex === -1) bestPrefIndex = idx;
        }
      });

      // Relax preference matching constraint if everything was fallback and zero preferences match
      if (bestPrefIndex === -1) {
        const hasAnyTrueMatch = uniqueCandidates.some(c => preferences.some(p => matchesPreference(c, p)));
        if (!hasAnyTrueMatch) {
          bestPrefIndex = 0; // treat as first preference
        } else {
          return; // skip
        }
      }

      const admissionScore = Math.round(calculateAdmissionChance(college.cutoff, effectiveRank));
      const qualityScore = calculateQualityScore(college);
      const { trendScore, trendLabel } = calculateTrendScore(college, counterpartMap, selectedYear);

      const strongMatchScore = Math.round((admissionScore * 0.60) + (qualityScore * 0.25) + (trendScore * 0.15));

      let collegeTier = "Tier 3";
      const code = college.collegeCode.toUpperCase();
      if (["OUCE", "JNTUH", "CBIT", "VNR", "VASAVI"].includes(code)) {
        collegeTier = "Tier 1";
      } else if (["GRIET", "KMIT", "CVR", "IARE"].includes(code)) {
        collegeTier = "Tier 2";
      }

      const reasons = generateReasons(
        college,
        effectiveRank,
        college.placements?.avgPackage || 0,
        college.placements?.highestPackage || 0,
        trendLabel,
        admissionScore
      );

      const isPreferredDistrict = preferredDistricts.includes(college.district);
      const riskLabel = getRiskLabel(college.cutoff, effectiveRank);

      const rawCollege = college._doc || college;

      processedOptions.push({
        ...rawCollege,
        admissionScore,
        qualityScore,
        trendScore,
        trend: trendLabel,
        strongMatchScore,
        matchScore: strongMatchScore,
        score: strongMatchScore,
        collegeTier,
        reasons,
        riskLabel,
        isPreferredDistrict,
        prefIndex: bestPrefIndex
      });
    });

    const sortDreamMod = (a, b) => {
      if (a.prefIndex !== b.prefIndex) return a.prefIndex - b.prefIndex;
      if (b.strongMatchScore !== a.strongMatchScore) return b.strongMatchScore - a.strongMatchScore;
      return a.cutoff - b.cutoff;
    };

    const sortSafe = (a, b) => {
      if (a.prefIndex !== b.prefIndex) return a.prefIndex - b.prefIndex;
      if (b.strongMatchScore !== a.strongMatchScore) return b.strongMatchScore - a.strongMatchScore;
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
        .sort((a, b) => b.strongMatchScore - a.strongMatchScore);
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
      fallback: fallbackApplied,
      message: fallbackApplied ? "Showing closest matches due to relaxed filters" : "Showing exact matches",
      strategySummary: {
        dreamCount: dreamCount || 0,
        moderateCount: moderateCount || 0,
        safeCount: safeCount || 0,
        userRank: userRank || 0,
        effectiveRank: effectiveRank || 0,
        category: category || "",
        gender: gender || "",
        year: selectedYear,
        specialCategoryApplied: specialCategory !== "None" ? specialCategory : null,
        recommendedDream: targetDream || 0,
        recommendedModerate: targetModerate || 0,
        recommendedSafe: targetSafe || 0,
        advice: advice || [],
        missingRiskMessages: missingRiskMessages || []
      }
    });
  } catch (err) {
    console.error("[Web Options Error]", err);
    res.status(500).json({ error: err.message });
  }
};