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

export const predictColleges = async (req, res) => {
  try {
    const {
      rank,
      category,
      gender,
      district,
      branch,
      selectedBranch,
      maxFees,
      specialCategory = "None"
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

    const effectiveRank = getEffectiveRank(userRank, specialCategory);
    const specialBonus = getSpecialCategoryBonus(specialCategory);

    const selected = branch || selectedBranch;

    const query = {
      category,
      gender
    };

    if (district) {
      query.district = district;
    }

    if (maxFees) {
      query.fees = { $lte: Number(maxFees) };
    }

    if (selected) {
      const s = String(selected).trim().toUpperCase();
      query.$or = [
        { branchCode: s },
        { branch: s }
      ];
    }

    let colleges = await College.find(query)
      .select(
        "name collegeCode branch branchCode cutoff fees district affiliated place placements facilities ranking"
      )
      .sort({ cutoff: 1 })
      .limit(1000);

    colleges = colleges.map((college) => {
      const rankDiff = college.cutoff - userRank;

      let rankScore = 0;

      if (rankDiff >= 30000) rankScore = 60;
      else if (rankDiff >= 20000) rankScore = 50;
      else if (rankDiff >= 10000) rankScore = 40;
      else if (rankDiff >= 0) rankScore = 30;
      else if (rankDiff >= -10000) rankScore = 15;
      else rankScore = 5;

      let feesScore = 0;

      if (college.fees <= 50000) feesScore = 15;
      else if (college.fees <= 80000) feesScore = 10;
      else if (college.fees <= 120000) feesScore = 5;

      const placementScore = getPlacementScore(college);
      const facilitiesScore = getFacilitiesScore(college);
      const rankingScore = getRankingScore(college);

      const riskLabel = getRiskLabel(college.cutoff, effectiveRank);

      let topCollegeScore = Math.max(0, 40000 - college.cutoff) / 250;

      let totalScore =
        rankScore +
        feesScore +
        placementScore +
        facilitiesScore +
        rankingScore +
        topCollegeScore;

      if (riskLabel === "Dream" || riskLabel === "Moderate") {
        totalScore += specialBonus;
      }

      return {
        ...college._doc,
        score: Math.round(totalScore),
        riskLabel,
        
        scoreBreakdown: {
          rankScore,
          feesScore,
          placementScore,
          facilitiesScore,
          rankingScore,
          topCollegeScore: Math.round(topCollegeScore),
          specialCategoryBonus: (riskLabel === "Dream" || riskLabel === "Moderate") ? specialBonus : 0
        }
      };
    });

    const safeRecommendations = colleges
      .filter((c) => c.riskLabel === "Safe")
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    const moderateRecommendations = colleges
      .filter((c) => c.riskLabel === "Moderate")
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    const dreamRecommendations = colleges
      .filter((c) => c.riskLabel === "Dream")
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    res.json({
      safeRecommendations,
      moderateRecommendations,
      dreamRecommendations,
      summary: {
        safeCount: safeRecommendations.length,
        moderateCount: moderateRecommendations.length,
        dreamCount: dreamRecommendations.length,
        userRank,
        effectiveRank,
        category,
        gender,
        specialCategoryApplied: specialCategory !== "None" ? specialCategory : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};