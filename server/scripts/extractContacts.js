import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import {
  extractPhones,
  extractEmails,
  extractAddress,
  extractSocialAndMapsLinks,
  categorizePhone,
  verifySocialLink
} from "../services/contactExtractor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Resetting contact and address fields in CollegeMaster to avoid schema casting conflicts...");
    await CollegeMaster.updateMany({}, { 
      $unset: { 
        "officialData.contact": "", 
        "officialData.address": "" 
      } 
    });

    console.log("Fetching colleges with raw crawled page records...");
    const activeCollegeCodes = await RawCollegePage.distinct("collegeCode");
    console.log(`Found raw pages for ${activeCollegeCodes.length} college(s): ${activeCollegeCodes.join(", ")}`);

    const colleges = await CollegeMaster.find({
      collegeCode: { $in: activeCollegeCodes }
    });

    let collegesProcessed = 0;
    let phonesFoundCount = 0;
    let emailsFoundCount = 0;
    let addressesFoundCount = 0;
    let extractionFailures = 0;

    const socialLinksFound = {
      facebook: 0,
      instagram: 0,
      linkedin: 0,
      youtube: 0,
      twitter: 0
    };

    const details = [];

    for (const college of colleges) {
      const code = college.collegeCode;
      console.log(`\n------------------------------------------------`);
      console.log(`Extracting contact info for [${code}] ${college.collegeName}...`);
      console.log(`------------------------------------------------`);

      collegesProcessed++;

      // Fetch crawled pages
      const pages = await RawCollegePage.find({ collegeCode: code });
      console.log(`Found ${pages.length} raw pages.`);

      // Prioritize pages & determine confidence weights:
      // Contact page = 95
      // Footer / Home = 75
      // About page = 70
      // Other page = 50
      const getPagePriority = (pageType) => {
        const pt = (pageType || "").toLowerCase();
        if (pt === "contact" || pt === "contact-us") return 95;
        if (pt === "home" || pt === "footer") return 75;
        if (pt === "about" || pt === "about-us") return 70;
        return 50;
      };

      const getPageConfidence = (priority) => {
        return priority;
      };

      const sortedPages = [...pages].sort((a, b) => getPagePriority(b.pageType) - getPagePriority(a.pageType));

      const phoneMap = new Map(); // number -> category
      let allEmails = [];
      const socialLinksUrls = { facebook: "", instagram: "", linkedin: "", youtube: "", twitter: "" };
      let bestGoogleMapsUrl = "";
      let bestAddress = null;
      
      let bestContactSource = null;
      let contactEvidenceLines = [];

      for (const page of sortedPages) {
        const priority = getPagePriority(page.pageType);
        const confidence = getPageConfidence(priority);

        // 1. Extract links (social + maps) from HTML
        const { socialLinks, googleMapsUrl } = extractSocialAndMapsLinks(page.html);
        
        // Merge social links (keep first non-empty found)
        for (const [key, val] of Object.entries(socialLinks)) {
          if (val && !socialLinksUrls[key]) {
            socialLinksUrls[key] = val;
          }
        }
        if (googleMapsUrl && !bestGoogleMapsUrl) {
          bestGoogleMapsUrl = googleMapsUrl;
        }

        // 2. Extract phones & categorize
        const pagePhones = extractPhones(page.text);
        pagePhones.forEach(num => {
          const cat = categorizePhone(num, page.text);
          if (!phoneMap.has(num)) {
            phoneMap.set(num, cat);
          } else if (cat !== "general" && phoneMap.get(num) === "general") {
            phoneMap.set(num, cat);
          }
        });

        // 3. Extract emails
        const pageEmails = extractEmails(page.text, code);
        if (pageEmails.length > 0) {
          allEmails = [...new Set([...allEmails, ...pageEmails])];
        }

        // If we found any contact info (phone or email) on this page, track it as primary source
        if ((pagePhones.length > 0 || pageEmails.length > 0) && !bestContactSource) {
          bestContactSource = {
            confidence,
            sourceUrl: page.url,
            extractedAt: new Date()
          };

          // Collect evidence text lines
          const lines = page.text.split("\n").map(l => l.trim()).filter(Boolean);
          const matchedLines = lines.filter(line => {
            const hasPhone = pagePhones.some(phone => {
              const digits = phone.replace(/\D/g, "");
              const last7 = digits.slice(-7);
              return line.replace(/\D/g, "").includes(last7);
            });
            const hasEmail = pageEmails.some(email => line.toLowerCase().includes(email));
            return hasPhone || hasEmail;
          });
          contactEvidenceLines = matchedLines.slice(0, 5);
        }

        // 4. Extract address
        const pageAddress = extractAddress(page.text, page.url, page.pageType, college.district || "");
        if (pageAddress) {
          if (!bestAddress || pageAddress.confidence > bestAddress.confidence) {
            bestAddress = pageAddress;
          }
        }
      }

      // Finalize google maps link on address
      if (bestAddress && bestGoogleMapsUrl) {
        bestAddress.googleMapsUrl = bestGoogleMapsUrl;
      }

      // Convert phoneMap to schema array
      const allPhones = Array.from(phoneMap.entries()).map(([number, category]) => ({
        number,
        category
      }));

      // Verify Social Links
      const verifiedSocialLinks = {};
      for (const [platform, url] of Object.entries(socialLinksUrls)) {
        if (url) {
          console.log(`Verifying ${platform} link: ${url}`);
          const verifiedObj = await verifySocialLink(url, college.collegeName, college.shortName, college.aliases);
          verifiedSocialLinks[platform] = verifiedObj;
          if (verifiedObj.verified) {
            socialLinksFound[platform]++;
          }
        } else {
          verifiedSocialLinks[platform] = { url: "", verified: false, confidence: 0 };
        }
      }

      // Enforce: "If extracted district confidence < 90, use CollegeMaster.district"
      if (bestAddress && bestAddress.districtConfidence < 90) {
        bestAddress.district = college.district || bestAddress.district;
      }

      // Structure final contact data
      const contactData = {
        phones: allPhones,
        emails: allEmails,
        socialLinks: verifiedSocialLinks,
        confidence: bestContactSource ? bestContactSource.confidence : 0,
        sourceUrl: bestContactSource ? bestContactSource.sourceUrl : "",
        evidenceText: contactEvidenceLines.join("\n"),
        extractedAt: bestContactSource ? bestContactSource.extractedAt : null
      };

      const addressData = bestAddress ? {
        fullAddress: bestAddress.fullAddress,
        city: bestAddress.city || "",
        mandal: bestAddress.mandal || "",
        district: bestAddress.district || college.district || "",
        state: bestAddress.state || "Telangana",
        pincode: bestAddress.pincode || "",
        googleMapsUrl: bestAddress.googleMapsUrl || "",
        confidence: bestAddress.confidence,
        sourceUrl: bestAddress.sourceUrl,
        evidenceText: bestAddress.evidenceText,
        extractedAt: bestAddress.extractedAt
      } : {
        fullAddress: "",
        city: "",
        mandal: "",
        district: college.district || "",
        state: "Telangana",
        pincode: "",
        googleMapsUrl: "",
        confidence: 0,
        sourceUrl: "",
        evidenceText: "",
        extractedAt: null
      };

      // Check if extraction completely failed (no phones, emails, or address)
      if (allPhones.length === 0 && allEmails.length === 0 && !bestAddress) {
        extractionFailures++;
        console.log(`Contact extraction failed or empty for [${code}]`);
      } else {
        if (allPhones.length > 0) phonesFoundCount += allPhones.length;
        if (allEmails.length > 0) emailsFoundCount += allEmails.length;
        if (bestAddress) addressesFoundCount++;
      }

      // Save to CollegeMaster
      college.officialData = college.officialData || {};
      college.officialData.contact = contactData;
      college.officialData.address = addressData;
      await college.save();

      console.log(`Phones: ${allPhones.map(p => `${p.number} (${p.category})`).join(", ") || "None"}`);
      console.log(`Emails: ${allEmails.join(", ") || "None"}`);
      console.log(`Address: ${addressData.fullAddress || "None"} (City: ${addressData.city}, Mandal: ${addressData.mandal}, Dist: ${addressData.district}, Conf: ${addressData.confidence}%)`);
      console.log(`Socials: ${Object.entries(verifiedSocialLinks).filter(([_, v]) => v.url).map(([k, v]) => `${k} (Conf: ${v.confidence}%, Ver: ${v.verified})`).join(", ") || "None"}`);
      console.log(`Saved officialData.contact and address for [${code}]`);

      details.push({
        collegeCode: code,
        collegeName: college.collegeName,
        phonesCount: allPhones.length,
        emailsCount: allEmails.length,
        addressFound: !!bestAddress,
        socialLinksCount: Object.values(verifiedSocialLinks).filter(v => v.url).length,
        confidenceContact: contactData.confidence,
        confidenceAddress: addressData.confidence,
        address: addressData
      });
    }

    // Generate reporting
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        collegesProcessed,
        phonesFound: phonesFoundCount,
        emailsFound: emailsFoundCount,
        addressesFound: addressesFoundCount,
        socialLinksFound,
        extractionFailures
      },
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "contact-quality-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("CONTACT HARDENED EXTRACTION PIPELINE COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Colleges Processed: ${collegesProcessed}`);
    console.log(`Phones Found: ${phonesFoundCount}`);
    console.log(`Emails Found: ${emailsFoundCount}`);
    console.log(`Addresses Found: ${addressesFoundCount}`);
    console.log(`Extraction Failures: ${extractionFailures}`);
    console.log("Social Links Found (Verified):");
    console.log(JSON.stringify(socialLinksFound, null, 2));
    console.log(`Quality Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during contact extraction pipeline:", error);
    process.exit(1);
  }
};

run();
