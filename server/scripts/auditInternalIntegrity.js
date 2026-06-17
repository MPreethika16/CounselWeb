import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CollegeMaster from '../models/CollegeMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');

    const colleges = await CollegeMaster.find({}).lean();
    console.log(`Found ${colleges.length} colleges.`);

    const inventory = {
      totalColleges: colleges.length,
      activeColleges: 0,
      inactiveColleges: 0,
      recommendationEligible: 0,
      recommendationBlocked: 0
    };

    const duplicateCollegeCodes = [];
    const duplicateCollegeNames = [];
    const missingCoreFields = [];
    const coverageMetrics = {
      officialWebsite: { available: 0, missing: 0, coveragePercentage: 0 },
      academics: { available: 0, missing: 0, coveragePercentage: 0 },
      fees: { available: 0, missing: 0, coveragePercentage: 0 },
      placements: { available: 0, missing: 0, coveragePercentage: 0 },
      naac: { available: 0, missing: 0, coveragePercentage: 0 },
      rankings: { available: 0, missing: 0, coveragePercentage: 0 },
      admissions: { available: 0, missing: 0, coveragePercentage: 0 },
      locationData: { available: 0, missing: 0, coveragePercentage: 0 }
    };
    const blockersReport = [];
    const readinessReport = [];
    const confidenceReport = [];
    const highRiskColleges = [];

    const codeCounts = {};
    const nameCounts = {};

    for (const college of colleges) {
      // Identity Check
      codeCounts[college.collegeCode] = (codeCounts[college.collegeCode] || 0) + 1;
      const lowerName = (college.collegeName || '').toLowerCase().trim();
      nameCounts[lowerName] = (nameCounts[lowerName] || 0) + 1;

      const missingCore = [];
      if (!college.collegeCode) missingCore.push('collegeCode');
      if (!college.collegeName) missingCore.push('collegeName');
      if (!college.district && !college.officialData?.address?.district) missingCore.push('district');
      if (!college.affiliation && !college.officialData?.accreditation?.affiliation) missingCore.push('affiliation');

      if (missingCore.length > 0) {
        missingCoreFields.push({ collegeCode: college.collegeCode, missingFields: missingCore });
      }

      // Coverage Check
      const hasWebsite = !!college.officialWebsite?.url;
      const hasAcademics = !!(college.officialData?.academics?.departments?.length > 0 || college.officialData?.academics?.programs?.length > 0);
      const hasFees = !!(college.officialData?.fees?.tuitionFee || college.officialData?.fees?.annualFee);
      const hasPlacements = !!(college.officialData?.placements?.highestPackage || college.officialData?.placements?.placementPercentage || college.officialData?.placements?.totalOffers);
      const hasNaac = !!college.officialData?.accreditation?.naacGrade;
      const hasRankings = !!(college.officialData?.rankings?.length > 0 || college.officialData?.accreditation?.nirfRank);
      const hasAdmissions = !!(college.officialData?.admissions?.entranceExams?.length > 0 || college.officialData?.admissions?.eligibilityCriteria?.length > 0);
      const hasLocation = !!(college.officialData?.address?.city || college.city || college.district);

      hasWebsite ? coverageMetrics.officialWebsite.available++ : coverageMetrics.officialWebsite.missing++;
      hasAcademics ? coverageMetrics.academics.available++ : coverageMetrics.academics.missing++;
      hasFees ? coverageMetrics.fees.available++ : coverageMetrics.fees.missing++;
      hasPlacements ? coverageMetrics.placements.available++ : coverageMetrics.placements.missing++;
      hasNaac ? coverageMetrics.naac.available++ : coverageMetrics.naac.missing++;
      hasRankings ? coverageMetrics.rankings.available++ : coverageMetrics.rankings.missing++;
      hasAdmissions ? coverageMetrics.admissions.available++ : coverageMetrics.admissions.missing++;
      hasLocation ? coverageMetrics.locationData.available++ : coverageMetrics.locationData.missing++;

      // Blocker Analysis
      const blockers = [];
      if (!hasWebsite) blockers.push('MISSING_WEBSITE');
      if (!hasFees) blockers.push('MISSING_FEES');
      if (!hasPlacements) blockers.push('MISSING_PLACEMENTS');
      if (!hasNaac) blockers.push('MISSING_NAAC');
      if (!hasRankings) blockers.push('MISSING_RANKINGS');
      if (!hasAcademics) blockers.push('MISSING_ACADEMICS');
      
      if (blockers.length > 1) blockers.push('MULTIPLE_MISSING_FIELDS');

      if (blockers.length > 0) {
        blockersReport.push({
          collegeCode: college.collegeCode,
          collegeName: college.collegeName,
          blockers
        });
      }

      // Readiness
      const totalCritical = 6; // website, fees, placements, naac, rankings, academics
      const availableCritical = [hasWebsite, hasFees, hasPlacements, hasNaac, hasRankings, hasAcademics].filter(Boolean).length;
      
      let readiness = 'NOT_READY';
      if (availableCritical === totalCritical) {
        readiness = 'READY';
      } else if (availableCritical >= 2) {
        readiness = 'PARTIALLY_READY';
      }

      readinessReport.push({ collegeCode: college.collegeCode, readiness });

      if (readiness === 'READY' || readiness === 'PARTIALLY_READY') {
        inventory.recommendationEligible++;
      } else {
        inventory.recommendationBlocked++;
      }

      // Confidence Distribution
      const totalFields = 8; // Including admissions and location
      const availableFields = [hasWebsite, hasAcademics, hasFees, hasPlacements, hasNaac, hasRankings, hasAdmissions, hasLocation].filter(Boolean).length;
      const confidenceScore = Math.round((availableFields / totalFields) * 100);

      confidenceReport.push({
        collegeCode: college.collegeCode,
        confidenceScore,
        missingFields: totalFields - availableFields
      });

      // High Risk
      if (confidenceScore <= 50 || blockers.includes('MULTIPLE_MISSING_FIELDS') || availableFields === 0) {
        highRiskColleges.push({
          collegeCode: college.collegeCode,
          confidenceScore,
          criticalBlockers: blockers.length,
          zeroInputs: availableFields === 0
        });
      }

      // Assume active unless explicitly not found
      if (college.discoveryStatus === 'not_found' || college.reviewStatus?.status === 'rejected') {
        inventory.inactiveColleges++;
      } else {
        inventory.activeColleges++;
      }
    }

    // Process Duplicates
    for (const [code, count] of Object.entries(codeCounts)) {
      if (count > 1) duplicateCollegeCodes.push({ collegeCode: code, count });
    }
    for (const [name, count] of Object.entries(nameCounts)) {
      if (count > 1) duplicateCollegeNames.push({ collegeName: name, count });
    }

    // Finalize Coverage
    const reportFormatCoverage = [];
    for (const [field, data] of Object.entries(coverageMetrics)) {
      data.coveragePercentage = Math.round((data.available / colleges.length) * 100);
      reportFormatCoverage.push({
        field,
        available: data.available,
        missing: data.missing,
        coveragePercentage: data.coveragePercentage
      });
    }

    fs.writeFileSync(path.join(outputDir, 'dataset-inventory-report.json'), JSON.stringify(inventory, null, 2));
    fs.writeFileSync(path.join(outputDir, 'duplicate-college-codes.json'), JSON.stringify(duplicateCollegeCodes, null, 2));
    fs.writeFileSync(path.join(outputDir, 'duplicate-college-names.json'), JSON.stringify(duplicateCollegeNames, null, 2));
    fs.writeFileSync(path.join(outputDir, 'missing-core-fields.json'), JSON.stringify(missingCoreFields, null, 2));
    fs.writeFileSync(path.join(outputDir, 'recommendation-coverage-report.json'), JSON.stringify(reportFormatCoverage, null, 2));
    fs.writeFileSync(path.join(outputDir, 'recommendation-blockers-report.json'), JSON.stringify(blockersReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'recommendation-readiness-report.json'), JSON.stringify(readinessReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'confidence-distribution-report.json'), JSON.stringify(confidenceReport, null, 2));
    fs.writeFileSync(path.join(outputDir, 'high-risk-colleges.json'), JSON.stringify(highRiskColleges, null, 2));

    const summaryReport = {
      totalColleges: inventory.totalColleges,
      duplicateCodes: duplicateCollegeCodes.length,
      duplicateNames: duplicateCollegeNames.length,
      missingCoreFieldsCount: missingCoreFields.length,
      recommendationReady: readinessReport.filter(r => r.readiness === 'READY').length,
      partiallyReady: readinessReport.filter(r => r.readiness === 'PARTIALLY_READY').length,
      notReady: readinessReport.filter(r => r.readiness === 'NOT_READY').length,
      highRiskCount: highRiskColleges.length,
      overallReadinessScore: Math.round(confidenceReport.reduce((sum, c) => sum + c.confidenceScore, 0) / colleges.length)
    };
    fs.writeFileSync(path.join(outputDir, 'phase-2.9A-summary-report.json'), JSON.stringify(summaryReport, null, 2));

    console.log('Phase 2.9A Audit completed successfully.');

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runAudit();
