import College from "../models/College.js";
import { getEffectiveRank, getRiskLabel } from "../utils/riskUtils.js";

// Helper to categorize branches like in the frontend
const getBranchType = (branch = "", code = "") => {
  const b = (branch + " " + code).toUpperCase();
  if (b.includes("CSE") || b.includes("CSM") || b.includes("CSD") || b.includes("CSC") || b.includes("CSB") || b.includes("CSO") || b.includes("CSI") || b.includes("CIC") || b.includes("AIM") || b.includes("AID") || /\bAI\b/.test(b) || b.includes("DATA") || b.includes("CYBER") || b.includes("COMPUTER") || b.includes("INFORMATION") || /\bIT\b/.test(b) || b.includes("IOT") || b.includes("ARTIFICIAL") || b.includes("MACHINE LEARNING")) return "computing";
  if (b.includes("ECE") || b.includes("EEE") || b.includes("EIE") || b.includes("ECM") || b.includes("ECT") || b.includes("ELECTRONICS") || b.includes("ELECTRICAL") || b.includes("COMMUNICATION") || b.includes("INSTRUMENTATION") || b.includes("VLSI")) return "electrical";
  if (b.includes("MEC") || b.includes("CIV") || b.includes("CHE") || b.includes("MIN") || b.includes("MET") || b.includes("AUT") || b.includes("MECHANICAL") || b.includes("CIVIL") || b.includes("CHEMICAL") || b.includes("MINING") || b.includes("METALLURGY") || b.includes("AUTOMOBILE")) return "core";
  if (b.includes("AGR") || b.includes("FOOD") || b.includes("DAIRY") || b.includes("AGRICULTURAL") || b.includes("FOOD TECHNOLOGY")) return "agriculture";
  if (b.includes("BIO") || b.includes("BME") || b.includes("PHM") || b.includes("PHARM") || b.includes("BIOTECH") || b.includes("BIOTECHNOLOGY") || b.includes("BIOMEDICAL")) return "medical";
  return "other";
};

// Helper to get placement score (max 10)
const getPlacementScore = (college) => {
  const avg = college.placements?.avgPackage || 0;
  const highest = college.placements?.highestPackage || 0;

  let score = 0;
  if (avg >= 8) score += 7;
  else if (avg >= 5) score += 5;
  else if (avg >= 3) score += 3;

  if (highest >= 30) score += 3;
  else if (highest >= 15) score += 2;
  else if (highest >= 8) score += 1;

  return Math.min(score, 10);
};

// Helper to get ranking score (max 5)
const getRankingScore = (college) => {
  let score = 0;
  if (college.ranking?.nirf && college.ranking.nirf <= 100) score += 2;
  else if (college.ranking?.nirf && college.ranking.nirf <= 200) score += 1;

  if (college.ranking?.nba) score += 2;
  if (college.ranking?.naac) score += 1;

  return Math.min(score, 5);
};

// Helper to resolve branch group or specific branch code
const resolveBranchSelection = async (selected, year = 2025) => {


  if (!selected) return [];
  const s = String(selected).trim().toUpperCase();
  const groupName = s.toLowerCase();
  const knownGroups = ["computing", "electrical", "core", "agriculture", "medical", "other"];

  if (knownGroups.includes(groupName)) {
    // Dynamic grouping: query distinct branches from database and filter by group name
    const branchPairs = await College.aggregate([
      { $match: { year } },
      { $group: { _id: { branchCode: "$branchCode", branch: "$branch" } } }
    ]);
    return branchPairs
      .filter(p => getBranchType(p._id.branch, p._id.branchCode) === groupName)
      .map(p => p._id.branchCode);
  }

  // Otherwise, exact match for selected branch code
  return [s];
};

