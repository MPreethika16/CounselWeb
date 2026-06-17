import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import RawCollegePage from "../models/RawCollegePage.js";
import { CollegeCrawler } from "../services/collegeCrawler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PAGE_TYPES = {
  "/": "home",
  "/about": "about",
  "/about-us": "about-us",
  "/contact": "contact",
  "/contact-us": "contact-us",
  "/placements": "placements",
  "/training-placement": "training-placement",
  "/career-development-center": "career-development-center",
  "/placement-cell": "placement-cell",
  "/placement-statistics": "placement-statistics",
  "/placements-and-training": "placements-and-training",
  "/recruiters": "recruiters",
  "/annual-report": "annual-report",
  "/facilities": "facilities",
  "/infrastructure": "infrastructure",
  "/hostel": "hostel",
  "/gallery": "gallery",
  "/campus": "campus",
  "/accreditation": "accreditation"
};

const getLimitArg = () => {
  const limitIndex = process.argv.indexOf("--limit");
  if (limitIndex !== -1 && limitIndex + 1 < process.argv.length) {
    const limit = parseInt(process.argv[limitIndex + 1], 10);
    return isNaN(limit) ? null : limit;
  }
  return null;
};

const computeHash = (content) => {
  return crypto.createHash("sha256").update(content || "").digest("hex");
};

