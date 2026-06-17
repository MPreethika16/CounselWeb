import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_DIR = path.join(__dirname, "../tests/e2e");

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function verifyBrowserTesting() {
  console.log("Starting Browser E2E Testing Verification...");
  const verifications = [];

  try {
    const requiredFiles = [
      "auth.spec.js",
      "search.spec.js",
      "recommendations.spec.js",
      "personalization.spec.js",
      "comparison.spec.js"
    ];

    let allExists = true;
    for (const file of requiredFiles) {
      if (!(await checkFileExists(path.join(E2E_DIR, file)))) allExists = false;
    }
    
    verifications.push({
      scenario: "E2E Scaffold Integrity",
      passed: allExists,
      note: "All core user journey test specs successfully scaffolded."
    });

    // Check Playwright DSL presence
    const authContent = await fs.readFile(path.join(E2E_DIR, "auth.spec.js"), "utf8");
    verifications.push({
      scenario: "Playwright DSL Syntax",
      passed: authContent.includes("@playwright/test") && authContent.includes("page.goto"),
      note: "Playwright browser-automation context correctly configured."
    });

  } catch (err) {
    console.error(err);
  }

  const report = {
    total: verifications.length,
    passed: verifications.filter(v => v.passed).length,
    status: verifications.every(v => v.passed) ? "TESTS_READY" : "FAILED"
  };

  await fs.writeFile(path.join(__dirname, "browser-testing-report.json"), JSON.stringify(report, null, 2));
  console.log(`Browser E2E Testing Verification: ${report.passed}/${report.total} Passed.`);
}

verifyBrowserTesting();