const getSmartBranchFilter = (selected) => {
  if (!selected) return null;
  const s = String(selected).trim().toUpperCase();
  const knownGroups = ["computing", "electrical", "core", "agriculture", "medical", "other"];

  if (knownGroups.includes(s.toLowerCase())) {
    return { isGroup: true, group: s.toLowerCase() };
  }

  // Smart mapping for CSE / Computing related keywords
  if (s === "CSE" || s === "COMPUTER SCIENCE" || s === "COMPUTING" || s === "CS") {
    const regexStr = "CSE|CSM|CSD|CSC|CSB|CSO|CSI|CIC|AIM|AID|\\bAI\\b|DATA|CYBER|COMPUTER|INFORMATION|\\bIT\\b|IOT|ARTIFICIAL|MACHINE LEARNING";
    return {
      $or: [
        { branch: { $regex: regexStr, $options: "i" } },
        { branchCode: { $regex: regexStr, $options: "i" } }
      ]
    };
  }

  // Smart mapping for ECE / Electrical related keywords
  if (s === "ECE" || s === "EEE" || s === "ELECTRICAL" || s === "ELECTRONICS") {
    const regexStr = "ECE|EEE|EIE|ECM|ECT|ELECTRONICS|ELECTRICAL|COMMUNICATION|INSTRUMENTATION|VLSI";
    return {
      $or: [
        { branch: { $regex: regexStr, $options: "i" } },
        { branchCode: { $regex: regexStr, $options: "i" } }
      ]
    };
  }

  // Smart mapping for Civil / Mech / Core related keywords
  if (s === "CIVIL" || s === "MECHANICAL" || s === "MECH" || s === "CORE") {
    const regexStr = "MEC|CIV|CHE|MIN|MET|AUT|MECHANICAL|CIVIL|CHEMICAL|MINING|METALLURGY|AUTOMOBILE";
    return {
      $or: [
        { branch: { $regex: regexStr, $options: "i" } },
        { branchCode: { $regex: regexStr, $options: "i" } }
      ]
    };
  }

  // Default regex search
  return {
    $or: [
      { branch: { $regex: s, $options: "i" } },
      { branchCode: { $regex: s, $options: "i" } }
    ]
  };
};

const fetchCollegesWithFallback = async ({
  category,
  gender,
  year,
  selectedBranch,
  districts,
  maxFees
}) => {
  const baseQuery = {
    category,
    gender,
    year
  };

  if (selectedBranch) {
    baseQuery.branchCode = String(selectedBranch).trim().toUpperCase();
  }

  let query = {
    ...baseQuery
  };

  if (districts && districts.length > 0) {
    query.district = { $in: districts };
  }

  if (maxFees !== undefined && maxFees !== null && maxFees !== "") {
    const parsedFees = Number(maxFees);
    if (Number.isFinite(parsedFees) && parsedFees >= 0) {
      query.fees = { $lte: parsedFees };
    }
  }

  console.log("Initial query prepared:", JSON.stringify(query));
  let colleges = await College.find(query)
    .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
    .lean();
  console.log("Initial fetch count:", colleges.length);

  let fallbackApplied = false;

  // LEVEL 1: Remove district filter if empty
  if (colleges.length === 0 && query.district) {
    console.log("[Fallback Debug] LEVEL 1: Removing district filter...");
    delete query.district;
    fallbackApplied = true;
    colleges = await College.find(query)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .lean();
    console.log("LEVEL 1 fetch count:", colleges.length);
  }

  // LEVEL 2: Remove branch filter if still empty (only if no specific branch was selected)
  if (colleges.length === 0 && query.branchCode && !selectedBranch) {
    console.log("[Fallback Debug] LEVEL 2: Removing branch filter...");
    delete query.branchCode;
    fallbackApplied = true;
    colleges = await College.find(query)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .lean();
    console.log("LEVEL 2 fetch count:", colleges.length);
  }

  // LEVEL 3: Remove fees filter if still empty
  if (colleges.length === 0 && query.fees) {
    console.log("[Fallback Debug] LEVEL 3: Removing fees filter...");
    delete query.fees;
    fallbackApplied = true;
    colleges = await College.find(query)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .lean();
    console.log("LEVEL 3 fetch count:", colleges.length);
  }

  // LEVEL 4: Revert to baseQuery if still empty
  if (colleges.length === 0) {
    console.log("[Fallback Debug] LEVEL 4: Reverting entirely to baseQuery...");
    fallbackApplied = true;
    colleges = await College.find(baseQuery)
      .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
      .lean();
    console.log("LEVEL 4 fetch count:", colleges.length);
  }

  console.log("Final query used:", query);
  console.log("Total colleges found:", colleges.length);

  return { colleges, fallbackApplied, queryUsed: query };
};


