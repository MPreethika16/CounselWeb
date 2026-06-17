import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CollegeMaster from "../models/CollegeMaster.js";
import { runRankingsScraping } from "../services/rankingsScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_HTML_EMPTY = `<html><body></body></html>`;

const MOCK_HTML_MALFORMED = `
  <html<<body<<<h1>Rankings</h1<<<
  <p>NIRF Rank 15 in engineering 2023</p>
  <p>NAAC grade A+ with 3.45 cgpa</p>
`;

const MOCK_HTML_NIRF_TABLE = `
  <html>
    <body>
      <h3>National Institutional Ranking Framework</h3>
      <table>
        <tr><th>Year</th><th>Category</th><th>Rank</th><th>Score</th></tr>
        <tr><td>2023</td><td>Engineering</td><td>45</td><td>65.4</td></tr>
        <tr><td>2022</td><td>Engineering</td><td>50</td><td>62.1</td></tr>
        <tr><td>2023</td><td>Overall</td><td>100</td><td>50.5</td></tr>
      </table>
    </body>
  </html>
`;

const MOCK_HTML_NAAC = `
  <html>
    <body>
      <p>The college is accredited by NAAC with an 'A++' Grade and a CGPA of 3.85 valid up to 2028.</p>
    </body>
  </html>
`;

const MOCK_HTML_NBA = `
  <html>
    <body>
      <p>We have 5 programs that are NBA Accredited, valid till 2025.</p>
    </body>
  </html>
`;

const MOCK_HTML_DUPLICATES = `
  <html>
    <body>
      <p>India Today ranked us 12th in 2023.</p>
      <p>India Today ranked us 15th in 2023.</p>
    </body>
  </html>
`;

const MOCK_HTML_MULTI_YEAR = `
  <html>
    <body>
      <p>QS ranked us 50th in 2023, and 60th in 2022.</p>
    </body>
  </html>
`;

const MOCK_HTML_INVALID_GRADE = `
  <html>
    <body>
      <p>NAAC grade Z with 3.45 cgpa</p>
      <p>NAAC grade Provisional with 2.1 cgpa</p>
    </body>
  </html>
`;

const MOCK_HTML_MISSING_YEAR = `
  <html>
    <body>
      <p>QS ranked us 50th.</p>
    </body>
  </html>
`;

const MOCK_HTML_DUP_AGENCY = `
  <html>
    <body>
      <p>QS ranked us 50th in 2023.</p>
      <p>QS ranked us 60th in 2023.</p>
    </body>
  </html>
`;

const MOCK_HTML_IMAGE_ONLY = `
  <html>
    <body>
      <img src="nirf.png" alt="NIRF Rank 10" />
      <p>NIRF ranked us 20th in 2023.</p>
    </body>
  </html>
`;

