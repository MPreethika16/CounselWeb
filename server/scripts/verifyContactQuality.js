import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching colleges with active raw page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    console.log(`Found ${colleges.length} college(s) to verify.`);

    const errors = [];
    let totalCollegesChecked = 0;
    let totalPhonesChecked = 0;
    let totalEmailsChecked = 0;
    let totalAddressesChecked = 0;

    const genuinelyValidCityDistricts = ["hyderabad", "karimnagar", "khammam", "nizamabad", "mahabubnagar", "warangal"];

    for (const college of colleges) {
      const code = college.collegeCode;
      const contact = college.officialData?.contact || {};
      const address = college.officialData?.address || {};

      totalCollegesChecked++;
      console.log(`Verifying quality rules for college [${code}]...`);

      // 1. Assert no duplicate phones & check categorization
      const phones = contact.phones || [];
      totalPhonesChecked += phones.length;

      const phoneNumbers = phones.map(p => p.number);
      const uniquePhoneNumbers = new Set(phoneNumbers);
      if (uniquePhoneNumbers.size !== phones.length) {
        errors.push(`❌ Duplicate Phones Found: College "${code}" has duplicate numbers in: ${JSON.stringify(phoneNumbers)}`);
      }

      phones.forEach(p => {
        if (!p.number) {
          errors.push(`❌ Missing Phone Number: College "${code}" has a phone object without a number.`);
        }
        if (!p.category || !["admissions", "placements", "principal", "office", "general"].includes(p.category)) {
          errors.push(`❌ Invalid Phone Category: College "${code}" has phone number "${p.number}" with invalid category: "${p.category}"`);
        }
      });

      // 2. Assert district populated correctly & address components checks
      if (address.fullAddress) {
        totalAddressesChecked++;
        if (!address.district) {
          errors.push(`❌ Missing District: College "${code}" has an address but is missing the district.`);
        }

        // 3. Assert city and district are not identical unless genuinely valid
        const city = (address.city || "").trim();
        const district = (address.district || "").trim();

        if (city && district && city.toLowerCase() === district.toLowerCase()) {
          if (!genuinelyValidCityDistricts.includes(district.toLowerCase())) {
            errors.push(`❌ Invalid City-District Duplication: College "${code}" has identical city and district: "${city}", which is not in the genuinely valid list.`);
          }
        }
      }

      // 4. Assert social links have confidence scores and verified flags
      const socialLinks = contact.socialLinks || {};
      for (const [platform, data] of Object.entries(socialLinks)) {
        if (data && data.url) {
          if (data.confidence === undefined || data.confidence === null) {
            errors.push(`❌ Missing Social Confidence: College "${code}" has social link for ${platform} but is missing confidence score`);
          } else if (data.confidence < 0 || data.confidence > 100) {
            errors.push(`❌ Invalid Social Confidence: College "${code}" has social link for ${platform} with invalid confidence score of ${data.confidence}`);
          }

          if (data.verified === undefined || data.verified === null) {
            errors.push(`❌ Missing Social Verified Flag: College "${code}" has social link for ${platform} but is missing verified flag`);
          }
        }
      }

      // 5. Assert official-domain emails are prioritized
      const emails = contact.emails || [];
      totalEmailsChecked += emails.length;
      const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "yahoomail.com"];
      const officialDomain = emails.some(email => {
        const domain = email.split("@")[1];
        return !genericDomains.includes(domain);
      });
      const hasGeneric = emails.some(email => {
        const domain = email.split("@")[1];
        return genericDomains.includes(domain);
      });

      if (officialDomain && hasGeneric) {
        errors.push(`❌ Email Prioritization Failed: College "${code}" contains generic email addresses alongside custom domain emails: ${JSON.stringify(emails)}`);
      }
    }

    const assertions = {
      noDuplicatePhones: errors.filter(e => e.includes("Duplicate Phones")).length === 0,
      districtPopulatedCorrectly: errors.filter(e => e.includes("Missing District")).length === 0,
      cityAndDistrictNotIdenticalUnlessValid: errors.filter(e => e.includes("City-District Duplication")).length === 0,
      socialLinksHaveConfidenceScores: errors.filter(e => e.includes("Social Confidence") || e.includes("Social Verified")).length === 0,
      officialDomainEmailsPrioritized: errors.filter(e => e.includes("Email Prioritization")).length === 0
    };

    const status = errors.length === 0 ? "PASSED" : "FAILED";

    const report = {
      timestamp: new Date().toISOString(),
      status,
      assertions,
      errors,
      metrics: {
        collegesChecked: totalCollegesChecked,
        totalPhonesChecked,
        totalEmailsChecked,
        totalAddressesChecked
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "contact-quality-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("CONTACT QUALITY HARDENING VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ No duplicate phones: ${assertions.noDuplicatePhones ? "PASS" : "FAIL"}`);
    console.log(`✓ District populated correctly: ${assertions.districtPopulatedCorrectly ? "PASS" : "FAIL"}`);
    console.log(`✓ City and district not identical unless valid: ${assertions.cityAndDistrictNotIdenticalUnlessValid ? "PASS" : "FAIL"}`);
    console.log(`✓ Social links have confidence scores and verified flags: ${assertions.socialLinksHaveConfidenceScores ? "PASS" : "FAIL"}`);
    console.log(`✓ Official domain emails prioritized: ${assertions.officialDomainEmailsPrioritized ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Quality verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during contact quality verification script:", error);
    process.exit(1);
  }
};

run();
