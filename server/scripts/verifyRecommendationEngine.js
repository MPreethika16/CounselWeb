import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CollegeMaster from "../models/CollegeMaster.js";
import { getRecommendations } from "../services/recommendationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_DB = [
  {
    collegeCode: "COL_EMPTY",
    name: "Empty Data College",
    officialData: {}
  },
  {
    collegeCode: "COL_HIGH_RANK",
    name: "High Rank College",
    officialData: {
      rankings: [{ agency: "NIRF", category: "Engineering", rank: 1 }],
      accreditation: { naacGrade: "A++", confidence: 100 },
      fees: [{ tuitionFee: 50000 }]
    }
  },
  {
    collegeCode: "COL_AFFORDABLE",
    name: "Affordable College",
    officialData: {
      fees: [{ tuitionFee: 20000 }],
      accreditation: { confidence: 80 }
    }
  },
  {
    collegeCode: "COL_PLACEMENT",
    name: "Placement College",
    officialData: {
      placements: { placementPercentage: 99, highestPackage: 5000000 },
      academics: { ugCourses: [{}, {}], pgCourses: [{}] },
      fees: [{ tuitionFee: 1100 }]
    }
  },
  {
    collegeCode: "COL_A",
    name: "Tie College A",
    officialData: {}
  },
  {
    collegeCode: "COL_B",
    name: "Tie College B",
    officialData: {}
  }
];

