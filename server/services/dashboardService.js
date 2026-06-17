import CollegeMaster from "../models/CollegeMaster.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import { getCoverageMetrics, getQualityMetrics, getTrends } from "./analyticsService.js";
import { getScraperStatus } from "./scraperWorkerService.js";
import { getPopularSearches } from "./searchService.js";

import { globalCache } from "./cacheService.js";

/**
 * Gathers overarching platform metrics.
 */
export async function getOverviewDashboard() {
  const cached = globalCache.get("dashboard_overview");
  if (cached) return cached;

  const [totalColleges, coverage, quality, scraperStatus] = await Promise.all([
    CollegeMaster.countDocuments(),
    getCoverageMetrics(),
    getQualityMetrics(),
    getScraperStatus()
  ]);

  const response = {
    totalColleges,
    averageQualityScore: quality.averageScore,
    overallCoverage: coverage.overall,
    scraperActiveJobs: scraperStatus.activeCount || 0
  };

  globalCache.set("dashboard_overview", response, 3600); // 1 hour cache
  return response;
}

export async function getRecommendationDashboard() {
  return await getQualityMetrics(); // Contains score aggregation, top, and low
}

export async function getSearchAnalyticsDashboard() {
  const cached = globalCache.get("dashboard_search");
  if (cached) return cached;

  const popular = await getPopularSearches();
  
  // Aggregate searches by type
  const typeAggregation = await SearchAnalytics.aggregate([
    { $group: { _id: "$type", totalSearches: { $sum: "$count" } } }
  ]);

  const searchesByType = {
    college: 0,
    course: 0,
    city: 0
  };

  typeAggregation.forEach(t => {
    searchesByType[t._id] = t.totalSearches;
  });

  const response = {
    popularSearches: popular,
    searchesByType
  };

  globalCache.set("dashboard_search", response, 3600); // 1 hour cache
  return response;
}

export async function getCoverageDashboard() {
  return await getCoverageMetrics();
}

export async function getQualityDashboard() {
  return await getQualityMetrics();
}

export async function getScraperHealthDashboard() {
  return getScraperStatus();
}

export async function getTrendsDashboard() {
  return await getTrends();
}
