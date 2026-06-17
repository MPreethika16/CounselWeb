import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import CollegeMaster from '../models/CollegeMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  const strategyPath = path.join(outputDir, 'telangana-extraction-strategy-report.json');
  
  if (!fs.existsSync(strategyPath)) {
    console.error("telangana-extraction-strategy-report.json not found.");
    return;
  }
  
  const strategyData = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));
  const activeColleges = strategyData.filter(c => c.websiteStatus === 'REACHABLE' || c.websiteStatus === 'REDIRECTED');
  const activeCodes = activeColleges.map(c => c.collegeCode);

  console.log(`Found ${activeCodes.length} active college codes. Connecting to DB...`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const activeWebsitesContentReport = [];
  const readinessCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const sectionCounts = { placements: 0, fees: 0, academics: 0, contact: 0, naac: 0, ranking: 0 };

  let processed = 0;

  for (const code of activeCodes) {
    const college = await CollegeMaster.findOne({ collegeCode: code });
    if (!college || !college.officialWebsite || !college.officialWebsite.url) {
      console.log(`[${code}] No URL found in DB.`);
      continue;
    }

    const url = college.officialWebsite.url;
    console.log(`[${processed + 1}/${activeCodes.length}] Auditing ${code}: ${url}`);

    let domainReachable = false;
    let placementsPageDetected = false;
    let feesPageDetected = false;
    let academicsPageDetected = false;
    let contactPageDetected = false;
    let naacPageDetected = false;
    let rankingPageDetected = false;
    const detectedUrls = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        domainReachable = true;
        const html = await response.text();
        const $ = cheerio.load(html);

        $('a').each((i, el) => {
          const href = ($(el).attr('href') || '').toLowerCase();
          const text = ($(el).text() || '').toLowerCase();
          const combined = href + ' ' + text;

          let matched = false;

          if (combined.includes('placement') || combined.includes('career') || combined.includes('recruit') || combined.includes('training')) {
            placementsPageDetected = true;
            matched = true;
          }
          if (combined.includes('fee') || combined.includes('tuition') || combined.includes('admission')) {
            feesPageDetected = true;
            matched = true;
          }
          if (combined.includes('academic') || combined.includes('department') || combined.includes('course') || combined.includes('program')) {
            academicsPageDetected = true;
            matched = true;
          }
          if (combined.includes('contact') || combined.includes('reach us')) {
            contactPageDetected = true;
            matched = true;
          }
          if (combined.includes('accreditation') || combined.includes('naac') || combined.includes('iqac')) {
            naacPageDetected = true;
            matched = true;
          }
          if (combined.includes('ranking') || combined.includes('nirf') || combined.includes('award')) {
            rankingPageDetected = true;
            matched = true;
          }

          if (matched && href && !href.startsWith('javascript') && !href.startsWith('#')) {
            if (!detectedUrls.includes(href) && detectedUrls.length < 15) {
              detectedUrls.push(href);
            }
          }
        });
      }
    } catch (err) {
      console.log(`[${code}] Network error: ${err.message}`);
    }

    // Determine readiness based on critical sections
    let criticalCount = 0;
    if (placementsPageDetected) criticalCount++;
    if (feesPageDetected) criticalCount++;
    if (academicsPageDetected) criticalCount++;
    if (contactPageDetected) criticalCount++;

    let recoveryReadiness = "LOW";
    if (criticalCount === 4) {
      recoveryReadiness = "HIGH";
      readinessCounts.HIGH++;
    } else if (criticalCount >= 2) {
      recoveryReadiness = "MEDIUM";
      readinessCounts.MEDIUM++;
    } else {
      readinessCounts.LOW++;
    }

    if (placementsPageDetected) sectionCounts.placements++;
    if (feesPageDetected) sectionCounts.fees++;
    if (academicsPageDetected) sectionCounts.academics++;
    if (contactPageDetected) sectionCounts.contact++;
    if (naacPageDetected) sectionCounts.naac++;
    if (rankingPageDetected) sectionCounts.ranking++;

    const missingSections = [];
    if (!placementsPageDetected) missingSections.push("placements");
    if (!feesPageDetected) missingSections.push("fees");
    if (!academicsPageDetected) missingSections.push("academics");
    if (!contactPageDetected) missingSections.push("contact");

    activeWebsitesContentReport.push({
      collegeCode: code,
      collegeName: college.collegeName,
      domainReachable,
      placementsPageDetected,
      feesPageDetected,
      academicsPageDetected,
      contactPageDetected,
      naacPageDetected,
      rankingPageDetected,
      detectedUrls,
      websiteRecoveryReadiness: recoveryReadiness,
      missingSections
    });

    processed++;
  }

  // 1. active-website-content-report.json
  const activeContentExport = activeWebsitesContentReport.map(c => ({
    collegeCode: c.collegeCode,
    collegeName: c.collegeName,
    domainReachable: c.domainReachable,
    placementsPageDetected: c.placementsPageDetected,
    feesPageDetected: c.feesPageDetected,
    academicsPageDetected: c.academicsPageDetected,
    contactPageDetected: c.contactPageDetected,
    naacPageDetected: c.naacPageDetected,
    rankingPageDetected: c.rankingPageDetected,
    detectedUrls: c.detectedUrls
  }));
  fs.writeFileSync(path.join(outputDir, 'active-website-content-report.json'), JSON.stringify(activeContentExport, null, 2));

  // 2. website-recovery-readiness.json
  const recoveryReadinessExport = activeWebsitesContentReport.map(c => ({
    collegeCode: c.collegeCode,
    recoveryReadiness: c.websiteRecoveryReadiness,
    missingSections: c.missingSections
  }));
  fs.writeFileSync(path.join(outputDir, 'website-recovery-readiness.json'), JSON.stringify(recoveryReadinessExport, null, 2));

  // 3. website-section-coverage-summary.json
  const total = activeCodes.length;
  const p = (count) => Number(((count / total) * 100).toFixed(2));
  
  const sectionCoverageSummary = {
    percentWithPlacementPages: p(sectionCounts.placements),
    percentWithFeePages: p(sectionCounts.fees),
    percentWithAcademicsPages: p(sectionCounts.academics),
    percentWithNaacPages: p(sectionCounts.naac),
    percentWithRankingPages: p(sectionCounts.ranking),
    percentClassifiedHigh: p(readinessCounts.HIGH),
    percentClassifiedMedium: p(readinessCounts.MEDIUM),
    percentClassifiedLow: p(readinessCounts.LOW)
  };
  fs.writeFileSync(path.join(outputDir, 'website-section-coverage-summary.json'), JSON.stringify(sectionCoverageSummary, null, 2));

  // 4. phase-3.0C-summary-report.json
  const reachableCount = activeWebsitesContentReport.filter(c => c.domainReachable).length;
  const recoverableCount = readinessCounts.HIGH + readinessCounts.MEDIUM;
  const nonRecoverableCount = readinessCounts.LOW;
  
  const summaryReport = {
    reachableWebsites: reachableCount,
    recoverableWebsites: recoverableCount,
    nonRecoverableWebsites: nonRecoverableCount,
    recommendationReadyCandidateCount: readinessCounts.HIGH,
    revisedReadinessFloor: readinessCounts.HIGH,
    revisedReadinessCeiling: recoverableCount,
    topContentGaps: ["Fees", "Placements"],
    risksForPhase31: [
      "Colleges classified as LOW will require heavy AICTE fallback",
      "Dynamic SPA sites masking internal URLs from simple GET request",
      "Rate limiting and bot protection during actual Playwright crawling"
    ]
  };
  fs.writeFileSync(path.join(outputDir, 'phase-3.0C-summary-report.json'), JSON.stringify(summaryReport, null, 2));

  await mongoose.disconnect();
  console.log("Phase 3.0C Exact Output Audit completed successfully.");
}

runAudit();
