import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Helper to check a single URL
const checkUrl = (targetUrl, timeoutMs = 8000) => {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (e) {
      return resolve({
        statusCode: null,
        headers: {},
        responseTime: 0,
        sslValid: false,
        error: "INVALID_URL"
      });
    }

    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;
    const startTime = Date.now();

    const reqOptions = {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "close"
      },
      timeout: timeoutMs,
      rejectUnauthorized: true
    };

    let resolved = false;

    const req = client.request(targetUrl, reqOptions, (res) => {
      if (resolved) return;
      resolved = true;
      const responseTime = Date.now() - startTime;
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        responseTime,
        sslValid: isHttps,
        error: null
      });
    });

    req.on("error", (err) => {
      if (resolved) return;
      resolved = true;
      const responseTime = Date.now() - startTime;

      const sslErrorCodes = [
        "CERT_HAS_EXPIRED",
        "DEPTH_ZERO_SELF_SIGNED_CERT",
        "ERR_TLS_CERT_ALTNAME_INVALID",
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
        "CERT_NOT_YET_VALID",
        "ERR_SSL_WRONG_VERSION_NUMBER",
        "ERR_SSL_PROTOCOL_ERROR"
      ];
      
      const isSslError = sslErrorCodes.includes(err.code) || 
                         (err.message && (err.message.includes("certificate") || err.message.includes("SSL") || err.message.includes("TLS")));

      if (isHttps && isSslError) {
        // Retry with rejectUnauthorized: false to get HTTP status code
        const retryOptions = {
          ...reqOptions,
          rejectUnauthorized: false
        };
        const retryReq = https.request(targetUrl, retryOptions, (retryRes) => {
          resolve({
            statusCode: retryRes.statusCode,
            headers: retryRes.headers,
            responseTime,
            sslValid: false,
            error: err.code || err.message
          });
        });
        retryReq.on("error", (retryErr) => {
          resolve({
            statusCode: null,
            headers: {},
            responseTime,
            sslValid: false,
            error: retryErr.code || retryErr.message
          });
        });
        retryReq.end();
      } else {
        resolve({
          statusCode: null,
          headers: {},
          responseTime,
          sslValid: false,
          error: err.code || err.message
        });
      }
    });

    req.on("timeout", () => {
      req.destroy();
      if (!resolved) {
        resolved = true;
        resolve({
          statusCode: null,
          headers: {},
          responseTime: Date.now() - startTime,
          sslValid: false,
          error: "TIMEOUT"
        });
      }
    });

    req.end();
  });
};

