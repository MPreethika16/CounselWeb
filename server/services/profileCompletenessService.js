/**
 * Service to calculate a standardized profileCompletenessScore (0-100)
 * for CollegeMaster records based on the availability and quality of extracted official data.
 */

export const calculateProfileCompleteness = (college) => {
  const breakdown = {
    website: 0,
    gallery: 0,
    contact: 0,
    address: 0,
    facilities: 0,
    accreditation: 0,
    placements: 0,
    health: 0
  };
  const missingSections = [];

  // 1. Website (10 points)
  if (college.officialWebsite?.verified) {
    breakdown.website = 10;
  } else {
    missingSections.push("website");
  }

  // 2. Gallery (15 points)
  let galleryScore = 0;
  const coverExists = !!college.officialData?.coverImage;
  const galleryCount = college.officialData?.gallery?.value?.length || 0;
  if (coverExists) galleryScore += 5;
  if (galleryCount >= 5) {
    galleryScore += 10;
  } else if (galleryCount > 0) {
    galleryScore += Math.round((galleryCount / 5) * 10);
  }
  breakdown.gallery = galleryScore;
  if (galleryScore < 15) {
    missingSections.push("gallery");
  }

  // 3. Contact (15 points)
  const hasPhone = college.officialData?.contact?.phones?.length > 0;
  const hasEmail = college.officialData?.contact?.emails?.length > 0;
  if (hasPhone || hasEmail) {
    breakdown.contact = 15;
  } else {
    missingSections.push("contact");
  }

  // 4. Address (10 points)
  let addressScore = 0;
  const hasAddr = !!college.officialData?.address?.fullAddress;
  const hasState = !!college.officialData?.address?.state;
  const hasPin = !!college.officialData?.address?.pincode;
  if (hasAddr) addressScore += 4;
  if (hasState) addressScore += 3;
  if (hasPin) addressScore += 3;
  breakdown.address = addressScore;
  if (addressScore < 10) {
    missingSections.push("address");
  }

  // 5. Facilities (15 points)
  const coverage = college.officialData?.facilityCoverageScore || 0;
  breakdown.facilities = Math.round((coverage / 100) * 15);
  if (breakdown.facilities < 12) {
    missingSections.push("facilities");
  }

  // 6. Accreditation (15 points)
  let accScore = 0;
  const acc = college.officialData?.accreditation || {};
  if (acc.naacGrade) accScore += 3;
  if (acc.nbaAccredited || (acc.nbaPrograms && acc.nbaPrograms.length > 0)) accScore += 3;
  if (acc.autonomous) accScore += 3;
  if (acc.ugcRecognized) accScore += 3;
  if (acc.aicteApproved) accScore += 3;
  breakdown.accreditation = accScore;
  if (accScore < 15) {
    missingSections.push("accreditation");
  }

  // 7. Placements (15 points)
  let plcScore = 0;
  const plc = college.officialData?.placements || {};
  const hasMetrics = 
    plc.highestPackage !== null ||
    plc.averagePackage !== null ||
    plc.medianPackage !== null ||
    plc.placementPercentage !== null ||
    plc.totalOffers !== null ||
    plc.totalPlacedStudents !== null;
  const recCount = plc.recruitersCount || plc.recruiters?.length || 0;
  
  if (hasMetrics) plcScore += 10;
  if (recCount > 0) {
    plcScore += 5;
  }
  breakdown.placements = plcScore;
  if (plcScore < 15) {
    missingSections.push("placements");
  }

  // 8. Health (5 points)
  const healthy = college.officialWebsite?.health?.healthy;
  if (healthy) {
    breakdown.health = 5;
  } else {
    missingSections.push("health");
  }

  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    score,
    breakdown,
    missingSections,
    lastCalculatedAt: new Date()
  };
};
