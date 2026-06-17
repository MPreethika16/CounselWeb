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

const cleanUrl = (urlStr) => {
  if (!urlStr) return { url: "", canonicalDomain: "" };
  try {
    let normalized = urlStr.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "http://" + normalized;
    }
    const parsed = new URL(normalized);
    // Remove query params and hash fragments
    let cleaned = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    // Strip trailing slash if it is just a trailing slash at the end of the domain
    if (cleaned.endsWith("/")) {
      cleaned = cleaned.slice(0, -1);
    }
    const canonicalDomain = parsed.hostname.toLowerCase().replace(/^www\./i, "");
    return { url: cleaned, canonicalDomain };
  } catch (e) {
    console.error(`Error parsing URL: ${urlStr}`, e);
    return { url: urlStr, canonicalDomain: "" };
  }
};

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching all CollegeMaster records...");
    const colleges = await CollegeMaster.find({});
    
    let totalScanned = colleges.length;
    let totalUpdated = 0;
    const details = [];

    for (const college of colleges) {
      const originalUrl = college.officialWebsite?.url || "";
      if (originalUrl) {
        const { url: cleanedUrl, canonicalDomain } = cleanUrl(originalUrl);
        
        const isModified = (originalUrl !== cleanedUrl) || (college.officialWebsite.canonicalDomain !== canonicalDomain);
        
        if (isModified) {
          const prevUrl = originalUrl;
          college.officialWebsite.url = cleanedUrl;
          college.officialWebsite.canonicalDomain = canonicalDomain;
          
          await college.save();
          totalUpdated++;
          
          details.push({
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            originalUrl: prevUrl,
            cleanedUrl,
            canonicalDomain
          });
        } else if (!college.officialWebsite.canonicalDomain) {
          // If already cleaned but missing canonicalDomain
          college.officialWebsite.canonicalDomain = canonicalDomain;
          await college.save();
          details.push({
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            originalUrl,
            cleanedUrl,
            canonicalDomain
          });
        }
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalScanned,
      totalUpdated,
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, "url-fix-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`Successfully updated ${totalUpdated} college URLs.`);
    console.log(`Report generated at: ${reportPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error running fixOfficialWebsiteUrls script:", error);
    process.exit(1);
  }
};

run();
