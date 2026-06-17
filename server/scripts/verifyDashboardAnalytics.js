import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CollegeMaster from "../models/CollegeMaster.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import {
  getOverviewDashboard,
  getRecommendationDashboard,
  getSearchAnalyticsDashboard,
  getCoverageDashboard,
  getQualityDashboard,
  getScraperHealthDashboard,
  getTrendsDashboard
} from "../services/dashboardService.js";
import * as scraperService from "../services/scraperWorkerService.js";
import ScraperJob from "../models/ScraperJob.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_COLLEGES = [
  {
    collegeCode: "COL_ENG",
    name: "Engineering A",
    officialData: {
      academics: { ugCourses: [{ name: "B.Tech" }] },
      fees: [{ tuitionFee: 50000 }],
      admissions: { managementQuotaAvailable: true },
      placements: { placementPercentage: 90 },
      rankings: [{ rank: 1 }]
    }
  },
  {
    collegeCode: "COL_MED",
    name: "Medical B",
    officialData: {
      academics: { ugCourses: [{ name: "MBBS" }] },
      // missing fees
      // missing admissions
      placements: { placementPercentage: 100 },
      // missing rankings
    }
  }
];

const MOCK_ANALYTICS = [
  { type: "college", query: "engineering", count: 10 },
  { type: "course", query: "btech", count: 5 }
];

async function verifyDashboardAnalytics() {
  const report = {
    totalTested: 0,
    passed: 0,
    failed: 0,
    failures: []
  };
  const verifications = [];

  // Mocks
  CollegeMaster.countDocuments = async () => MOCK_COLLEGES.length;
  CollegeMaster.find = () => ({ lean: async () => MOCK_COLLEGES });
  
  SearchAnalytics.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => MOCK_ANALYTICS
      })
    })
  });

  SearchAnalytics.aggregate = async () => [
    { _id: "college", totalSearches: 10 },
    { _id: "course", totalSearches: 5 }
  ];

  ScraperJob.countDocuments = async (query) => {
    if (query.status === "running") return 1;
    return 0;
  };

  const runTest = async (scenario, fn) => {
    report.totalTested++;
    try {
      const passed = await fn();
      if (passed) {
        report.passed++;
        verifications.push({ scenario, passed: true });
      } else {
        report.failed++;
        report.failures.push({ scenario, reason: "Validation failed" });
        verifications.push({ scenario, passed: false });
        console.error("Failed on:", scenario);
      }
    } catch (e) {
      report.failed++;
      report.failures.push({ scenario, reason: e.message });
      verifications.push({ scenario, passed: false, error: e.message });
      console.error("Exception on:", scenario, e);
    }
  };

  await runTest("coverage calculations", async () => {
    const cov = await getCoverageDashboard();
    // 2 colleges total. 
    // COL_ENG has 5/5. COL_MED has 2/5 (academics, placements).
    // Academics: 2/2 = 100%
    // Fees: 1/2 = 50%
    // Admissions: 1/2 = 50%
    // Placements: 2/2 = 100%
    // Rankings: 1/2 = 50%
    // Overall: (7 / 10) = 70%
    return cov.overall === 70 && cov.fees === 50 && cov.academics === 100;
  });

  await runTest("recommendation aggregation", async () => {
    const recs = await getRecommendationDashboard();
    return recs.averageScore > 0 && Array.isArray(recs.top) && Array.isArray(recs.low);
  });

  await runTest("search analytics aggregation", async () => {
    const search = await getSearchAnalyticsDashboard();
    return search.searchesByType.college === 10 && search.searchesByType.course === 5;
  });

  await runTest("quality aggregation", async () => {
    const qual = await getQualityDashboard();
    return qual.distribution !== undefined;
  });

  await runTest("scraper metrics aggregation", async () => {
    const scrap = await getScraperHealthDashboard();
    return scrap.activeCount === 1;
  });

  await runTest("trend generation", async () => {
    const trends = await getTrendsDashboard();
    return trends.labels.length === 7 && trends.datasets.searches.length === 7;
  });

  await runTest("deterministic output", async () => {
    const trend1 = await getTrendsDashboard();
    const trend2 = await getTrendsDashboard();
    return trend1.labels[0] === trend2.labels[0];
  });

  await runTest("empty dataset", async () => {
    // temporarily clear
    CollegeMaster.countDocuments = async () => 0;
    CollegeMaster.find = () => ({ lean: async () => [] });
    const emptyCov = await getCoverageDashboard();
    
    // Restore
    CollegeMaster.countDocuments = async () => MOCK_COLLEGES.length;
    CollegeMaster.find = () => ({ lean: async () => MOCK_COLLEGES });

    return emptyCov.overall === 0 && emptyCov.academics === 0;
  });

  // Output
  await fs.writeFile(
    path.join(__dirname, "dashboard-analytics-report.json"),
    JSON.stringify(report, null, 2)
  );

  await fs.writeFile(
    path.join(__dirname, "dashboard-analytics-verification.json"),
    JSON.stringify(verifications, null, 2)
  );

  console.log("Verification complete.");
  console.log(`Passed: ${report.passed}/${report.totalTested}`);
}

verifyDashboardAnalytics();