const run = async () => {
  const crawler = new CollegeCrawler();
  try {
    console.log("Connecting to database...");
    await connectDB();

    const limit = getLimitArg();
    const isTest = process.argv.includes("--test");

    let query = {
      "officialWebsite.url": { $ne: "" },
      "officialWebsite.canonicalUrl": { $ne: "" }
    };

    const codesIndex = process.argv.indexOf("--codes");
    if (codesIndex !== -1 && codesIndex + 1 < process.argv.length) {
      const codesVal = process.argv[codesIndex + 1];
      const targetCodes = codesVal.split(",").map(c => c.trim()).filter(Boolean);
      console.log(`Targeting specific college codes: ${targetCodes.join(", ")}`);
      query.collegeCode = { $in: targetCodes };
    } else if (isTest) {
      console.log("Running in TEST mode: targeting CBIT, KPRC, and KPRT...");
      query.collegeCode = { $in: ["CBIT", "KPRC", "KPRT"] };
    }

    console.log(`Fetching colleges with verified websites... (Limit: ${limit || "None"}, Test Mode: ${isTest})`);
    let colleges = await CollegeMaster.find(query);

    if (limit && !isTest) {
      colleges = colleges.slice(0, limit);
    }

    console.log(`Processing ${colleges.length} colleges.`);

    // Group colleges by canonicalDomain to support the Domain Cache
    const domainGroups = new Map();
    for (const col of colleges) {
      const domain = col.officialWebsite.canonicalDomain || new URL(col.officialWebsite.canonicalUrl).hostname.replace(/^www\./i, "");
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain).push(col);
    }

    console.log(`Grouped into ${domainGroups.size} unique domain(s) for crawling.`);

    // Crawler state variables
    const crawlerCache = new Map(); // canonicalDomain -> array of crawled page objects
    
    let collegesProcessed = 0;
    let domainsCrawled = 0;
    let pagesFetched = 0;
    let pagesFailed = 0;
    const allImages = new Set();
    let totalResponseTime = 0;
    let totalRequests = 0;

    const details = [];

    // Loop over each unique domain group
    for (const [domain, groupColleges] of domainGroups.entries()) {
      console.log(`\n================================================`);
      console.log(`Crawling domain: ${domain} (Shared by ${groupColleges.length} college(s))`);
      console.log(`================================================`);
      
      // Use the canonical URL of the first college as the base URL
      const baseCol = groupColleges[0];
      const baseUrlStr = baseCol.officialWebsite.canonicalUrl || baseCol.officialWebsite.url;
      let crawledPages = [];

      domainsCrawled++;

      // Check cache first
      if (crawlerCache.has(domain)) {
        console.log(`[Cache Hit] Domain ${domain} already crawled. Reusing content for sister colleges.`);
        crawledPages = crawlerCache.get(domain);
      } else {
        // Fetch pages over the network
        for (const [pathStr, pageType] of Object.entries(PAGE_TYPES)) {
          let targetUrl;
          try {
            targetUrl = new URL(pathStr, baseUrlStr).toString();
          } catch (e) {
            console.error(`Invalid URL construction: ${pathStr} on base ${baseUrlStr}`);
            continue;
          }

          console.log(`Crawling ${pageType} page: ${targetUrl}`);
          const crawlResult = await crawler.crawlPage(targetUrl);
          totalRequests++;
          if (crawlResult.responseTime) {
            totalResponseTime += crawlResult.responseTime;
          }

          const pageData = {
            pageType,
            url: targetUrl,
            finalUrl: crawlResult.finalUrl,
            title: crawlResult.title || "",
            metaDescription: crawlResult.metaDescription || "",
            html: crawlResult.html || "",
            text: crawlResult.text || "",
            images: crawlResult.images || [],
            statusCode: crawlResult.statusCode,
            crawlStatus: crawlResult.crawlStatus,
            error: crawlResult.error
          };

          crawledPages.push(pageData);

          if (crawlResult.crawlStatus === "success") {
            pagesFetched++;
            // Collect images
            if (crawlResult.images) {
              crawlResult.images.forEach(img => allImages.add(img));
            }
          } else {
            pagesFailed++;
          }
        }
        
        // Cache the crawled pages
        crawlerCache.set(domain, crawledPages);
      }

      // Store results in MongoDB for each college in the domain group
      for (const col of groupColleges) {
        collegesProcessed++;
        let collegeSuccessPages = 0;
        let collegeFailedPages = 0;

        console.log(`Storing page documents for [${col.collegeCode}] ${col.collegeName}...`);

        for (const page of crawledPages) {
          const contentHash = computeHash(page.html);
          
          // Check if page already exists
          const existing = await RawCollegePage.findOne({
            collegeCode: col.collegeCode,
            url: page.url
          });

          if (existing) {
            if (existing.contentHash === contentHash) {
              console.log(`[Skipped] Identical content for ${page.url} (hash matches)`);
            } else {
              // Update content since hash differs
              existing.finalUrl = page.finalUrl;
              existing.title = page.title;
              existing.metaDescription = page.metaDescription;
              existing.html = page.html;
              existing.text = page.text;
              existing.images = page.images;
              existing.statusCode = page.statusCode;
              existing.crawlStatus = page.crawlStatus;
              existing.crawledAt = new Date();
              existing.contentHash = contentHash;
              await existing.save();
              console.log(`[Updated] Content changed for ${page.url}`);
            }
          } else {
            // Create new raw page document
            const newPageDoc = new RawCollegePage({
              collegeCode: col.collegeCode,
              canonicalDomain: domain,
              pageType: page.pageType,
              url: page.url,
              finalUrl: page.finalUrl,
              title: page.title,
              metaDescription: page.metaDescription,
              html: page.html,
              text: page.text,
              images: page.images,
              statusCode: page.statusCode,
              crawlStatus: page.crawlStatus,
              crawledAt: new Date(),
              contentHash
            });
            await newPageDoc.save();
            console.log(`[Saved] New page record for ${page.url}`);
          }

          if (page.crawlStatus === "success") {
            collegeSuccessPages++;
          } else {
            collegeFailedPages++;
          }
        }

        details.push({
          collegeCode: col.collegeCode,
          collegeName: col.collegeName,
          domain,
          successPages: collegeSuccessPages,
          failedPages: collegeFailedPages
        });
      }
    }

    const averageResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;

    const summary = {
      collegesProcessed,
      domainsCrawled,
      pagesFetched,
      pagesFailed,
      uniqueImages: allImages.size,
      averageResponseTime
    };

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      details
    };

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "crawl-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log("\n------------------------------------------------");
    console.log("CRAWL CYCLE COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Colleges Processed: ${collegesProcessed}`);
    console.log(`Domains Crawled: ${domainsCrawled}`);
    console.log(`Pages Successfully Fetched: ${pagesFetched}`);
    console.log(`Pages Failed: ${pagesFailed}`);
    console.log(`Unique Images Extracted: ${allImages.size}`);
    console.log(`Average Response Time: ${averageResponseTime}ms`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

  } catch (err) {
    console.error("Critical error in crawler script:", err);
  } finally {
    await crawler.close();
    process.exit(0);
  }
};

run();
