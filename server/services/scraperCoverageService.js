// server/services/scraperCoverageService.js

/**
 * Calculates scraper coverage intelligence.
 * Determines the percentage of the universe of colleges scraped,
 * calculates coverage by source, and analyzes missing fields in College.
 */

export function calculateScraperCoverage(colleges, rawPages) {
  const expectedTotal = colleges.length;
  
  if (expectedTotal === 0) {
    return {
      collegesScraped: 0,
      collegesMissing: 0,
      coveragePercentage: 0,
      coverageBySource: [],
      fieldCoverage: {},
      topMissingFields: []
    };
  }

  const scrapedCodes = new Set();
  const sourceMap = {};

  for (const page of rawPages) {
    if (page.collegeCode) {
      scrapedCodes.add(page.collegeCode);
      const domain = page.canonicalDomain || "unknown";
      if (!sourceMap[domain]) {
        sourceMap[domain] = new Set();
      }
      sourceMap[domain].add(page.collegeCode);
    }
  }

  const collegesScraped = scrapedCodes.size;
  const collegesMissing = Math.max(0, expectedTotal - collegesScraped);
  const coveragePercentage = Math.round((collegesScraped / expectedTotal) * 100);

  // Coverage by Source
  const coverageBySource = Object.entries(sourceMap).map(([domain, codeSet]) => ({
    domain,
    collegesCovered: codeSet.size,
    coveragePercentage: Math.round((codeSet.size / expectedTotal) * 100)
  })).sort((a, b) => b.collegesCovered - a.collegesCovered);

  // Missing Fields Analysis
  const fieldCounts = {
    "ranking.nirf": 0,
    "ranking.nba": 0,
    "ranking.naac": 0,
    "placements.avgPackage": 0,
    "facilities.hostel": 0,
    "facilities.library": 0,
    "fees": 0,
    "gallery": 0
  };

  for (const college of colleges) {
    if (!college.ranking?.nirf) fieldCounts["ranking.nirf"]++;
    if (!college.ranking?.nba) fieldCounts["ranking.nba"]++;
    if (!college.ranking?.naac) fieldCounts["ranking.naac"]++;
    if (!college.placements?.avgPackage) fieldCounts["placements.avgPackage"]++;
    if (!college.facilities?.hostel) fieldCounts["facilities.hostel"]++;
    if (!college.facilities?.library) fieldCounts["facilities.library"]++;
    if (!college.fees || college.fees === 0) fieldCounts["fees"]++;
    if (!college.gallery || college.gallery.length === 0) fieldCounts["gallery"]++;
  }

  const fieldCoverage = {};
  for (const [field, missingCount] of Object.entries(fieldCounts)) {
    const presentCount = expectedTotal - missingCount;
    fieldCoverage[field] = {
      missingCount,
      coveragePercentage: Math.round((presentCount / expectedTotal) * 100)
    };
  }

  const topMissingFields = Object.entries(fieldCounts)
    .map(([field, missingCount]) => ({ field, missingCount }))
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 5);

  return {
    collegesScraped,
    collegesMissing,
    coveragePercentage,
    coverageBySource,
    fieldCoverage,
    topMissingFields
  };
}
