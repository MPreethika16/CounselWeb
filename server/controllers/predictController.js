import College from "../models/College.js";
import { getEffectiveRank, getRiskLabel } from "../utils/riskUtils.js";

// Helper to categorize branches like in the frontend
const getBranchType = (branch = "", code = "") => {
  const b = (branch + " " + code).toUpperCase();
  if (b.includes("CSE") || b.includes("CSM") || b.includes("CSD") || b.includes("CSC") || b.includes("CSB") || b.includes("CSO") || b.includes("CSI") || b.includes("CIC") || b.includes("AIM") || b.includes("AID") || b.includes("AI") || b.includes("DATA") || b.includes("CYBER") || b.includes("COMPUTER") || b.includes("INFORMATION") || b.includes("IT") || b.includes("IOT") || b.includes("ARTIFICIAL") || b.includes("MACHINE LEARNING")) return "computing";
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
const resolveBranchSelection = async (selected) => {
  if (!selected) return [];
  const s = String(selected).trim().toUpperCase();
  const groupName = s.toLowerCase();
  const knownGroups = ["computing", "electrical", "core", "agriculture", "medical", "other"];

  if (knownGroups.includes(groupName)) {
    // Dynamic grouping: query distinct branches from database and filter by group name
    const branchPairs = await College.aggregate([
      { $group: { _id: { branchCode: "$branchCode", branch: "$branch" } } }
    ]);
    return branchPairs
      .filter(p => getBranchType(p._id.branch, p._id.branchCode) === groupName)
      .map(p => p._id.branchCode);
  }

  // Otherwise, exact match for selected branch code
  return [s];
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

    // Apply strategic special category 10% advantage if applicable
    const effectiveRank = getEffectiveRank(userRank, specialCategory);

    // Resolve branch category or specific branch selection
    const selected = branch || selectedBranch;
    const selectedBranchCodes = await resolveBranchSelection(selected);

    // Build strictly exact query matching on Category and Gender (Never OC/BOYS for BC/GIRLS)
    const query = {
      category,
      gender
    };

    if (selectedBranchCodes.length > 0) {
      query.branchCode = { $in: selectedBranchCodes };
    }

    // District filter (If strictDistrictFilter true, query must filter; else, handle as soft preference)
    if (districts && districts.length > 0 && strictDistrictFilter) {
      query.district = { $in: districts };
    }

    if (maxFees) {
      query.fees = { $lte: Number(maxFees) };
    }

    let colleges = await College.find(query)
      .select(
        "name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking"
      )
      .lean();

    // Map through records to compute score break-down, risk labeling, and recommendation suitability
    colleges = colleges.map((college) => {
      // 1. rankFitScore (Max 60)
      const diffPercent = Math.abs(college.cutoff - effectiveRank) / effectiveRank;
      let rankFitScore = 0;
      if (diffPercent <= 0.05) rankFitScore = 60;
      else if (diffPercent <= 0.10) rankFitScore = 55;
      else if (diffPercent <= 0.15) rankFitScore = 50;
      else if (diffPercent <= 0.25) rankFitScore = 40;
      else if (diffPercent <= 0.40) rankFitScore = 30;
      else if (diffPercent <= 0.60) rankFitScore = 20;
      else if (diffPercent <= 0.80) rankFitScore = 10;
      else rankFitScore = 5;

      // 2. branchPreferenceScore (Max 15)
      let branchPreferenceScore = 0;
      if (selectedBranchCodes.length > 0) {
        const idx = selectedBranchCodes.indexOf(college.branchCode);
        if (idx !== -1) {
          branchPreferenceScore = Math.max(5, 15 - idx * 3);
        }
      } else {
        branchPreferenceScore = 15;
      }

      // 3. districtPreferenceScore (Max 10)
      let districtPreferenceScore = 0;
      if (districts && districts.length > 0) {
        if (districts.includes(college.district)) {
          districtPreferenceScore = 10;
        } else {
          districtPreferenceScore = 0;
        }
      } else {
        districtPreferenceScore = 10;
      }

      // 4. placementScore (Max 10)
      const placementScore = getPlacementScore(college);

      // 5. rankingScore (Max 5)
      const rankingScore = getRankingScore(college);

      // 6. feeScore (Max 5)
      let feeScore = 0;
      if (college.fees <= 50000) feeScore = 5;
      else if (college.fees <= 80000) feeScore = 4;
      else if (college.fees <= 110000) feeScore = 3;
      else if (college.fees <= 150000) feeScore = 2;
      else feeScore = 1;

      // 7. specialCategoryBonus (Max 10)
      let specialCategoryBonus = 0;
      if (specialCategory && specialCategory !== "None") {
        specialCategoryBonus = 10;
      }

      // Total Score
      const totalScore = Math.round(
        rankFitScore +
        branchPreferenceScore +
        districtPreferenceScore +
        placementScore +
        rankingScore +
        feeScore +
        specialCategoryBonus
      );

      // Risk labeling
      const riskLabel = getRiskLabel(college.cutoff, effectiveRank);

      // Highly Recommended Flag
      const isCloseCutoff = Math.abs(college.cutoff - effectiveRank) <= effectiveRank * 0.15;
      const isHighBranchPref = branchPreferenceScore >= 10;
      const isPreferredDistrict = districts && districts.length > 0 ? districts.includes(college.district) : true;
      const isStrongScore = rankFitScore >= 50;
      const highlyRecommended = isCloseCutoff && isHighBranchPref && isPreferredDistrict && isStrongScore;

      return {
        ...college,
        score: totalScore,
        riskLabel,
        highlyRecommended,
        userRank,
        effectiveRank,
        categoryUsed: category,
        genderUsed: gender,
        scoreBreakdown: {
          rankFitScore,
          branchPreferenceScore,
          districtPreferenceScore,
          placementScore,
          rankingScore,
          feeScore,
          specialCategoryBonus
        }
      };
    });

    // Sort buckets according to closest cutoff to effectiveRank, branch index pref, score, and fees
    const dreamRecommendations = colleges
      .filter((c) => c.riskLabel === "Dream")
      .sort((a, b) => {
        // 1. Closeness to rank (descending for Dream: closest dream first, e.g., 49000 before 25000)
        if (a.cutoff !== b.cutoff) return b.cutoff - a.cutoff;
        // 2. Branch preference order (ascending selected index)
        const prefA = selectedBranchCodes.indexOf(a.branchCode);
        const prefB = selectedBranchCodes.indexOf(b.branchCode);
        if (prefA !== prefB) return prefA - prefB;
        // 3. Score (descending)
        if (a.score !== b.score) return b.score - a.score;
        // 4. Fees (ascending)
        return a.fees - b.fees;
      })
      .slice(0, 2);

    const moderateRecommendations = colleges
      .filter((c) => c.riskLabel === "Moderate")
      .sort((a, b) => {
        // 1. Closeness to rank (descending for Moderate: closest moderate first, e.g., 45000 before 31000)
        if (a.cutoff !== b.cutoff) return b.cutoff - a.cutoff;
        // 2. Branch preference order
        const prefA = selectedBranchCodes.indexOf(a.branchCode);
        const prefB = selectedBranchCodes.indexOf(b.branchCode);
        if (prefA !== prefB) return prefA - prefB;
        // 3. Score (descending)
        if (a.score !== b.score) return b.score - a.score;
        // 4. Fees (ascending)
        return a.fees - b.fees;
      })
      .slice(0, 2);

    const safeRecommendations = colleges
      .filter((c) => c.riskLabel === "Safe")
      .sort((a, b) => {
        // 1. Closeness to rank (ascending for Safe: closest safe first, e.g., 52000 before 90000)
        if (a.cutoff !== b.cutoff) return a.cutoff - b.cutoff;
        // 2. Branch preference order
        const prefA = selectedBranchCodes.indexOf(a.branchCode);
        const prefB = selectedBranchCodes.indexOf(b.branchCode);
        if (prefA !== prefB) return prefA - prefB;
        // 3. Score (descending)
        if (a.score !== b.score) return b.score - a.score;
        // 4. Fees (ascending)
        return a.fees - b.fees;
      })
      .slice(0, 2);

    const missingMessages = {};
    if (dreamRecommendations.length < 2) {
      const msg = "No Competitive Colleges found for your selected districts, branch, and category. Try adding more districts or branches.";
      missingMessages.Dream = msg;
      missingMessages.Competitive = msg;
    }
    if (moderateRecommendations.length < 2) {
      const msg = "No Best Matching Colleges found for your selected filters.";
      missingMessages.Moderate = msg;
      missingMessages.BestMatch = msg;
    }
    if (safeRecommendations.length < 2) {
      const msg = "No Backup Colleges found. Try adding more districts or branches.";
      missingMessages.Safe = msg;
      missingMessages.Backup = msg;
    }

    let specialCategoryMessage = "";
    if (specialCategory && specialCategory !== "None") {
      specialCategoryMessage = "Special category is considered as a 10% strategic advantage. Final allotment depends on official certificate verification.";
    }

    res.json({
      safeRecommendations,
      moderateRecommendations,
      dreamRecommendations,
      missingMessages,
      specialCategoryMessage,
      summary: {
        safeCount: safeRecommendations.length,
        moderateCount: moderateRecommendations.length,
        dreamCount: dreamRecommendations.length,
        userRank,
        effectiveRank,
        category,
        gender,
        selectedBranch: selected,
        district: districts && districts.length > 0 ? districts.join(", ") : "All",
        specialCategoryApplied: specialCategory !== "None" ? specialCategory : null,
        strictDistrictFilterApplied: !!strictDistrictFilter
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};