async function verifyRecommendationEngine() {
  const report = {
    totalTested: 0,
    passed: 0,
    failed: 0,
    failures: []
  };
  const verifications = [];

  // Mock DB call
  CollegeMaster.find = (query) => {
    return {
      lean: async () => {
        let results = MOCK_DB;
        
        // Mock NAAC filter
        if (query["officialData.accreditation.naacGrade"]) {
          results = results.filter(c => 
            c.officialData.accreditation?.naacGrade === query["officialData.accreditation.naacGrade"]
          );
        }
        return results;
      }
    };
  };

  const testCases = [
    {
      id: "TEST_EMPTY_DB",
      scenario: "empty dataset",
      filters: {},
      mockDB: [],
      validate: (res) => res.data.length === 0
    },
    {
      id: "TEST_MISSING_FIELDS",
      scenario: "missing fields",
      filters: {},
      mockDB: MOCK_DB,
      validate: (res) => {
        const c = res.data.find(r => r.collegeCode === "COL_EMPTY");
        // For empty college, availableWeights is 0, so overallScore is 0
        return c && c.overallScore === 0 && c.missingData.length === 6; // All 6 categories missing
      }
    },
    {
      id: "TEST_TIE_SCORES",
      scenario: "tie scores",
      filters: {},
      mockDB: MOCK_DB,
      validate: (res) => {
        const idxA = res.data.findIndex(r => r.collegeCode === "COL_A");
        const idxB = res.data.findIndex(r => r.collegeCode === "COL_B");
        // COL_A should come before COL_B (alphabetical) if scores are tied
        return res.data[idxA].overallScore === res.data[idxB].overallScore && idxA < idxB;
      }
    },
    {
      id: "TEST_HIGH_RANK",
      scenario: "high ranking college",
      filters: {},
      mockDB: MOCK_DB,
      validate: (res) => {
        const c = res.data.find(r => r.collegeCode === "COL_HIGH_RANK");
        return c.subscores.rankingScore > 90 && c.subscores.accreditationScore > 60;
      }
    },
    {
      id: "TEST_AFFORDABLE",
      scenario: "affordable college",
      filters: {},
      mockDB: MOCK_DB,
      validate: (res) => {
        const c = res.data.find(r => r.collegeCode === "COL_AFFORDABLE");
        return c.subscores.affordabilityScore >= 90;
      }
    },
    {
      id: "TEST_PLACEMENT",
      scenario: "placement-heavy college",
      filters: {},
      mockDB: MOCK_DB,
      validate: (res) => {
        const c = res.data.find(r => r.collegeCode === "COL_PLACEMENT");
        // placementScore should be min(99, 100)*0.5 + min(5000000/100000 * 2, 50) = 49.5 + 50 = 99.5
        return c.subscores.placementScore > 90;
      }
    },
    {
      id: "TEST_FILTERS",
      scenario: "filter combinations",
      filters: { naacGrade: "A++", maxFees: 100000 },
      mockDB: MOCK_DB,
      validate: (res) => {
        // Since we enabled fallbacks, if no college matches exactly, it might relax maxFees and return something else.
        // Wait, COL_HIGH_RANK has A++ but no fees. So its fees array is empty. The `maxFees` filter excludes it only if fees exist and are too high.
        // If fees are empty, it includes it. So COL_HIGH_RANK is included. `isFallback` should be false.
        return res.data.length === 1 && res.data[0].collegeCode === "COL_HIGH_RANK" && res.isFallback === false;
      }
    },
    {
      id: "TEST_FALLBACK",
      scenario: "empty filter results",
      filters: { minPlacementPercentage: 105, maxFees: 1000 }, // Impossible combination
      mockDB: MOCK_DB,
      validate: (res) => {
        // Will trigger fallback. minPlacementPercentage relaxes from 105 -> 95.
        // maxFees relaxes from 1000 -> 1200.
        // COL_PLACEMENT has 99% placement, so it will now match.
        return res.isFallback === true && res.data.length > 0;
      }
    },
    {
      id: "TEST_PAGINATION",
      scenario: "pagination",
      filters: {},
      options: { page: 1, limit: 2 },
      mockDB: MOCK_DB,
      validate: (res) => {
        return res.data.length === 2 && res.total === 6 && res.page === 1 && res.limit === 2;
      }
    },
    {
      id: "TEST_SORT_MODES",
      scenario: "sort modes",
      filters: {},
      options: { sortBy: 'placements' },
      mockDB: MOCK_DB,
      validate: (res) => {
        // First college should be COL_PLACEMENT
        return res.data[0].collegeCode === "COL_PLACEMENT";
      }
    },
    {
      id: "TEST_CONFIDENCE_RANKING",
      scenario: "confidence ranking",
      filters: {},
      options: { sortBy: 'confidence' },
      mockDB: MOCK_DB,
      validate: (res) => {
        // COL_HIGH_RANK has 100 confidence
        return res.data[0].collegeCode === "COL_HIGH_RANK";
      }
    },
    {
      id: "TEST_DETERMINISTIC",
      scenario: "deterministic output",
      filters: {},
      mockDB: MOCK_DB,
      validate: async (res1) => {
        const res2 = await getRecommendations({});
        return JSON.stringify(res1) === JSON.stringify(res2);
      }
    }
  ];

  for (const tc of testCases) {
    report.totalTested++;
    try {
      // Temporarily swap DB if empty test
      const originalDB = MOCK_DB;
      if (tc.mockDB.length === 0) {
        CollegeMaster.find = () => ({ lean: async () => [] });
      } else {
        CollegeMaster.find = (query) => ({
          lean: async () => {
            let results = MOCK_DB;
            if (query["officialData.accreditation.naacGrade"]) {
              results = results.filter(c => c.officialData.accreditation?.naacGrade === query["officialData.accreditation.naacGrade"]);
            }
            return results;
          }
        });
      }

      const res = await getRecommendations(tc.filters, tc.options || {});
      const passed = await tc.validate(res);
      if (passed) {
        report.passed++;
      } else {
        report.failed++;
        report.failures.push({ scenario: tc.scenario, reason: "Validation failed" });
        console.error("Failed on:", tc.scenario);
      }
      verifications.push({
        scenario: tc.scenario,
        passed
      });
      
      // Restore
      CollegeMaster.find = (query) => ({
        lean: async () => {
          let results = MOCK_DB;
          if (query["officialData.accreditation.naacGrade"]) {
            results = results.filter(c => c.officialData.accreditation?.naacGrade === query["officialData.accreditation.naacGrade"]);
          }
          return results;
        }
      });
    } catch (e) {
      report.failed++;
      report.failures.push({ scenario: tc.scenario, reason: "Exception thrown: " + e.message });
      verifications.push({ scenario: tc.scenario, passed: false, error: e.message });
    }
  }

  // Generate outputs
  await fs.writeFile(
    path.join(__dirname, "recommendation-engine-report.json"),
    JSON.stringify(report, null, 2)
  );

  await fs.writeFile(
    path.join(__dirname, "recommendation-engine-verification.json"),
    JSON.stringify(verifications, null, 2)
  );

  console.log("Verification complete.");
  console.log(`Passed: ${report.passed}/${report.totalTested}`);
}

verifyRecommendationEngine();
