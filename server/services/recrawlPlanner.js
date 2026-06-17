// server/services/recrawlPlanner.js
import CollegeMaster from "../models/CollegeMaster.js";
import { calculateFreshness } from "./freshnessService.js";

/**
 * Generates a recrawl queue by calculating the freshness of all colleges
 * and sorting them so the stalest (lowest score) appear first.
 * 
 * @param {Number} limit Number of colleges to return
 * @returns {Array} List of prioritized colleges for recrawl
 */
export async function generateRecrawlQueue(limit = 50) {
  // Fetch required fields from DB, pre-sorted by score (ascending: most stale first) and code
  const colleges = await CollegeMaster.find({})
    .select("collegeCode collegeName officialData.freshness")
    .sort({ "officialData.freshness.score": 1, collegeCode: 1 })
    .limit(limit)
    .lean();

  const evaluatedColleges = colleges.map((c) => {
    const freshness = c.officialData?.freshness || {};
    const { score, classification } = calculateFreshness(
      freshness.lastScrapedAt,
      freshness.lastVerifiedAt
    );

    return {
      collegeCode: c.collegeCode,
      collegeName: c.collegeName,
      lastScrapedAt: freshness.lastScrapedAt || null,
      lastVerifiedAt: freshness.lastVerifiedAt || null,
      score,
      classification
    };
  });

  // DB already sorted them based on last known score to get the top candidates efficiently.
  // However, because we re-calculate the precise temporal decay here, we must re-sort the 
  // limited batch in memory to guarantee the exact same deterministic output ordering.
  evaluatedColleges.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return a.collegeCode.localeCompare(b.collegeCode);
  });
  
  return evaluatedColleges;
}
