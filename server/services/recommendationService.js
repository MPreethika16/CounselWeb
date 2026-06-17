import CollegeMaster from "../models/CollegeMaster.js";
import { scoreCollege } from "./recommendationScoringService.js";
import { globalCache } from "./cacheService.js";
import { queryProfiler } from "./queryProfilerService.js";

/**
 * Service to generate college recommendations based on applied filters.
 */
export async function getRecommendations(filters = {}, options = {}) {
  const { sortBy = 'bestOverall', page = 1, limit = 10, isFallbackSearch = false } = options;

  // Cache check
  const cacheKey = `rec_${JSON.stringify(filters)}_${sortBy}_${page}_${limit}_${isFallbackSearch}`;
  const cached = globalCache.get(cacheKey);
  if (cached) return cached;

  let query = {};

  if (filters.naacGrade) {
    query["officialData.accreditation.naacGrade"] = filters.naacGrade.toUpperCase();
  }
  if (filters.state) {
    query["state"] = { $regex: new RegExp(`^${filters.state}$`, "i") };
  }
  if (filters.collegeCodes) {
    query["collegeCode"] = { $in: filters.collegeCodes };
  }

  // Projection optimization
  const projection = "collegeCode name state city officialData.fees officialData.academics officialData.accreditation officialData.placements";
  const dbQuery = CollegeMaster.find(query).select(projection).lean();
  
  const colleges = await queryProfiler.profile(`getRecommendations_fetch_${Object.keys(query).join(",")}`, dbQuery);

  let results = [];

  for (const college of colleges) {
    const data = college.officialData || {};
    let include = true;

    if (filters.maxFees) {
      const fees = data.fees || [];
      const hasAffordable = fees.some(f => f.tuitionFee && f.tuitionFee <= filters.maxFees);
      if (fees.length === 0 || !hasAffordable) include = false; // Must have data and meet criteria
    }
    if (filters.nirfRankMax) {
      const bestNirf = data.accreditation?.nirfRank;
      if (!bestNirf || bestNirf > filters.nirfRankMax) include = false;
    }
    if (filters.minPlacementPercentage) {
      const pPerc = data.placements?.placementPercentage;
      if (!pPerc || pPerc < filters.minPlacementPercentage) include = false;
    }
    if (filters.course) {
      const acad = data.academics || {};
      const allCourses = [...(acad.ugCourses || []), ...(acad.pgCourses || [])];
      const hasCourse = allCourses.some(c => c.name && c.name.toLowerCase().includes(filters.course.toLowerCase()));
      if (allCourses.length === 0 || !hasCourse) include = false;
    }
    if (filters.managementQuota !== undefined) {
      const mq = data.admissions?.managementQuotaAvailable;
      if (filters.managementQuota === 'true' && mq !== true) include = false;
    }

    if (include) {
      const scored = scoreCollege(college);
      results.push({
        collegeCode: college.collegeCode,
        name: college.name,
        state: college.state,
        city: college.city,
        officialData: college.officialData,
        ...scored
      });
    }
  }

  // Fallback Logic
  if (results.length === 0 && !isFallbackSearch) {
    let relaxedFilters = { ...filters };
    let relaxed = false;

    if (relaxedFilters.maxFees) {
      relaxedFilters.maxFees = Math.round(relaxedFilters.maxFees * 1.2); // 20% relax
      relaxed = true;
    }
    if (relaxedFilters.minPlacementPercentage) {
      relaxedFilters.minPlacementPercentage = Math.max(0, relaxedFilters.minPlacementPercentage - 10); // 10% relax
      relaxed = true;
    }

    if (relaxed) {
      const fallbackResults = await getRecommendations(relaxedFilters, { ...options, isFallbackSearch: true });
      if (fallbackResults.data && fallbackResults.data.length > 0) {
        return fallbackResults;
      }
    }
  }

  // Sorting
  results.sort((a, b) => {
    let scoreA, scoreB;
    if (sortBy === 'affordable') {
      scoreA = a.subscores.affordabilityScore || 0;
      scoreB = b.subscores.affordabilityScore || 0;
    } else if (sortBy === 'placements') {
      scoreA = a.subscores.placementScore || 0;
      scoreB = b.subscores.placementScore || 0;
    } else if (sortBy === 'rankings') {
      scoreA = a.subscores.rankingScore || 0;
      scoreB = b.subscores.rankingScore || 0;
    } else if (sortBy === 'confidence') {
      scoreA = a.confidence || 0;
      scoreB = b.confidence || 0;
    } else {
      scoreA = a.overallScore || 0;
      scoreB = b.overallScore || 0;
    }

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Tie-breaker
    if (a.overallScore !== b.overallScore) {
      return b.overallScore - a.overallScore;
    }
    return a.collegeCode.localeCompare(b.collegeCode);
  });

  // Pagination
  const total = results.length;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedResults = results.slice(startIndex, endIndex);

  const response = {
    data: paginatedResults,
    total,
    page,
    limit,
    isFallback: isFallbackSearch
  };

  globalCache.set(cacheKey, response, 300); // 5 mins cache
  return response;
}
