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

    let cbitChecked = false;
    let cbitAssertionsPassed = true;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const mobileRegex = /^\+91[6-9]\d{9}$/;
    const landlineRegex = /^\d{2,4}\-\d{6,8}$/;
    const pinRegex = /^[1-9]\d{5}$/;

    for (const college of colleges) {
      const code = college.collegeCode;
      const contact = college.officialData?.contact || {};
      const address = college.officialData?.address || {};

      totalCollegesChecked++;

      // Check CBIT specific data
      if (code === "CBIT") {
        cbitChecked = true;
        console.log("Verifying CBIT specific assertions...");

        // Assert CBIT emails end with @cbit.ac.in
        const cbitEmails = contact.emails || [];
        if (cbitEmails.length === 0) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: No emails found.`);
        } else {
          const nonCbitDomain = cbitEmails.filter(email => !email.endsWith("@cbit.ac.in"));
          if (nonCbitDomain.length > 0) {
            cbitAssertionsPassed = false;
            errors.push(`❌ CBIT Verification Failed: Found emails with non-cbit domain: ${nonCbitDomain.join(", ")}`);
          }
        }

        // Assert address contains Gandipet and pincode 500075
        const fullAddr = address.fullAddress || "";
        if (!fullAddr.includes("Gandipet")) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Address does not contain 'Gandipet'. Found: "${fullAddr}"`);
        }
        if (address.pincode !== "500075") {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Pincode expected 500075, found "${address.pincode}"`);
        }

        // Assert contact confidence is 95 (contact page)
        if (contact.confidence !== 95) {
          cbitAssertionsPassed = false;
          errors.push(`❌ CBIT Verification Failed: Contact confidence expected 95, found ${contact.confidence}`);
        }
      }

      // Check phones validation & normalization
      const phones = contact.phones || [];
      totalPhonesChecked += phones.length;
      phones.forEach(phone => {
        const isMobile = mobileRegex.test(phone);
        const isLandline = landlineRegex.test(phone);
        if (!isMobile && !isLandline) {
          errors.push(`❌ Phone Format Invalid: College "${code}" has phone number with invalid format: "${phone}"`);
        }
      });

      // Check duplicate phones
      const uniquePhones = new Set(phones);
      if (uniquePhones.size !== phones.length) {
        errors.push(`❌ Duplicate Phone Numbers: College "${code}" has duplicate phone numbers: ${JSON.stringify(phones)}`);
      }

      // Check emails validation & domain filters
      const emails = contact.emails || [];
      totalEmailsChecked += emails.length;
      const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "yahoomail.com"];
      emails.forEach(email => {
        if (!emailRegex.test(email)) {
          errors.push(`❌ Email Format Invalid: College "${code}" has email with invalid format: "${email}"`);
        }
        const domain = email.split("@")[1];
        if (genericDomains.includes(domain)) {
          const prefix = email.split("@")[0];
          const codeLower = code.toLowerCase();
          if (!prefix.includes(codeLower) && !codeLower.includes(prefix)) {
            errors.push(`❌ Generic Email Accepted: College "${code}" has generic email not matching code: "${email}"`);
          }
        }
      });

      // Check duplicate emails
      const uniqueEmails = new Set(emails);
      if (uniqueEmails.size !== emails.length) {
        errors.push(`❌ Duplicate Emails: College "${code}" has duplicate emails: ${JSON.stringify(emails)}`);
      }

      // Check contact confidence & sourceUrl / evidenceText metadata
      if (contact.confidence > 0) {
        if (![70, 85, 95].includes(contact.confidence)) {
          errors.push(`❌ Invalid Contact Confidence: College "${code}" has invalid confidence score: ${contact.confidence}`);
        }
        if (!contact.sourceUrl) {
          errors.push(`❌ Missing Contact sourceUrl: College "${code}" has confidence ${contact.confidence}% but missing sourceUrl.`);
        }
        if (!contact.evidenceText) {
          errors.push(`❌ Missing Contact evidenceText: College "${code}" has confidence ${contact.confidence}% but missing evidenceText.`);
        }
      }

      // Check address validation
      if (address.fullAddress) {
        totalAddressesChecked++;
        if (!address.district) {
          errors.push(`❌ Missing Address District: College "${code}" has fullAddress but missing district.`);
        }
        if (!address.state) {
          errors.push(`❌ Missing Address State: College "${code}" has fullAddress but missing state.`);
        }
        if (!address.pincode) {
          errors.push(`❌ Missing Address Pincode: College "${code}" has fullAddress but missing pincode.`);
        } else if (!pinRegex.test(address.pincode)) {
          errors.push(`❌ Invalid Address Pincode: College "${code}" has invalid pincode: "${address.pincode}"`);
        }

        // Check address confidence & sourceUrl / evidenceText metadata
        if (![70, 85, 95].includes(address.confidence)) {
          errors.push(`❌ Invalid Address Confidence: College "${code}" has invalid confidence score: ${address.confidence}`);
        }
        if (!address.sourceUrl) {
          errors.push(`❌ Missing Address sourceUrl: College "${code}" has confidence ${address.confidence}% but missing sourceUrl.`);
        }
        if (!address.evidenceText) {
          errors.push(`❌ Missing Address evidenceText: College "${code}" has confidence ${address.confidence}% but missing evidenceText.`);
        }
      }
    }

    const assertions = {
      cbitAssertionsPassed,
      phonesCorrectlyNormalized: errors.filter(e => e.includes("Phone Format")).length === 0,
      emailsCorrectlyValidated: errors.filter(e => e.includes("Email Format") || e.includes("Generic Email")).length === 0,
      addressesCorrectlyExtracted: errors.filter(e => e.includes("Address District") || e.includes("Address Pincode") || e.includes("Address State")).length === 0,
      confidenceScoreValid: errors.filter(e => e.includes("Confidence")).length === 0,
      metadataCorrectlyStored: errors.filter(e => e.includes("sourceUrl") || e.includes("evidenceText")).length === 0
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
        totalAddressesChecked,
        cbitFound: cbitChecked
      }
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "contact-extraction-verification.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("CONTACT EXTRACTION VERIFICATION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Status: ${report.status}`);
    console.log(`✓ CBIT assertions passed: ${assertions.cbitAssertionsPassed ? "PASS" : "FAIL"}`);
    console.log(`✓ Phones normalized: ${assertions.phonesCorrectlyNormalized ? "PASS" : "FAIL"}`);
    console.log(`✓ Emails validated: ${assertions.emailsCorrectlyValidated ? "PASS" : "FAIL"}`);
    console.log(`✓ Addresses extracted: ${assertions.addressesCorrectlyExtracted ? "PASS" : "FAIL"}`);
    console.log(`✓ Confidence assigned: ${assertions.confidenceScoreValid ? "PASS" : "FAIL"}`);
    console.log(`✓ Metadata stored correctly: ${assertions.metadataCorrectlyStored ? "PASS" : "FAIL"}`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    if (errors.length > 0) {
      console.error("Errors found during verification:\n");
      errors.forEach(err => console.error(err));
      process.exit(1);
    } else {
      console.log("Contact verification passed successfully!");
      process.exit(0);
    }

  } catch (error) {
    console.error("Error during contact extraction verification script:", error);
    process.exit(1);
  }
};

run();
