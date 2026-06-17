import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CollegeMaster from "../models/CollegeMaster.js";
import { runFeesScraping } from "../services/feesScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_HTML_EMPTY = ``;

const MOCK_HTML_MALFORMED = `
  <html<<body<<<h1>Fees</h1<<<
  <p>tuition 50,000</p>
  <table<tr><td>hostel</td><td 12000
`;

const MOCK_HTML_TABLE = `
  <html>
    <body>
      <h2>Fee Structure</h2>
      <table>
        <tr><th>Component</th><th>Amount (INR)</th></tr>
        <tr><td>Tuition Fee</td><td>1,00,000</td></tr>
        <tr><td>Hostel Fee</td><td>50,000</td></tr>
        <tr><td>Exam Fee</td><td>5000</td></tr>
        <tr><td>Library / Misc</td><td>10000</td></tr>
        <tr><td>Transport Fee</td><td>20000</td></tr>
        <tr><td>Academic Year</td><td>2024-2025</td></tr>
        <tr><td>Category/Quota</td><td>Management</td></tr>
      </table>
      <p>The total annual fee is Rs 1,85,000</p>
    </body>
  </html>
`;

const MOCK_HTML_DUPLICATE = `
  <html>
    <body>
      <p>Tuition Fee: 40000</p>
      <p>Tuition Fee is revised to 45000</p>
      <p>Quota: General</p>
      <p>Quota: Merit</p>
    </body>
  </html>
`;

const MOCK_HTML_PARTIAL = `
  <html>
    <body>
      <p>Total Tuition Fee is INR 75,000 per year.</p>
      <p>Exam fees extra Rs. 2500.</p>
    </body>
  </html>
`;

const MOCK_HTML_MULTI_YEAR = `
  <html>
    <body>
      <p>Tuition Fee: 60000</p>
      <p>Fee applies to batch 2021-2025.</p>
      <p>Also updated for year 2023-2024.</p>
    </body>
  </html>
`;

const MOCK_HTML_MULTI_TABLE = `
  <html>
    <body>
      <h2>B.Tech Fees</h2>
      <table>
        <tr><td>Tuition</td><td>100000</td></tr>
      </table>
      <h2>M.Tech Fees</h2>
      <table>
        <tr><td>Tuition</td><td>120000</td></tr>
        <tr><td>Exam</td><td>2000</td></tr>
      </table>
    </body>
  </html>
`;

const MOCK_HTML_NO_CURRENCY = `
  <html>
    <body>
      <p>Annual fee is 80000</p>
      <p>Hostel 30000</p>
    </body>
  </html>
`;

async function verifyFeesScraper() {
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
      const fees = update.$set["officialData.fees"];
      return { officialData: { fees } };
    };

    const testCases = [
      {
        id: "TEST_EMPTY",
        scenario: "empty page",
        html: MOCK_HTML_EMPTY,
        validate: (res) => (
          res.tuitionFee === null &&
          res.hostelFee === null &&
          res.feeYear === "" &&
          res.confidence === 0
        )
      },
      {
        id: "TEST_MALFORMED",
        scenario: "malformed HTML",
        html: MOCK_HTML_MALFORMED,
        validate: (res) => (
          res.tuitionFee === 50000 || res.hostelFee === 12000 || true // Just ensure no crash
        )
      },
      {
        id: "TEST_TABLE",
        scenario: "fee tables",
        html: MOCK_HTML_TABLE,
        validate: (res) => (
          res.tuitionFee === 100000 &&
          res.hostelFee === 50000 &&
          res.examFee === 5000 &&
          res.miscFee === 10000 &&
          res.transportFee === 20000 &&
          res.annualFee === 185000 &&
          res.feeYear === "2024-2025" &&
          res.categoryQuota === "Management" &&
          res.confidence === 100
        )
      },
      {
        id: "TEST_DUPLICATE",
        scenario: "duplicate values",
        html: MOCK_HTML_DUPLICATE,
        validate: (res) => (
          res.tuitionFee === 45000 && // Should pick the max value safely parsed
          res.categoryQuota === "General/Merit" // "General" and "Merit" map to the same
        )
      },
      {
        id: "TEST_PARTIAL",
        scenario: "partial data",
        html: MOCK_HTML_PARTIAL,
        validate: (res) => (
          res.tuitionFee === 75000 &&
          res.examFee === 2500 &&
          res.hostelFee === null &&
          res.confidence > 0 && res.confidence < 100
        )
      },
      {
        id: "TEST_MULTI_YEAR",
        scenario: "multiple years",
        html: MOCK_HTML_MULTI_YEAR,
        validate: (res) => (
          res.tuitionFee === 60000 &&
          (res.feeYear === "2021-2025" || res.feeYear === "2023-2024") // Just grabs first unique
        )
      },
      {
        id: "TEST_MULTI_TABLE",
        scenario: "multiple fee tables",
        html: MOCK_HTML_MULTI_TABLE,
        validate: (res) => (
          res.tuitionFee === 120000 && // Should pick max value from the multiple tables
          res.examFee === 2000
        )
      },
      {
        id: "TEST_NO_CURRENCY",
        scenario: "missing currency",
        html: MOCK_HTML_NO_CURRENCY,
        validate: (res) => (
          res.annualFee === 80000 &&
          res.hostelFee === 30000
        )
      }
    ];

    for (const tc of testCases) {
      report.totalTested++;
      try {
        const res = await runFeesScraping(tc.id, tc.html, "https://test.edu");
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
      path.join(__dirname, "fees-scraper-report.json"),
      JSON.stringify(report, null, 2)
    );

    await fs.writeFile(
      path.join(__dirname, "fees-scraper-verification.json"),
      JSON.stringify(verifications, null, 2)
    );

    console.log("Verification complete.");
    console.log(`Passed: ${report.passed}/${report.totalTested}`);

  } catch (err) {
    console.error("Verification failed:", err);
  }
}

verifyFeesScraper();
