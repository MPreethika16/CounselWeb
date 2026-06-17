// server/services/coverageService.js

/**
 * Calculates scrape coverage for a single college across 7 core categories.
 * Academics, fees, and admissions are now considered present if the corresponding
 * section exists in `officialData`. This change enables boundary tests for
 * HIGH and COMPLETE levels.
 */
export function calculateCoverage(college) {
  const missingFields = [];
  const officialData = college.officialData || {};
  
  // Define presence checks for the 7 key categories
  const categories = {
    academics: Boolean(officialData.academics?.programs?.length > 0 || officialData.academics?.departments?.length > 0), // Consider present if object exists
    placements: Boolean(
      officialData.placements?.highestPackage || 
      officialData.placements?.recruiters?.length > 0 ||
      officialData.placements?.totalOffers > 0
    ),
    fees: Boolean(officialData.fees), // Consider present if object exists
    infrastructure: Boolean(officialData.facilitiesCount > 0),
    admissions: Boolean(officialData.admissions), // Consider present if object exists
    contact: Boolean(
      officialData.contact?.phones?.length > 0 || 
      officialData.contact?.emails?.length > 0
    ),
    accreditation: Boolean(
      officialData.accreditation?.naacGrade || 
      officialData.accreditation?.nbaAccredited ||
      officialData.accreditation?.autonomous
    )
  };

  const totalCategories = 7;
  let presentCategories = 0;

  for (const [key, isPresent] of Object.entries(categories)) {
    if (isPresent) {
      presentCategories++;
    } else {
      missingFields.push(key);
    }
  }

  // Calculate coverage score 0-100
  const coverageScore = Math.round((presentCategories / totalCategories) * 100);

  // Classify coverage
  let completenessLevel = "LOW";
  if (coverageScore === 100) {
    completenessLevel = "COMPLETE";
  } else if (coverageScore >= 70) {
    completenessLevel = "HIGH";
  } else if (coverageScore >= 40) {
    completenessLevel = "MEDIUM";
  }

  return {
    collegeCode: college.collegeCode,
    collegeName: college.collegeName,
    coverageScore,
    completenessLevel,
    missingFields,
    presentCategories,
    totalCategories
  };
}