export const predictColleges = async (req, res) => {
  try {
    const {
      rank,
      category,
      gender,
      districts,
      branch,
      selectedBranch,
      maxFees,
      specialCategory = "None",
      strictDistrictFilter = false
    } = req.body;

    if (!rank || !category || !gender) {
      return res.status(400).json({
        error: "Rank, category and gender are required"
      });
    }

    const userRank = Number(rank);
    if (Number.isNaN(userRank) || userRank <= 0) {
      return res.status(400).json({
        error: "Invalid rank"
      });
    }

    // Determine primary search year
    const reqYear = req.query.year || req.body.year;
    const parsedYear = reqYear ? Number(reqYear) : 2025;

    // Check if 2025 data exists in database
    const count2025 = await College.countDocuments({ year: 2025 });
    console.log(`[Predict Year Fallback Debug] Count of year 2025 records in DB: ${count2025}`);

    let primaryYear;
    if (parsedYear === 2025 && count2025 === 0) {
      primaryYear = 2024;
      console.log(`[Predict Year Fallback Debug] No year 2025 records found! Automatically falling back to primaryYear: 2024`);
    } else {
      primaryYear = [2024, 2025].includes(parsedYear) ? parsedYear : 2025;
    }

    // Resolve branch category or specific branch selection
    const selected = branch || selectedBranch;
    const resolvedCodes = await resolveBranchSelection(selected, primaryYear);

    // Build the query containing Category, Gender, Year, and Branch Code (never relaxed)
    const baseQuery = {
      category,
      gender,
      year: primaryYear
    };
    if (resolvedCodes && resolvedCodes.length > 0) {
      if (resolvedCodes.length === 1) {
        baseQuery.branchCode = resolvedCodes[0];
      } else {
        baseQuery.branchCode = { $in: resolvedCodes };
      }
    }

    const activeDistricts = districts && districts.length > 0 ? districts : null;
    const activeMaxFees = maxFees !== undefined && maxFees !== null && maxFees !== "" ? Number(maxFees) : null;
    
    // State of relaxation variables
    let isSpecialCategoryBonusApplied = specialCategory && specialCategory !== "None";
    let fallbackApplied = false;
    let relaxedFees = false;
    let relaxedDistrict = false;
    let relaxedSpecialCategory = false;

    // Helper to query with active filters
    const runFilterQuery = async (useDistricts, useFees) => {
      let q = { ...baseQuery };
      if (useDistricts && activeDistricts) {
        q.district = { $in: activeDistricts };
      }
      if (useFees && activeMaxFees !== null && Number.isFinite(activeMaxFees) && activeMaxFees >= 0) {
        q.fees = { $lte: activeMaxFees };
      }
      return await College.find(q)
        .select("name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking")
        .lean();
    };

    // LEVEL 0: Strict filters (District + Fees + Special Category Bonus)
    let candidates = await runFilterQuery(true, true);
    console.log("[Predict Filter Debug] Strict query results count:", candidates.length);

    // LEVEL 1 Fallback: Relax Fee Limit (Remove Fee limit but keep District and Special Category Bonus)
    if (candidates.length < 5 && activeMaxFees !== null) {
      console.log("[Predict Filter Debug] Under 5 results. Relaxing Level 1: Fee Limit...");
      candidates = await runFilterQuery(true, false);
      fallbackApplied = true;
      relaxedFees = true;
      console.log("[Predict Filter Debug] Level 1 query results count:", candidates.length);
    }

    // LEVEL 2 Fallback: Relax District Filter (Remove District filter, keep Special Category Bonus, if strictDistrictFilter is false)
    if (candidates.length < 5 && activeDistricts && !strictDistrictFilter) {
      console.log("[Predict Filter Debug] Under 5 results. Relaxing Level 2: District Filter...");
      candidates = await runFilterQuery(false, false);
      fallbackApplied = true;
      relaxedDistrict = true;
      console.log("[Predict Filter Debug] Level 2 query results count:", candidates.length);
    }

    // LEVEL 3 Fallback: Relax Special Category (Remove Special Category rank bonus)
    if (candidates.length < 5 && isSpecialCategoryBonusApplied) {
      console.log("[Predict Filter Debug] Under 5 results. Relaxing Level 3: Special Category Rank Bonus...");
      isSpecialCategoryBonusApplied = false;
      fallbackApplied = true;
      relaxedSpecialCategory = true;
      // Re-query preserving district filtering if strictDistrictFilter is true, since fee relaxation is already completed
      candidates = await runFilterQuery(strictDistrictFilter, false);
      console.log("[Predict Filter Debug] Level 3 query results count:", candidates.length);
    }

    // Calculate final effective rank based on active special category rank advantage
    const finalEffectiveRank = isSpecialCategoryBonusApplied ? Math.round(userRank * 0.90) : userRank;

    // STEP 6: Reject weak backup matches (cutoff is extremely far away, i.e., cutoff > 3.0 * rank)
    const totalBeforeSafetyFilter = candidates.length;
    candidates = candidates.filter(c => c.cutoff <= finalEffectiveRank * 3.0);
    const totalAfterSafetyFilter = candidates.length;
    console.log(`[Predict Filter Debug] Safety check filtered out ${totalBeforeSafetyFilter - totalAfterSafetyFilter} weak colleges.`);

    // Deduplicate in-memory by collegeCode + branchCode to yield unique candidates
    const uniqueKeys = new Set();
    const rawCandidates = [];
    candidates.forEach(c => {
      const key = `${c.collegeCode}_${c.branchCode}`.toUpperCase();
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        rawCandidates.push(c);
      }
    });

    // Bulk query counterpart cutoffs for alternate year to support Trend Score
    const candidateCodes = rawCandidates.map(c => c.collegeCode);
    const counterpartYear = primaryYear === 2025 ? 2024 : 2025;
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

    // Helper functions for scoring
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
        const diff = cutoff2024 - cutoff2025; // 2024 was 4500 and 2025 is 3500 -> diff = 1000 (demand improved)
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

    // Calculate quality, trend, seat probability, and overall strongMatchScore
    const processed = rawCandidates.map(college => {
      const admissionScore = Math.round(calculateAdmissionChance(college.cutoff, finalEffectiveRank));
      const qualityScore = calculateQualityScore(college);
      const { trendScore, trendLabel } = calculateTrendScore(college, counterpartMap, primaryYear);

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
        finalEffectiveRank,
        college.placements?.avgPackage || 0,
        college.placements?.highestPackage || 0,
        trendLabel,
        admissionScore
      );

      return {
        ...college,
        admissionScore,
        qualityScore,
        trendScore,
        trend: trendLabel,
        strongMatchScore,
        matchScore: strongMatchScore,
        score: strongMatchScore,
        collegeTier,
        reasons
      };
    });

    // STEP 7: Counsel Bucketing
    const strongMatchBucket = processed.filter(c => c.cutoff >= finalEffectiveRank * 0.7 && c.cutoff <= finalEffectiveRank * 1.3);
    const safeBucket = processed.filter(c => c.cutoff > finalEffectiveRank * 1.3 && c.cutoff <= finalEffectiveRank * 3.0);

    // Sort buckets by strongMatchScore descending
    strongMatchBucket.sort((a, b) => b.strongMatchScore - a.strongMatchScore);
    safeBucket.sort((a, b) => b.strongMatchScore - a.strongMatchScore);

    // STEP 9: College Diversity Rule (Avoid multiple branches from the same college)
    const finalSelection = [];
    const selectedCollegeCodes = new Set();

    // 1. Prioritize Strong Match bucket
    strongMatchBucket.forEach(c => {
      if (finalSelection.length < 5 && !selectedCollegeCodes.has(c.collegeCode)) {
        selectedCollegeCodes.add(c.collegeCode);
        finalSelection.push(c);
      }
    });

    // 2. Fill remaining from Safe bucket
    if (finalSelection.length < 5) {
      safeBucket.forEach(c => {
        if (finalSelection.length < 5 && !selectedCollegeCodes.has(c.collegeCode)) {
          selectedCollegeCodes.add(c.collegeCode);
          finalSelection.push(c);
        }
      });
    }

    console.log("Total unique matched candidates processed:", processed.length);
    console.log("Total in Strong Match bucket:", strongMatchBucket.length);
    console.log("Total in Safe bucket:", safeBucket.length);
    console.log("Final diversity-filtered selection count:", finalSelection.length);

    let specialCategoryMessage = "";
    if (specialCategory && specialCategory !== "None") {
      if (isSpecialCategoryBonusApplied) {
        specialCategoryMessage = `Special category (${specialCategory}) rank advantage applied! You have been granted a strategic 10% EAPCET rank boost to ${finalEffectiveRank}.`;
      } else {
        specialCategoryMessage = `Special category (${specialCategory}) was noted, but relaxed to ensure the counseling expert could find enough suitable matches.`;
      }
    }

    res.json({
      colleges: finalSelection,
      strongMatches: finalSelection,
      competitive: [],
      bestMatch: [],
      backup: [],
      recommendations: finalSelection,
      fallbackUsed: fallbackApplied,
      fallback: fallbackApplied,
      message: fallbackApplied 
        ? `Showing closest matches due to relaxed filters: ${relaxedFees ? "Fee Limit " : ""}${relaxedDistrict ? "District " : ""}${relaxedSpecialCategory ? "Special Category " : ""}` 
        : "Showing exact matching colleges within counseling range",
      specialCategoryMessage,
      summary: {
        totalMatches: finalSelection.length,
        userRank,
        effectiveRank: finalEffectiveRank,
        category,
        gender,
        year: primaryYear,
        selectedBranch: selected,
        district: districts && districts.length > 0 ? districts.join(", ") : "All",
        specialCategoryApplied: specialCategory !== "None" ? specialCategory : null,
        strictDistrictFilterApplied: !!strictDistrictFilter
      }
    });
  } catch (err) {
    console.error("[Predict Error]", err);
    res.status(500).json({ error: err.message });
  }
};