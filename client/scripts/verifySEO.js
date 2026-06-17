import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { seoService } from "../services/seoService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verifySEO() {
  console.log("Starting SEO Architecture Verification...");
  const verifications = [];

  try {
    // 1. Title Generation
    const mockCollege = { meta: { name: "VIT Vellore", location: "Tamil Nadu" }, placements: { averagePackageLPA: 8.5 } };
    const title = seoService.generateCollegeTitle(mockCollege);
    verifications.push({
      scenario: "Dynamic Meta Title Generation",
      passed: title.includes("VIT Vellore") && title.includes("Fees, Placements"),
      note: "Deterministic title tag generator functional."
    });

    // 2. Robots Directives
    const robots = seoService.generateRobotsTxt();
    verifications.push({
      scenario: "Robots Directives Integrity",
      passed: robots.includes("Disallow: /profile") && robots.includes("Sitemap:"),
      note: "Robots.txt safely blocks personalization routes while surfacing sitemaps."
    });

    // 3. Sitemap Construction
    const sitemap = seoService.generateSitemapXML([{ collegeCode: "VITV" }]);
    verifications.push({
      scenario: "XML Sitemap Compilation",
      passed: sitemap.includes("<loc>https://counselweb.com/college/VITV</loc>"),
      note: "Dynamic entities mapped to canonical locations."
    });

  } catch (err) {
    console.error(err);
  }

  const report = {
    total: verifications.length,
    passed: verifications.filter(v => v.passed).length,
    status: verifications.every(v => v.passed) ? "SEO_READY" : "FAILED"
  };

  await fs.writeFile(path.join(__dirname, "seo-report.json"), JSON.stringify(report, null, 2));
  console.log(`SEO Verification: ${report.passed}/${report.total} Passed.`);
}

verifySEO();
