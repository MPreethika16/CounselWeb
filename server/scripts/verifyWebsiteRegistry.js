import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Blacklisted aggregator domains
const AGGREGATOR_DOMAINS = [
  "collegedunia.com",
  "shiksha.com",
  "careers360.com",
  "getmyuni.com",
  "collegebatch.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "wikipedia.org",
  "justdial.com",
  "sulekha.com",
  "tgche.cgg.gov.in",
  "tseamcet.nic.in"
];

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching all CollegeMaster records...");
    const colleges = await CollegeMaster.find({});

    const queryParamViolations = [];
    const fragmentViolations = [];
    const aggregatorViolations = [];
    const missingHealthViolations = [];
    const missingCanonicalDomainViolations = [];
    
    const urlGroups = new Map(); // url -> array of college codes

    for (const college of colleges) {
      const code = college.collegeCode;
      const url = college.officialWebsite?.url?.trim();
      const canonicalUrl = college.officialWebsite?.canonicalUrl?.trim();
      const canonicalDomain = college.officialWebsite?.canonicalDomain?.trim();
      const verified = college.officialWebsite?.verified;
      const health = college.officialWebsite?.health;

      if (url) {
        // 1. Check for query parameters
        if (url.includes("?")) {
          queryParamViolations.push({ code, url, field: "url" });
        }
        if (canonicalUrl && canonicalUrl.includes("?")) {
          queryParamViolations.push({ code, url: canonicalUrl, field: "canonicalUrl" });
        }

        // 2. Check for fragments
        if (url.includes("#")) {
          fragmentViolations.push({ code, url, field: "url" });
        }
        if (canonicalUrl && canonicalUrl.includes("#")) {
          fragmentViolations.push({ code, url: canonicalUrl, field: "canonicalUrl" });
        }

        // 3. Check for aggregator domains
        const lowerUrl = url.toLowerCase();
        const hasAggregator = AGGREGATOR_DOMAINS.some(domain => lowerUrl.includes(domain));
        if (hasAggregator) {
          aggregatorViolations.push({ code, url });
        }

        // 4. Check if canonical domain is populated
        if (!canonicalDomain) {
          missingCanonicalDomainViolations.push(code);
        }

        // 5. Check health records exist for verified websites
        if (verified) {
          if (!health || health.statusCode === undefined || health.statusCode === null) {
            // Wait, does it have health record at all? If the health object is missing or empty
            if (!health || !health.lastCheckedAt) {
              missingHealthViolations.push(code);
            }
          }
        }

        // Group by URL for duplicate check (using canonicalUrl if present, otherwise url)
        const targetUrlForGroup = (canonicalUrl || url).toLowerCase().replace(/\/$/, "");
        if (!urlGroups.has(targetUrlForGroup)) {
          urlGroups.set(targetUrlForGroup, []);
        }
        urlGroups.get(targetUrlForGroup).push(code);
      }
    }

    // Process duplicate groups
    const duplicateGroups = [];
    let unexpectedDuplicatesCount = 0;

    for (const [targetUrl, codes] of urlGroups.entries()) {
      if (codes.length > 1) {
        // Find if they share the same canonicalDomain
        const collegeDocs = colleges.filter(c => codes.includes(c.collegeCode));
        const domains = new Set(collegeDocs.map(c => c.officialWebsite?.canonicalDomain?.toLowerCase()?.trim()));
        
        // If they share the same canonicalDomain, they are expected sister colleges
        const isSisterCollegeGroup = domains.size === 1;
        
        if (!isSisterCollegeGroup) {
          unexpectedDuplicatesCount++;
        }

        duplicateGroups.push({
          url: targetUrl,
          colleges: codes,
          isSisterCollegeGroup,
          sharedDomains: Array.from(domains)
        });
      }
    }

    // Determine overall status
    const hasViolations = queryParamViolations.length > 0 ||
                          fragmentViolations.length > 0 ||
                          aggregatorViolations.length > 0 ||
                          missingHealthViolations.length > 0 ||
                          missingCanonicalDomainViolations.length > 0 ||
                          unexpectedDuplicatesCount > 0;

    const assertions = {
      noQueryParameters: queryParamViolations.length === 0,
      noFragments: fragmentViolations.length === 0,
      noUnexpectedDuplicateCanonicalUrls: unexpectedDuplicatesCount === 0,
      noAggregatorDomainsStored: aggregatorViolations.length === 0,
      healthRecordsExistForVerified: missingHealthViolations.length === 0,
      canonicalDomainsPopulated: missingCanonicalDomainViolations.length === 0
    };

    const report = {
      timestamp: new Date().toISOString(),
      status: hasViolations ? "FAILED" : "PASSED",
      assertions,
      details: {
        queryParamViolations,
        fragmentViolations,
        aggregatorViolations,
        missingHealthViolations,
        missingCanonicalDomainViolations,
        duplicateGroups
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, "website-registry-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("WEBSITE REGISTRY VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ No URLs contain query parameters: ${assertions.noQueryParameters ? "PASS" : "FAIL"}`);
    console.log(`✓ No URLs contain fragments: ${assertions.noFragments ? "PASS" : "FAIL"}`);
    console.log(`✓ No unexpected duplicates: ${assertions.noUnexpectedDuplicateCanonicalUrls ? "PASS" : "FAIL"}`);
    console.log(`✓ No aggregator domains: ${assertions.noAggregatorDomainsStored ? "PASS" : "FAIL"}`);
    console.log(`✓ Health records exist: ${assertions.healthRecordsExistForVerified ? "PASS" : "FAIL"}`);
    console.log(`✓ Canonical domains populated: ${assertions.canonicalDomainsPopulated ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (hasViolations) {
      console.error("Verification failed. Check the generated report for violations.");
      process.exit(1);
    } else {
      console.log("Verification passed successfully!");
      process.exit(0);
    }
  } catch (error) {
    console.error("Error during website registry verification:", error);
    process.exit(1);
  }
};

run();