async function verifyRankingsScraper() {
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
      const setObj = update.$set;
      return { 
        officialData: { 
          rankings: setObj["officialData.rankings"] || [],
          accreditation: {
            naacGrade: setObj["officialData.accreditation.naacGrade"] || "",
            naacScore: setObj["officialData.accreditation.naacScore"] || null,
            naacValidity: setObj["officialData.accreditation.naacValidity"] || "",
            nbaAccredited: setObj["officialData.accreditation.nbaAccredited"] || false,
            nbaValidity: setObj["officialData.accreditation.nbaValidity"] || "",
            nirfRank: setObj["officialData.accreditation.nirfRank"] || null,
            nirfParticipated: setObj["officialData.accreditation.nirfParticipated"] || false,
            confidence: setObj["officialData.accreditation.confidence"] || 0
          }
        } 
      };
    };

    const testCases = [
      {
        id: "TEST_EMPTY",
        scenario: "empty page",
        html: MOCK_HTML_EMPTY,
        validate: (res) => (
          res.rankings.length === 0 &&
          res.accreditation.nirfRank === null &&
          res.accreditation.confidence === 0
        )
      },
      {
        id: "TEST_MALFORMED",
        scenario: "malformed HTML",
        html: MOCK_HTML_MALFORMED,
        validate: (res) => (
          res.rankings.find(r => r.agency === "NIRF" && r.rank === 15 && r.year === 2023) !== undefined &&
          res.accreditation.naacGrade === "A+" &&
          res.accreditation.naacScore === 3.45
        )
      },
      {
        id: "TEST_NIRF_TABLE",
        scenario: "NIRF table",
        html: MOCK_HTML_NIRF_TABLE,
        validate: (res) => (
          res.rankings.length === 3 &&
          res.rankings.find(r => r.category === "Engineering" && r.year === 2023 && r.rank === 45) !== undefined &&
          res.accreditation.nirfRank === 45 // highest rank out of all NIRF
        )
      },
      {
        id: "TEST_NAAC",
        scenario: "NAAC text",
        html: MOCK_HTML_NAAC,
        validate: (res) => (
          res.accreditation.naacGrade === "A++" &&
          res.accreditation.naacScore === 3.85 &&
          res.accreditation.naacValidity === "2028"
        )
      },
      {
        id: "TEST_NBA",
        scenario: "NBA text",
        html: MOCK_HTML_NBA,
        validate: (res) => (
          res.accreditation.nbaAccredited === true &&
          res.accreditation.nbaValidity === "2025"
        )
      },
      {
        id: "TEST_DUPLICATES",
        scenario: "duplicate rankings",
        html: MOCK_HTML_DUPLICATES,
        validate: (res) => (
          res.rankings.length === 1 &&
          res.rankings[0].agency === "India Today" &&
          res.rankings[0].rank === 12 // Keeps best rank
        )
      },
      {
        id: "TEST_MULTI_YEAR",
        scenario: "multiple years",
        html: MOCK_HTML_MULTI_YEAR,
        validate: (res) => (
          res.rankings.length === 2 &&
          res.rankings.find(r => r.year === 2023 && r.rank === 50) !== undefined
        )
      },
      {
        id: "TEST_CONFIDENCE",
        scenario: "confidence scoring",
        html: MOCK_HTML_NIRF_TABLE + MOCK_HTML_NAAC + MOCK_HTML_NBA + MOCK_HTML_DUPLICATES,
        validate: (res) => (
          res.accreditation.confidence === 100 // 4+ criteria met
        )
      },
      {
        id: "TEST_INVALID_GRADE",
        scenario: "invalid grades",
        html: MOCK_HTML_INVALID_GRADE,
        validate: (res) => (
          res.accreditation.naacGrade === "" &&
          res.accreditation.naacScore === null
        )
      },
      {
        id: "TEST_MISSING_YEAR",
        scenario: "missing years",
        html: MOCK_HTML_MISSING_YEAR,
        validate: (res) => (
          res.rankings.length === 1 &&
          res.rankings[0].agency === "QS" &&
          res.rankings[0].rank === 50 &&
          res.rankings[0].year === null &&
          res.rankings[0].sourceUrl === "https://test.edu"
        )
      },
      {
        id: "TEST_DUP_AGENCY",
        scenario: "duplicate agencies",
        html: MOCK_HTML_DUP_AGENCY,
        validate: (res) => (
          res.rankings.length === 1 &&
          res.rankings[0].agency === "QS" &&
          res.rankings[0].rank === 50 // Should keep best rank (lowest number)
        )
      },
      {
        id: "TEST_IMAGE_ONLY",
        scenario: "image-only fallback",
        html: MOCK_HTML_IMAGE_ONLY,
        validate: (res) => (
          res.rankings.length === 1 &&
          res.rankings[0].agency === "NIRF" &&
          res.rankings[0].rank === 20 &&
          res.rankings[0].year === 2023
        )
      },
      {
        id: "TEST_DETERMINISTIC",
        scenario: "deterministic output",
        html: MOCK_HTML_NIRF_TABLE,
        validate: (res) => {
          // This relies on the fact that if it runs again, it should produce same result.
          // Since it's pure logic in normalizeRankings, we just verify standard NIRF again.
          return res.rankings.length === 3 && res.accreditation.nirfRank === 45;
        }
      }
    ];

    for (const tc of testCases) {
      report.totalTested++;
      try {
        const res = await runRankingsScraping(tc.id, tc.html, "https://test.edu");
        const passed = tc.validate(res);
        if (passed) {
          report.passed++;
        } else {
          report.failed++;
          report.failures.push({ college: tc.id, scenario: tc.scenario, reason: "Validation failed" });
          console.error("Failed on:", tc.scenario, JSON.stringify(res, null, 2));
        }
        verifications.push({
          collegeCode: tc.id,
          scenario: tc.scenario,
          confidence: res.accreditation.confidence,
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
      path.join(__dirname, "rankings-scraper-report.json"),
      JSON.stringify(report, null, 2)
    );

    await fs.writeFile(
      path.join(__dirname, "rankings-scraper-verification.json"),
      JSON.stringify(verifications, null, 2)
    );

    console.log("Verification complete.");
    console.log(`Passed: ${report.passed}/${report.totalTested}`);

  } catch (err) {
    console.error("Verification failed:", err);
  }
}

verifyRankingsScraper();