// Perform audit of a single college URL including redirect chain and robots.txt
const auditWebsite = async (startUrl, maxRedirects = 5, timeoutMs = 8000) => {
  let currentUrl = startUrl;
  let redirectCount = 0;
  let redirected = false;
  let finalUrl = startUrl;
  let finalResult = null;

  while (redirectCount <= maxRedirects) {
    const result = await checkUrl(currentUrl, timeoutMs);
    finalResult = result;

    if (result.statusCode >= 300 && result.statusCode < 400 && result.headers.location) {
      redirected = true;
      redirectCount++;
      const redirectTarget = result.headers.location;
      
      try {
        currentUrl = new URL(redirectTarget, currentUrl).toString();
      } catch (e) {
        break; // Stop on malformed redirect URLs
      }
      finalUrl = currentUrl;
    } else {
      break;
    }
  }

  // Check robots.txt accessibility on the final resolved host
  let robotsAccessible = false;
  if (finalResult && finalResult.statusCode !== null) {
    try {
      const finalUrlObj = new URL(finalUrl);
      const robotsUrl = `${finalUrlObj.protocol}//${finalUrlObj.hostname}/robots.txt`;
      // Check robots.txt (ignore SSL errors for this check to see if the file exists)
      const robotsResult = await checkUrl(robotsUrl, 4000);
      // Accessible if we got a response and it's not a 5xx server error or timeout
      robotsAccessible = robotsResult.statusCode !== null && robotsResult.statusCode < 500;
    } catch (e) {
      robotsAccessible = false;
    }
  }

  // Healthy rules: statusCode 200-399 and sslValid === true
  const healthy = finalResult &&
                  finalResult.statusCode >= 200 &&
                  finalResult.statusCode < 400 &&
                  finalResult.sslValid === true;

  return {
    statusCode: finalResult ? finalResult.statusCode : null,
    responseTime: finalResult ? finalResult.responseTime : 0,
    sslValid: finalResult ? finalResult.sslValid : false,
    redirected,
    redirectCount,
    finalUrl,
    robotsAccessible,
    healthy,
    lastCheckedAt: new Date(),
    error: finalResult ? finalResult.error : null
  };
};

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Fetching colleges with verified or review websites...");
    const colleges = await CollegeMaster.find({
      "officialWebsite.url": { $ne: "" }
    });

    console.log(`Found ${colleges.length} colleges to verify.`);

    const details = [];
    let totalChecked = 0;
    let healthyCount = 0;
    let unhealthyCount = 0;
    let redirectCountTotal = 0;
    let sslIssuesCount = 0;
    let totalResponseTime = 0;
    let successfulResponseTimeCount = 0;

    // Use a concurrency limit of 10
    const concurrencyLimit = 10;
    const queue = [...colleges];
    
    const worker = async () => {
      while (queue.length > 0) {
        const college = queue.shift();
        const startUrl = college.officialWebsite.url;
        console.log(`Checking [${college.collegeCode}] ${startUrl}...`);
        
        try {
          const healthResult = await auditWebsite(startUrl);
          
          // Update MongoDB fields
          college.officialWebsite.canonicalUrl = healthResult.finalUrl;
          college.officialWebsite.health = {
            statusCode: healthResult.statusCode,
            responseTime: healthResult.responseTime,
            sslValid: healthResult.sslValid,
            redirected: healthResult.redirected,
            redirectCount: healthResult.redirectCount,
            finalUrl: healthResult.finalUrl,
            robotsAccessible: healthResult.robotsAccessible,
            healthy: healthResult.healthy,
            lastCheckedAt: healthResult.lastCheckedAt
          };
          
          await college.save();
          
          // Aggregate statistics
          totalChecked++;
          if (healthResult.healthy) {
            healthyCount++;
          } else {
            unhealthyCount++;
          }
          if (healthResult.redirected) {
            redirectCountTotal++;
          }
          if (!healthResult.sslValid) {
            sslIssuesCount++;
          }
          if (healthResult.responseTime > 0) {
            totalResponseTime += healthResult.responseTime;
            successfulResponseTimeCount++;
          }

          details.push({
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            url: startUrl,
            canonicalUrl: healthResult.finalUrl,
            health: {
              statusCode: healthResult.statusCode,
              responseTime: healthResult.responseTime,
              sslValid: healthResult.sslValid,
              redirected: healthResult.redirected,
              redirectCount: healthResult.redirectCount,
              finalUrl: healthResult.finalUrl,
              robotsAccessible: healthResult.robotsAccessible,
              healthy: healthResult.healthy,
              lastCheckedAt: healthResult.lastCheckedAt,
              error: healthResult.error
            }
          });

          console.log(`Checked [${college.collegeCode}] - Healthy: ${healthResult.healthy}, Status: ${healthResult.statusCode}, Time: ${healthResult.responseTime}ms`);
        } catch (err) {
          console.error(`Failed checking [${college.collegeCode}] ${startUrl}:`, err);
        }
      }
    };

    // Spawn workers
    const workers = Array.from({ length: concurrencyLimit }, () => worker());
    await Promise.all(workers);

    const averageResponseTime = successfulResponseTimeCount > 0 
      ? Math.round(totalResponseTime / successfulResponseTimeCount) 
      : 0;

    const summary = {
      totalChecked,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      redirects: redirectCountTotal,
      sslIssues: sslIssuesCount,
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
    
    const reportPath = path.join(reportsDir, "website-health-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log("\n------------------------------------------------");
    console.log("HEALTH CHECK AUDIT COMPLETE");
    console.log("------------------------------------------------");
    console.log(`Total Checked: ${totalChecked}`);
    console.log(`Healthy: ${healthyCount}`);
    console.log(`Unhealthy: ${unhealthyCount}`);
    console.log(`Redirected: ${redirectCountTotal}`);
    console.log(`SSL Issues: ${sslIssuesCount}`);
    console.log(`Average Response Time: ${averageResponseTime}ms`);
    console.log(`Report generated at: ${reportPath}`);
    console.log("------------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during health check audit:", error);
    process.exit(1);
  }
};

run();
