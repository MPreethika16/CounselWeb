import CollegeMaster from "../models/CollegeMaster.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import { getRecommendations } from "./recommendationService.js";

export async function getPopularSearches() {
  const getTop = async (type, limit) => {
    const results = await SearchAnalytics.find({ type })
      .sort({ count: -1, lastSearchedAt: -1 })
      .limit(limit)
      .lean();
    return results.map(r => ({ name: r.query, count: r.count }));
  };

  const [colleges, courses, cities] = await Promise.all([
    getTop("college", 5),
    getTop("course", 5),
    getTop("city", 5)
  ]);

  return { colleges, courses, cities };
}

export async function trackSearch(query, type) {
  if (!query || query.length < 3) return;
  const safeQuery = query.toLowerCase().trim();
  
  try {
    await SearchAnalytics.findOneAndUpdate(
      { query: safeQuery, type },
      { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Error tracking search analytics:", error);
  }
}

import { globalCache } from "./cacheService.js";
import { queryProfiler } from "./queryProfilerService.js";

/**
 * Executes a fuzzy search with filters and generates facets.
 */
export async function executeSearch(params) {
  const { query, page = 1, limit = 10, sortBy, ...filters } = params;

  const cacheKey = `search_${JSON.stringify(params)}`;
  const cached = globalCache.get(cacheKey);
  if (cached) return cached;

  let dbQuery = {};

  // 1. Primary Text Search ($text)
  let fuzzyMatchedCodes = null;
  if (query) {
    const textQuery = { $text: { $search: query } };
    let matched = await queryProfiler.profile('search_text', CollegeMaster.find(textQuery).select("collegeCode").lean());
    
    // 2. Safe Fuzzy Fallback if low/no results
    if (matched.length === 0) {
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const lightFuzzy = new RegExp(safeQuery, 'i');
      
      const fallbackQuery = {
        $or: [
          { collegeName: { $regex: lightFuzzy } },
          { shortName: { $regex: lightFuzzy } },
          { state: { $regex: lightFuzzy } },
          { city: { $regex: lightFuzzy } },
          { "officialData.academics.ugCourses.name": { $regex: lightFuzzy } }
        ]
      };
      matched = await queryProfiler.profile('search_fuzzy_fallback', CollegeMaster.find(fallbackQuery).select("collegeCode").lean());
    }
    
    fuzzyMatchedCodes = matched.map(c => c.collegeCode);
    trackSearch(query, 'college');
  }

  const recFilters = { ...filters };
  if (fuzzyMatchedCodes) {
    recFilters.collegeCodes = fuzzyMatchedCodes;
  }

  const recommendationsData = await getRecommendations(recFilters, { sortBy, page, limit });

  // 2. Faceted Search using MongoDB $facet Aggregation Pipeline
  const matchStage = fuzzyMatchedCodes ? { collegeCode: { $in: fuzzyMatchedCodes } } : {};
  
  const facetPipeline = [
    { $match: matchStage },
    {
      $facet: {
        states: [
          { $match: { state: { $exists: true, $ne: "" } } },
          { $group: { _id: "$state", count: { $sum: 1 } } }
        ],
        naacGrades: [
          { $match: { "officialData.accreditation.naacGrade": { $exists: true, $ne: "" } } },
          { $group: { _id: "$officialData.accreditation.naacGrade", count: { $sum: 1 } } }
        ],
        nirfRankings: [
          { $match: { "officialData.accreditation.nirfRank": { $ne: null } } },
          {
            $bucket: {
              groupBy: "$officialData.accreditation.nirfRank",
              boundaries: [1, 51, 101, 1000],
              default: "100+",
              output: { count: { $sum: 1 } }
            }
          }
        ],
        feeRanges: [
          { $unwind: "$officialData.fees" },
          { $match: { "officialData.fees.tuitionFee": { $ne: null } } },
          {
            $bucket: {
              groupBy: "$officialData.fees.tuitionFee",
              boundaries: [0, 50001, 200001, 10000000],
              default: "2L+",
              output: { count: { $sum: 1 } }
            }
          }
        ]
      }
    }
  ];

  const aggResult = await queryProfiler.profile('search_facets', CollegeMaster.aggregate(facetPipeline));
  const facetData = aggResult[0] || {};

  const facets = {
    states: {},
    naacGrades: {},
    feeRanges: { "0-50k": 0, "50k-2L": 0, "2L+": 0 },
    rankingBands: { "Top 50": 0, "51-100": 0, "100+": 0 }
  };

  if (facetData.states) facetData.states.forEach(s => facets.states[s._id] = s.count);
  if (facetData.naacGrades) facetData.naacGrades.forEach(n => facets.naacGrades[n._id] = n.count);
  if (facetData.nirfRankings) facetData.nirfRankings.forEach(r => {
    if (r._id === 1) facets.rankingBands["Top 50"] = r.count;
    else if (r._id === 51) facets.rankingBands["51-100"] = r.count;
    else facets.rankingBands["100+"] = r.count;
  });
  if (facetData.feeRanges) facetData.feeRanges.forEach(f => {
    if (f._id === 0) facets.feeRanges["0-50k"] = f.count;
    else if (f._id === 50001) facets.feeRanges["50k-2L"] = f.count;
    else facets.feeRanges["2L+"] = f.count;
  });

  const response = {
    ...recommendationsData,
    facets
  };

  globalCache.set(cacheKey, response, 300); // 5 mins cache
  return response;
}
