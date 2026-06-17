import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import dns from 'dns';
import { promisify } from 'util';
import CollegeMaster from '../models/CollegeMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const resolveDns = promisify(dns.resolve4);

const TARGET_COLLEGES = [
  "CVR College of Engineering",
  "Vasavi College of Engineering",
  "Vardhaman College of Engineering",
  "Malla Reddy Engineering College",
  "Nalla Malla Reddy Engineering College"
];

async function checkReachability(urlStr) {
  const result = {
    dnsResolved: false,
    sslValid: false,
    httpStatus: null,
    redirectCount: 0,
    responseTimeMs: 0,
    error: null
  };

  if (!urlStr) {
    result.error = "No URL provided";
    return result;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlStr);
  } catch (e) {
    result.error = `Invalid URL: ${urlStr}`;
    return result;
  }

  // 1. Check DNS
  try {
    const addresses = await resolveDns(parsedUrl.hostname);
    if (addresses && addresses.length > 0) {
      result.dnsResolved = true;
    }
  } catch (e) {
    result.error = `DNS Resolution failed: ${e.message}`;
    return result;
  }

  // 2. Check HTTP/HTTPS reachability
  return new Promise((resolve) => {
    const startTime = Date.now();
    let isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      method: 'GET',
      timeout: 10000, // 10 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = client.request(parsedUrl, requestOptions, (res) => {
      result.responseTimeMs = Date.now() - startTime;
      result.httpStatus = res.statusCode;
      result.sslValid = isHttps; // If it's HTTPS and we get here without error, SSL is somewhat valid

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        result.redirectCount += 1;
        result.error = `Redirects to: ${res.headers.location}`;
      }

      res.resume(); // Consume data to free memory
      resolve(result);
    });

    req.on('error', (e) => {
      result.responseTimeMs = Date.now() - startTime;
      if (e.code === 'CERT_HAS_EXPIRED' || e.message.includes('certificate')) {
        result.sslValid = false;
        result.error = `SSL Error: ${e.message}`;
      } else {
        result.error = `Connection Error: ${e.message}`;
      }
      resolve(result);
    });

    req.on('timeout', () => {
      result.responseTimeMs = Date.now() - startTime;
      result.error = `Connection Timeout (10000ms)`;
      req.destroy();
      resolve(result);
    });

    req.end();
  });
}

async function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    const colleges = await CollegeMaster.find({}).lean();
    
    // Filter locally to avoid exact string match issues
    const targetColleges = colleges.filter(c => 
      TARGET_COLLEGES.some(t => c.collegeName.toLowerCase().includes(t.toLowerCase().replace("college of engineering", "").trim()))
    ).slice(0, 5);

    const auditResults = [];

    for (const college of targetColleges) {
      console.log(`Checking reachability for ${college.collegeName}...`);
      const url = college.officialWebsite?.url || '';
      
      const reachability = await checkReachability(url);
      
      auditResults.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        url,
        ...reachability
      });
    }

    const reportPath = path.join(outputDir, 'website-reachability-audit.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));

    console.log(`Phase 2.6 Website Reachability Audit successfully completed. Saved to ${reportPath}`);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runAudit();
