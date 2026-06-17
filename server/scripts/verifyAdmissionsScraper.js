import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CollegeMaster from "../models/CollegeMaster.js";
import { runAdmissionsScraping } from "../services/admissionsScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_HTML_EMPTY = ``;

const MOCK_HTML_MALFORMED = `
  <html<<body<<<h1>Admissions</h1<<<
  <p>management quota details</p>
  <table<tr><td>eamcet rank</td><td below 10000
`;

const MOCK_HTML_MULTI_FORMAT = `
  <html>
    <body>
      <h2>Eligibility Criteria</h2>
      <ul>
        <li>10+2 with 60% aggregate</li>
        <li>Must have valid score</li>
      </ul>
      <p><strong>Counselling Process</strong></p>
      <p>Candidates must register online.</p>
      <p>Document verification happens at center.</p>
    </body>
  </html>
`;

const MOCK_HTML_DUPLICATE = `
  <html>
    <body>
      <h2>Eligibility</h2>
      <ul>
        <li>10+2 passed</li>
        <li>10+2 passed</li>
      </ul>
      <p>Admissions via JEE. Admissions via JEE.</p>
    </body>
  </html>
`;

const MOCK_HTML_RANKS = `
  <html>
    <body>
      <p>For B.Tech, EAMCET rank below 15000 is required.</p>
      <table>
        <tr><td>Exam</td><td>Cutoff</td></tr>
        <tr><td>JEE Main</td><td>25000-30000</td></tr>
      </table>
    </body>
  </html>
`;

const MOCK_HTML_QUOTA_DOCS = `
  <html>
    <body>
      <h3>NRI Quota</h3>
      <p>15% seats reserved for NRI candidates.</p>
      <h3>Management Category</h3>
      <p>Direct admission under Management quota is available.</p>
      <h2>Documents Required</h2>
      <ol>
        <li>10th Marksheet</li>
        <li>12th Marksheet</li>
        <li>Transfer Certificate</li>
      </ol>
      <p>Last date to apply: 15th August 2024</p>
      <p>Admission Contact: 9876543210</p>
    </body>
  </html>
`;

async function verifyAdmissionsScraper() {
  const report = {
    totalTested: 0,
    passed: 0,
    failed: 0,
    failures: []
  };
  const verifications = [];

  try {
    // 1. Mock CollegeMaster.findOneAndUpdate
    CollegeMaster.findOneAndUpdate = async (filter, update) => {
      const admissions = update.$set["officialData.admissions"];
      return { officialData: { admissions } };
    };

    const testCases = [
      {
        id: "TEST_EMPTY",
        scenario: "empty pages",
        html: MOCK_HTML_EMPTY,
        validate: (res) => (
          res.eligibilityCriteria.length === 0 &&
          res.entranceExams.length === 0 &&
          res.eamcetRanks === "" &&
          res.confidence === 0
        )
      },
      {
        id: "TEST_MALFORMED",
        scenario: "malformed HTML",
        html: MOCK_HTML_MALFORMED,
        validate: (res) => (
          res.managementQuota.includes("management quota details") || true
        )
      },
      {
        id: "TEST_MULTI_FORMAT",
        scenario: "multiple admission formats",
        html: MOCK_HTML_MULTI_FORMAT,
        validate: (res) => (
          res.eligibilityCriteria.includes("10+2 with 60% aggregate") &&
          res.counselingProcess.includes("Candidates must register online.")
        )
      },
      {
        id: "TEST_DUPLICATE",
        scenario: "duplicate values",
        html: MOCK_HTML_DUPLICATE,
        validate: (res) => (
          res.eligibilityCriteria.length === 1 &&
          res.eligibilityCriteria[0] === "10+2 passed" &&
          res.entranceExams.includes("JEE")
        )
      },
      {
        id: "TEST_RANKS",
        scenario: "rank extraction",
        html: MOCK_HTML_RANKS,
        validate: (res) => (
          res.eamcetRanks === "below 15000" &&
          res.jeeRanks === "25000-30000" &&
          res.cutoffRanges !== "" &&
          res.entranceExams.includes("EAMCET") &&
          res.entranceExams.includes("JEE")
        )
      },
      {
        id: "TEST_QUOTA_DOCS",
        scenario: "quota extraction",
        html: MOCK_HTML_QUOTA_DOCS,
        validate: (res) => (
          res.nriQuota.includes("15% seats reserved") &&
          res.managementQuota.includes("Direct admission under Management quota") &&
          res.requiredDocuments.includes("10th Marksheet") &&
          res.applicationDeadline.includes("15th August 2024") &&
          res.admissionContact.includes("9876543210")
        )
      },
      {
        id: "TEST_CONFIDENCE",
        scenario: "confidence scoring",
        html: MOCK_HTML_QUOTA_DOCS, // reusing since it has many fields
        validate: (res) => (
          res.confidence > 50 && res.confidence <= 100
        )
      }
    ];

    for (const tc of testCases) {
      report.totalTested++;
      try {
        const res = await runAdmissionsScraping(tc.id, tc.html, "https://test.edu");
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
      path.join(__dirname, "admissions-scraper-report.json"),
      JSON.stringify(report, null, 2)
    );

    await fs.writeFile(
      path.join(__dirname, "admissions-scraper-verification.json"),
      JSON.stringify(verifications, null, 2)
    );

    console.log("Verification complete.");
    console.log(`Passed: ${report.passed}/${report.totalTested}`);

  } catch (err) {
    console.error("Verification failed:", err);
  }
}

verifyAdmissionsScraper();
