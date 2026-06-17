/**
 * Service to calculate a separate trustScore (0-100) representing
 * data reliability and verification quality for CollegeMaster records.
 */

export const calculateTrustScore = (college) => {
  const breakdown = {
    websiteVerification: 0,
    websiteHealth: 0,
    galleryQuality: 0,
    contactQuality: 0,
    facilitiesQuality: 0,
    accreditationQuality: 0,
    placementQuality: 0,
    dataFreshness: 0
  };
  const reviewFlags = [];

  // 1. Website Verification (20 points)
  if (college.officialWebsite?.verified) {
    breakdown.websiteVerification += 15;
  }
  if (college.officialWebsite?.canonicalDomain) {
    breakdown.websiteVerification += 5;
  }

  // 2. Website Health (10 points)
  if (college.officialWebsite?.health?.healthy) {
    breakdown.websiteHealth += 8;
  } else {
    reviewFlags.push("website_unhealthy");
  }
  if (college.officialWebsite?.health?.sslValid) {
    breakdown.websiteHealth += 2;
  }

  // 3. Gallery Quality (10 points)
  const coverExists = !!college.officialData?.coverImage;
  if (coverExists) {
    breakdown.galleryQuality += 3;
  }
  const gallery = college.officialData?.gallery?.value || [];
  if (gallery.length > 0) {
    const qualityImages = gallery.filter(img => img.confidence >= 80);
    const qualityRatio = qualityImages.length / gallery.length;
    breakdown.galleryQuality += Math.round(qualityRatio * 7);
  }

  // 4. Contact Quality (10 points)
  const canonicalDomain = (college.officialWebsite?.canonicalDomain || "").toLowerCase().trim();
  const emails = college.officialData?.contact?.emails || [];
  const hasOfficialEmail = emails.some(email => {
    if (!canonicalDomain) return false;
    const cleanEmail = email.toLowerCase().trim();
    return cleanEmail.endsWith(`@${canonicalDomain}`) || cleanEmail.endsWith(`.${canonicalDomain}`);
  });
  if (hasOfficialEmail) {
    breakdown.contactQuality += 5;
  }

  const socialLinks = college.officialData?.contact?.socialLinks || {};
  const hasVerifiedSocial = Object.values(socialLinks).some(link => link && link.verified === true);
  if (hasVerifiedSocial) {
    breakdown.contactQuality += 5;
  }

  // 5. Facilities Quality (10 points)
  const covScore = college.officialData?.facilityCoverageScore || 0;
  const qualScore = college.officialData?.facilityQualityScore || 0;
  breakdown.facilitiesQuality = Math.round((covScore / 100) * 5 + (qualScore / 100) * 5);

  // 6. Accreditation Quality (15 points)
  const acc = college.officialData?.accreditation || {};
  const accConf = acc.confidence || 0;
  breakdown.accreditationQuality += Math.round((accConf / 100) * 10);
  if (acc.reviewRequired === false) {
    breakdown.accreditationQuality += 5;
  } else if (acc.reviewRequired === true) {
    reviewFlags.push("affiliation_conflict");
  }

  // 7. Placement Quality (15 points)
  const plc = college.officialData?.placements || {};
  const hasSourceSummary = plc.sourceSummary && !!plc.sourceSummary.primarySourceUrl;
  if (hasSourceSummary) {
    breakdown.placementQuality += 5;
    if (plc.sourceSummary.primarySourceType === "official_pdf") {
      breakdown.placementQuality += 5;
    }
  }
  if (plc.reviewRequired === false && plc.suspicious === false) {
    breakdown.placementQuality += 5;
  } else if (plc.reviewRequired === true || plc.suspicious === true) {
    reviewFlags.push("placement_outlier");
  }

  // 8. Data Freshness (10 points)
  const refDate = college.metadata?.normalizedAt || college.updatedAt || new Date();
  const diffTime = Math.abs(new Date() - refDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) {
    breakdown.dataFreshness = 10;
  } else if (diffDays <= 60) {
    breakdown.dataFreshness = 5;
  }

  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    score,
    breakdown,
    reviewFlags,
    lastCalculatedAt: new Date()
  };
};
