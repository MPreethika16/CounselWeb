import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CollegeMaster from "../models/CollegeMaster.js";
import { runPlacementsScraping } from "../services/placementsScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_HTML_EMPTY = ``;

const MOCK_HTML_MALFORMED = `
  <html<<body<<<h1>Placements</h1<<<
  <p>highest package 12 lpa</p>
  <img src="tcs.png" alt="TCS Logo">
`;

const MOCK_HTML_SALARY_FORMATS = `
  <html>
    <body>
      <p>The highest package offered was Rs 45.5 Lakhs per annum.</p>
      <p>Average package stood at 6.5 LPA.</p>
      <p>Internship highest stipend is 50k.</p>
    </body>
  </html>
`;

const MOCK_HTML_RECRUITER_DUPES = `
  <html>
    <body>
      <p>Top recruiters include Amazon, Microsoft, and TCS.</p>
      <p>Amazon also offered the highest internship.</p>
      <img src="amazon.png" alt="Amazon Logo">
      <img src="tcs.png" alt="TCS Company">
    </body>
  </html>
`;

const MOCK_HTML_MULTI_YEAR = `
  <html>
    <body>
      <h2>Placements 2023-2024</h2>
      <p>Highest Package: 24 LPA</p>
      <h2>Placements 2022-2023</h2>
      <p>Highest Package: 20 LPA</p>
    </body>
  </html>
`;

const MOCK_HTML_BRANCH_TABLE = `
  <html>
    <body>
      <table>
        <tr><th>Branch</th><th>Highest Package</th><th>Placed %</th></tr>
        <tr><td>Computer Science</td><td>30 LPA</td><td>95%</td></tr>
        <tr><td>Mechanical</td><td>10 LPA</td><td>80.5%</td></tr>
      </table>
    </body>
  </html>
`;

async function verifyPlacementsScraper() {
  const report = {
    totalTested: 0,
    passed: 0,
    failed: 0,
    failures: []
  };
  const verifications = [];

  try {
    // Mock Database Update
    CollegeMaster.findOneAndUpdate = async (filter, update) => {
      const placements = update.$set["officialData.placements"];
      return { officialData: { placements } };
    };

    const testCases = [
      {
        id: "TEST_EMPTY",
        scenario: "empty pages",
        html: MOCK_HTML_EMPTY,
        validate: (res) => (
          res.highestPackage === null &&
          res.recruiters.length === 0 &&
          res.confidence === 0
        )
      },
      {
        id: "TEST_MALFORMED",
        scenario: "malformed HTML",
        html: MOCK_HTML_MALFORMED,
        validate: (res) => (
          res.highestPackage === 1200000 &&
          res.recruiters.some(r => r.name.toLowerCase() === "tcs")
        )
      },
      {
        id: "TEST_SALARY_FORMATS",
        scenario: "salary formats LPA/INR",
        html: MOCK_HTML_SALARY_FORMATS,
        validate: (res) => (
          res.highestPackage === 4550000 &&
          res.averagePackage === 650000 &&
          res.internshipData.highestStipend === 50000
        )
      },
      {
        id: "TEST_RECRUITER_DUPES",
        scenario: "recruiter duplicates",
        html: MOCK_HTML_RECRUITER_DUPES,
        validate: (res) => {
          const names = res.recruiters.map(r => r.name.toLowerCase());
          const amazonCount = names.filter(n => n === "amazon").length;
          const tcsCount = names.filter(n => n === "tcs").length;
          return amazonCount === 1 && tcsCount === 1 && names.includes("microsoft");
        }
      },
      {
        id: "TEST_MULTI_YEAR",
        scenario: "multiple years",
        html: MOCK_HTML_MULTI_YEAR,
        validate: (res) => (
          res.placementYear === 2023 &&
          res.highestPackage === 2400000 // grabs the first explicitly or max, we just check logic executed
        )
      },
      {
        id: "TEST_BRANCH_TABLE",
        scenario: "branch tables",
        html: MOCK_HTML_BRANCH_TABLE,
        validate: (res) => (
          res.branchPlacements.length === 2 &&
          res.branchPlacements[0].branch === "Computer Science" &&
          res.branchPlacements[0].highestPackage === 3000000 &&
          res.branchPlacements[0].placedPercentage === 95 &&
          res.branchPlacements[1].placedPercentage === 80.5 &&
          res.placementPercentage === 95 // max placement pct found across all text/tables
        )
      },
      {
        id: "TEST_CONFIDENCE",
        scenario: "confidence scoring",
        html: MOCK_HTML_BRANCH_TABLE + MOCK_HTML_SALARY_FORMATS + MOCK_HTML_RECRUITER_DUPES + MOCK_HTML_MULTI_YEAR,
        validate: (res) => (
          res.confidence === 100 // all fields present
        )
      }
    ];

    for (const tc of testCases) {
      report.totalTested++;
      try {
        const res = await runPlacementsScraping(tc.id, tc.html, "https://test.edu");
        const passed = tc.validate(res);
        if (passed) {
          report.passed++;
        } else {
          report.failed++;
          report.failures.push({ college: tc.id, scenario: tc.scenario, reason: "Validation failed" });
          console.error("Failed on:", tc.scenario, res);
        }
        verifications.push({
          collegeCode: tc.id,
          scenario: tc.scenario,
          confidence: res.confidence,
          passed
        });
      } catch (e) {
        report.failed++;
        report.failures.push({ college: tc.id, scenario: tc.scenario, reason: "Exception thrown: " + e.message });
        verifications.push({
          collegeCode: tc.id,
          scenario: tc.scenario,
          passed: false,
          error: e.message
        });
      }
    }

    // Generate outputs
    await fs.writeFile(
      path.join(__dirname, "placements-scraper-report.json"),
      JSON.stringify(report, null, 2)
    );

    await fs.writeFile(
      path.join(__dirname, "placements-scraper-verification.json"),
      JSON.stringify(verifications, null, 2)
    );

    console.log("Verification complete.");
    console.log(`Passed: ${report.passed}/${report.totalTested}`);

  } catch (err) {
    console.error("Verification failed:", err);
  }
}

verifyPlacementsScraper();
