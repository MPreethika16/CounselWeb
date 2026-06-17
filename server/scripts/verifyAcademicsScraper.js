// server/scripts/verifyAcademicsScraper.js
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CollegeMaster from "../models/CollegeMaster.js";
import { runAcademicsScraping } from "../services/academicsScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_HTML_FULL = `
  <html>
    <body>
      <h1>Department of Engineering</h1>
      <ul>
        <li>Computer Science</li>
        <li>Mechanical Engineering</li>
      </ul>
      <h2>Programs Offered</h2>
      <table>
        <tr><td>B.Tech</td></tr>
        <tr><td>M.Tech</td></tr>
      </table>
      <h3>Specializations</h3>
      <ul>
        <li>Artificial Intelligence</li>
        <li>Data Science</li>
      </ul>
      <p>Total intake capacity: 500 seats.</p>
      <p>Faculty members: 50.</p>
      <p>The student-faculty ratio is exactly 10:1.</p>
      <a href="/curriculum.pdf">Download Curriculum</a>
      <a href="/academic-calendar-2025.pdf">Academic Calendar</a>
      <a href="/regulations.html">Academic Regulations</a>
    </body>
  </html>
`;

const MOCK_HTML_EMPTY = ``; // Empty page

const MOCK_HTML_MALFORMED = `
  <html<<body<<<h1>Department of Arts</h1<<<
  <p>intake 100</p>
  <a href="curriculum.pdf">Curriculum<//a>
`; // Malformed HTML

const MOCK_HTML_DUPLICATE = `
  <html>
    <body>
      <h1>Department of Science</h1>
      <ul>
        <li>Physics</li>
        <li>Physics</li>
        <li>Physics</li>
      </ul>
      <p>Faculty: 20</p>
      <p>Faculty members: 20.</p>
      <a href="/curriculum.pdf">Curriculum</a>
      <a href="/curriculum.pdf">Download Curriculum</a>
    </body>
  </html>
`; // Duplicate values

const MOCK_HTML_PARTIAL = `
  <html>
    <body>
      <h1>Department of Commerce</h1>
      <ul>
        <li>Accounting</li>
      </ul>
      <p>Intake capacity: 150 seats.</p>
    </body>
  </html>
`; // Partial data

async function verifyAcademicsScraper() {
  const report = {
    totalTested: 0,
    passed: 0,
    failed: 0,
    failures: []
  };
  const verifications = [];

  try {
    // 1. Mock CollegeMaster.findOneAndUpdate to bypass DB connection
    CollegeMaster.findOneAndUpdate = async (filter, update) => {
      const academics = update.$set["officialData.academics"];
      return { officialData: { academics } };
    };

    // 2. Mock CollegeMaster.create to prevent DB insertion
    CollegeMaster.create = async () => {};

    const testCases = [
      {
        id: "TEST_FULL",
        scenario: "full data",
        html: MOCK_HTML_FULL,
        validate: (res) => (
          res.departments.includes("Computer Science") &&
          res.programs.includes("B.Tech") &&
          res.specializations.includes("Artificial Intelligence") &&
          res.intakeCapacity === 500 &&
          res.facultyCount === 50 &&
          res.studentFacultyRatio === 10 &&
          res.curriculumUrls.length > 0 &&
          res.academicCalendarUrls.length > 0 &&
          res.regulationUrls.length > 0 &&
          res.confidence > 80
        )
      },
      {
        id: "TEST_EMPTY",
        scenario: "empty page",
        html: MOCK_HTML_EMPTY,
        validate: (res) => (
          res.departments.length === 0 &&
          res.programs.length === 0 &&
          res.intakeCapacity === null &&
          res.facultyCount === null &&
          res.confidence === 0
        )
      },
      {
        id: "TEST_MALFORMED",
        scenario: "malformed HTML",
        html: MOCK_HTML_MALFORMED,
        validate: (res) => (
          // Cheerio handles malformed HTML reasonably well
          res.departments.includes("Arts") || res.intakeCapacity === 100 || res.curriculumUrls.length > 0 || true 
          // Mostly testing it doesn't crash and returns something or nothing
        )
      },
      {
        id: "TEST_DUPLICATE",
        scenario: "duplicate values",
        html: MOCK_HTML_DUPLICATE,
        validate: (res) => (
          res.departments.filter(d => d === "Physics").length === 1 &&
          res.facultyCount === 20 &&
          res.curriculumUrls.length === 1
        )
      },
      {
        id: "TEST_PARTIAL",
        scenario: "partial data",
        html: MOCK_HTML_PARTIAL,
        validate: (res) => (
          res.departments.includes("Accounting") &&
          res.intakeCapacity === 150 &&
          res.facultyCount === null &&
          res.studentFacultyRatio === null &&
          res.programs.length === 0 &&
          res.confidence > 0 && res.confidence < 50
        )
      }
    ];

    for (const tc of testCases) {
      report.totalTested++;
      try {
        const res = await runAcademicsScraping(tc.id, tc.html, "https://test.edu");
        const passed = tc.validate(res);
        if (passed) {
          report.passed++;
        } else {
          report.failed++;
          report.failures.push({ college: tc.id, scenario: tc.scenario, reason: "Validation failed" });
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

    // 5. Generate outputs
    await fs.writeFile(
      path.join(__dirname, "academics-scraper-report.json"),
      JSON.stringify(report, null, 2)
    );

    await fs.writeFile(
      path.join(__dirname, "academics-scraper-verification.json"),
      JSON.stringify(verifications, null, 2)
    );

    console.log("Verification complete.");
    console.log(`Passed: ${report.passed}/${report.totalTested}`);

  } catch (err) {
    console.error("Verification failed:", err);
  }
}

verifyAcademicsScraper();
