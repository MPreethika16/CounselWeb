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

async function checkReachability(urlStr) {
  const result = {
    reachable: false,
    finalUrl: urlStr
  };

  if (!urlStr) return result;

  let parsedUrl;
  try {
    parsedUrl = new URL(urlStr);
  } catch (e) {
    return result;
  }

  try {
    const addresses = await resolveDns(parsedUrl.hostname);
    if (!addresses || addresses.length === 0) return result;
  } catch (e) {
    return result;
  }

  return new Promise((resolve) => {
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      method: 'GET',
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = client.request(parsedUrl, requestOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        result.finalUrl = res.headers.location;
        result.reachable = true; // Redirect is considered reachable for domain verification
      } else if (res.statusCode >= 200 && res.statusCode < 400) {
        result.reachable = true;
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        result.reachable = true; // Reachable but blocked
      }
      res.resume();
      resolve(result);
    });

    req.on('error', () => resolve(result));
    req.on('timeout', () => { req.destroy(); resolve(result); });
    req.end();
  });
}

async function performSearch(collegeName) {
  const query = encodeURIComponent(`"${collegeName}" official website Telangana`);
  const url = `https://html.duckduckgo.com/html/?q=${query}`;

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Simple regex to find URLs in duckduckgo results
        const regex = /<a class="result__url" href="([^"]+)">([^<]+)<\/a>/g;
        let match;
        const candidates = [];
        while ((match = regex.exec(data)) !== null) {
          const u = match[2].trim().toLowerCase();
          if (u.includes('.ac.in') || u.includes('.edu.in') || u.includes('.org') || u.includes('.com') || u.includes('.in')) {
            candidates.push(`https://${u}`);
          }
        }
        resolve(candidates.length > 0 ? candidates[0] : null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    const colleges = await CollegeMaster.find({}).lean();
    console.log(`Found ${colleges.length} colleges.`);

    const priorityReportPath = path.join(outputDir, 'telangana-recovery-priority-report.json');
    if (!fs.existsSync(priorityReportPath)) {
      throw new Error('Run Phase 2.7 first to generate telangana-recovery-priority-report.json');
    }

    const priorityReport = JSON.parse(fs.readFileSync(priorityReportPath, 'utf8'));
    const priorityMap = new Map(priorityReport.map(c => [c.collegeCode, c]));

    const verificationReport = [];
    const correctedDomains = [];
    const deadDomainConfirmed = [];

    let totalVerified = 0;
    let incorrectDiscovered = 0;
    let correctedDiscovered = 0;
    let trulyDead = 0;

    for (let i = 0; i < colleges.length; i++) {
      const college = colleges[i];
      const priorityData = priorityMap.get(college.collegeCode);
      const oldUrl = college.officialWebsite?.url || '';
      
      console.log(`[${i+1}/${colleges.length}] Verifying ${college.collegeCode}...`);
      totalVerified++;

      if (priorityData && priorityData.strategy !== 'EXTERNAL_SOURCE_ONLY') {
        // Already known to be reachable/blocked, so domain is correct
        verificationReport.push({
          collegeCode: college.collegeCode,
          collegeName: college.collegeName,
          oldUrl,
          status: 'VERIFIED_CORRECT'
        });
        continue;
      }

      // It's a dead domain. Let's try to search for the correct one
      const searchResult = await performSearch(college.collegeName);
      await delay(1500); // polite delay for search engine

      if (searchResult) {
        let cleanNewurl = searchResult;
        
        // Sometimes DDG returns formatting like <b>...</b>
        cleanNewurl = cleanNewurl.replace(/<[^>]*>?/gm, '');

        if (!cleanNewurl.startsWith('http')) {
           cleanNewurl = `https://${cleanNewurl}`;
        }

        const reachability = await checkReachability(cleanNewurl);

        if (reachability.reachable) {
          incorrectDiscovered++;
          correctedDiscovered++;

          verificationReport.push({
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            oldUrl,
            newUrl: cleanNewurl,
            status: 'WRONG_DOMAIN'
          });

          correctedDomains.push({
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            oldUrl,
            newUrl: cleanNewurl,
            confidence: 85,
            source: 'Search'
          });
        } else {
          trulyDead++;
          verificationReport.push({
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            oldUrl,
            status: 'DEAD_DOMAIN_CONFIRMED'
          });

          deadDomainConfirmed.push({
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            oldUrl
          });
        }
      } else {
        trulyDead++;
        verificationReport.push({
          collegeCode: college.collegeCode,
          collegeName: college.collegeName,
          oldUrl,
          status: 'DEAD_DOMAIN_CONFIRMED'
        });

        deadDomainConfirmed.push({
          collegeCode: college.collegeCode,
          collegeName: college.collegeName,
          oldUrl
        });
      }
    }

    fs.writeFileSync(path.join(outputDir, 'website-verification-report.json'), JSON.stringify(verificationReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'corrected-domains.json'), JSON.stringify(correctedDomains, null, 2));
    fs.writeFileSync(path.join(outputDir, 'dead-domain-confirmed.json'), JSON.stringify(deadDomainConfirmed, null, 2));

    console.log('\n--- Phase 2.8 Metrics ---');
    console.log(`Total URLs verified: ${totalVerified}`);
    console.log(`Incorrect URLs discovered: ${incorrectDiscovered}`);
    console.log(`Corrected URLs discovered: ${correctedDiscovered}`);
    console.log(`Truly dead domains: ${trulyDead}`);
    console.log(`Estimated recovery increase after correction: ${correctedDiscovered}`);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runAudit();
