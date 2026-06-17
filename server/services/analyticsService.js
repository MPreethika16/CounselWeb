import CollegeMaster from "../models/CollegeMaster.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import { getScraperStatus } from "./scraperWorkerService.js";
import { scoreCollege } from "./recommendationScoringService.js";

/**
 * Calculates percentage coverage of data points across all colleges.
 */
export async function getCoverageMetrics() {
  const total = await CollegeMaster.countDocuments();
  if (total === 0) {
    return { overall: 0, academics: 0, fees: 0, admissions: 0, placements: 0, rankings: 0 };
  }

  const colleges = await CollegeMaster.find({}).lean();
  let academics = 0, fees = 0, admissions = 0, placements = 0, rankings = 0;

  colleges.forEach(c => {
    const data = c.officialData || {};
    if (data.academics && (data.academics.ugCourses?.length > 0 || data.academics.pgCourses?.length > 0)) academics++;
    if (data.fees && data.fees.length > 0) fees++;
    if (data.admissions && typeof data.admissions.managementQuotaAvailable !== 'undefined') admissions++;
    if (data.placements && data.placements.placementPercentage) placements++;
    if (data.rankings && data.rankings.length > 0) rankings++;
  });

  return {
    overall: Math.round(((academics + fees + admissions + placements + rankings) / (total * 5)) * 100) || 0,
    academics: Math.round((academics / total) * 100) || 0,
    fees: Math.round((fees / total) * 100) || 0,
    admissions: Math.round((admissions / total) * 100) || 0,
    placements: Math.round((placements / total) * 100) || 0,
    rankings: Math.round((rankings / total) * 100) || 0
  };
}

/**
 * Calculates quality distribution based on Recommendation Scores.
 */
export async function getQualityMetrics() {
  const colleges = await CollegeMaster.find({}).lean();
  if (colleges.length === 0) {
    return { averageScore: 0, distribution: { "90-100": 0, "70-89": 0, "50-69": 0, "<50": 0 }, top: [], low: [] };
  }

  let totalScore = 0;
  const distribution = { "90-100": 0, "70-89": 0, "50-69": 0, "<50": 0 };
  const scoredColleges = colleges.map(c => {
    const res = scoreCollege(c);
    return { collegeCode: c.collegeCode, name: c.name, score: res.overallScore };
  });

  scoredColleges.forEach(c => {
    totalScore += c.score;
    if (c.score >= 90) distribution["90-100"]++;
    else if (c.score >= 70) distribution["70-89"]++;
    else if (c.score >= 50) distribution["50-69"]++;
    else distribution["<50"]++;
  });

  scoredColleges.sort((a, b) => b.score - a.score);

  return {
    averageScore: Math.round(totalScore / scoredColleges.length) || 0,
    distribution,
    top: scoredColleges.slice(0, 5),
    low: scoredColleges.slice(-5).reverse()
  };
}

/**
 * Generates mocked trends based on current date for chart plotting.
 */
export async function getTrends() {
  const days = 7;
  const labels = [];
  const searchTrends = [];
  const recommendationTrends = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toISOString().split('T')[0]);
    // Mock data logic for trends based on typical platform usage
    searchTrends.push(Math.floor(Math.random() * 50) + 10);
    recommendationTrends.push(Math.floor(Math.random() * 30) + 50);
  }

  // To make deterministic for testing, if testing we might need stable numbers.
  // We'll leave random since it's a trend mock, but in tests we verify length.
  
  return {
    labels,
    datasets: {
      searches: searchTrends,
      averageRecommendationScore: recommendationTrends
    }
  };
}
