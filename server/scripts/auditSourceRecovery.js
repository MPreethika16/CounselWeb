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
    websiteStatus: 'TIMEOUT',
    dnsResolved: false,
    sslValid: false,
    httpStatus: null,
    redirectCount: 0,
    responseTimeMs: 0,
    finalUrl: urlStr
  };

  if (!urlStr) {
    result.websiteStatus = 'DNS_FAILURE';
    return result;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlStr);
  } catch (e) {
    result.websiteStatus = 'DNS_FAILURE';
    return result;
  }

  try {
    const addresses = await resolveDns(parsedUrl.hostname);
    if (addresses && addresses.length > 0) {
      result.dnsResolved = true;
    }
  } catch (e) {
    result.websiteStatus = 'DNS_FAILURE';
    return result;
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    let isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const req = client.request(parsedUrl, requestOptions, (res) => {
      result.responseTimeMs = Date.now() - startTime;
      result.httpStatus = res.statusCode;
      result.sslValid = isHttps;

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        result.redirectCount += 1;
        result.finalUrl = res.headers.location;
        result.websiteStatus = 'REDIRECTED';
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        result.websiteStatus = 'REACHABLE';
      } else if (res.statusCode === 403 || res.statusCode === 401) {
        result.websiteStatus = 'HTTP_BLOCKED';
      } else {
        result.websiteStatus = 'HTTP_BLOCKED';
      }

      res.resume(); // consume data
      resolve(result);
    });

    req.on('error', (e) => {
      result.responseTimeMs = Date.now() - startTime;
      if (e.code === 'CERT_HAS_EXPIRED' || e.message.includes('certificate')) {
        result.sslValid = false;
        result.websiteStatus = 'SSL_FAILURE';
      } else {
        result.websiteStatus = 'TIMEOUT';
      }
      resolve(result);
    });

    req.on('timeout', () => {
      result.responseTimeMs = Date.now() - startTime;
      result.websiteStatus = 'TIMEOUT';
      req.destroy();
      resolve(result);
    });

    req.end();
  });
}

function determineExtractionStrategy(status) {
  if (status === 'REACHABLE' || status === 'REDIRECTED') {
    return 'SIMPLE_HTTP_FETCH';
  } else if (status === 'HTTP_BLOCKED') {
    return 'PLAYWRIGHT_RENDER';
  } else {
    return 'EXTERNAL_SOURCE_ONLY';
  }
}

async function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    // Find all colleges
    const colleges = await CollegeMaster.find({}).lean();

    console.log(`Found ${colleges.length} Telangana colleges.`);

    const urlValidationReport = [];
    const extractionStrategyReport = [];
    const dataSourceMap = [];
    const publicDataAvailabilityReport = [];
    const recoveryPriorityReport = [];

    // Process in batches
    const batchSize = 20;
    for (let i = 0; i < colleges.length; i += batchSize) {
      const batch = colleges.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(colleges.length / batchSize)}...`);

      const promises = batch.map(async (college) => {
        const url = college.officialWebsite?.url || '';
        const reachability = await checkReachability(url);

        urlValidationReport.push({
          collegeCode: college.collegeCode,
          url,
          ...reachability
        });

        const strategy = determineExtractionStrategy(reachability.websiteStatus);

        const hasExternalRankings = college.officialData?.accreditation?.nirfRank > 0;
        const hasExternalNAAC = !!college.officialData?.accreditation?.naacGrade;

        const isReachable = strategy === 'SIMPLE_HTTP_FETCH' || strategy === 'PLAYWRIGHT_RENDER';

        const matrix = {
          collegeCode: college.collegeCode,
          websiteStatus: reachability.websiteStatus,
          recommendedExtractionMethod: strategy,
          feesAvailable: isReachable,
          placementsAvailable: isReachable || hasExternalRankings,
          naacAvailable: isReachable || hasExternalNAAC,
          rankingAvailable: hasExternalRankings,
          estimatedRecoveryConfidence: strategy === 'SIMPLE_HTTP_FETCH' ? 95 : (strategy === 'PLAYWRIGHT_RENDER' ? 70 : 40)
        };

        extractionStrategyReport.push(matrix);

        dataSourceMap.push({
          collegeCode: college.collegeCode,
          sources: {
            fees: isReachable ? 'Official website' : 'JNTUH / State Govt',
            placements: hasExternalRankings ? 'NIRF' : (isReachable ? 'Official website' : 'None'),
            naac: hasExternalNAAC ? 'NAAC' : (isReachable ? 'Official website' : 'None'),
            rankings: hasExternalRankings ? 'NIRF' : 'None',
            academics: isReachable ? 'Official website' : 'AICTE'
          }
        });

        publicDataAvailabilityReport.push({
          collegeCode: college.collegeCode,
          publicDataExists: isReachable || hasExternalRankings || hasExternalNAAC
        });

        recoveryPriorityReport.push({
          collegeCode: college.collegeCode,
          strategy,
          confidence: matrix.estimatedRecoveryConfidence,
          recoverableAutomatically: strategy === 'SIMPLE_HTTP_FETCH',
          requiresManualIntervention: strategy === 'EXTERNAL_SOURCE_ONLY'
        });
      });

      await Promise.all(promises);
    }

    // Sort priority report
    recoveryPriorityReport.sort((a, b) => b.confidence - a.confidence);

    fs.writeFileSync(path.join(outputDir, 'telangana-url-validation-report.json'), JSON.stringify(urlValidationReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'telangana-extraction-strategy-report.json'), JSON.stringify(extractionStrategyReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'telangana-data-source-map.json'), JSON.stringify(dataSourceMap, null, 2));
    fs.writeFileSync(path.join(outputDir, 'telangana-public-data-availability-report.json'), JSON.stringify(publicDataAvailabilityReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'telangana-recovery-priority-report.json'), JSON.stringify(recoveryPriorityReport, null, 2));

    console.log('Phase 2.7 Multi-Strategy Audit successfully completed.');

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runAudit();
