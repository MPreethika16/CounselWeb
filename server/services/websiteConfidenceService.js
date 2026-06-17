/**
 * Website Confidence Service
 * Calculates match confidence score (0 to 100) based on official college details
 * and candidate website properties.
 */

export const calculateConfidence = (college, candidate) => {
  let score = 0;
  
  const url = candidate.url || "";
  const hostname = candidate.hostname || "";
  const title = candidate.title || "";
  const metaDescription = candidate.metaDescription || "";
  const homepageText = candidate.homepageText || "";
  
  const collegeName = college.collegeName || "";
  const collegeCode = college.collegeCode || "";
  const district = college.district || "";
  const location = college.location || ""; // Place

  // Rule 1: Domain ends with .ac.in (+40) or .edu.in (+40)
  const lowerUrl = url.toLowerCase();
  const endsWithAcIn = lowerUrl.includes(".ac.in");
  const endsWithEduIn = lowerUrl.includes(".edu.in");
  
  if (endsWithAcIn || endsWithEduIn) {
    score += 40;
  }

  // Rule 2: Homepage title contains college name (+20)
  if (title && collegeName) {
    const cleanTitle = title.replace(/\s+/g, " ").toLowerCase();
    const cleanName = collegeName.replace(/\s+/g, " ").toLowerCase();
    if (cleanTitle.includes(cleanName)) {
      score += 20;
    }
  }

  // Rule 3: Homepage contains college code (+15)
  if (homepageText && collegeCode) {
    const cleanText = homepageText.toLowerCase();
    const cleanCode = collegeCode.toLowerCase().trim();
    if (cleanText.includes(cleanCode)) {
      score += 15;
    }
  }

  // Rule 4: Homepage contains district/location (+10)
  if (homepageText) {
    const cleanText = homepageText.toLowerCase();
    const locMatch = location && cleanText.includes(location.toLowerCase().trim());
    const distMatch = district && cleanText.includes(district.toLowerCase().trim());
    if (locMatch || distMatch) {
      score += 10;
    }
  }

  // Rule 5: Meta description contains college name (+10)
  if (metaDescription && collegeName) {
    const cleanMeta = metaDescription.replace(/\s+/g, " ").toLowerCase();
    const cleanName = collegeName.replace(/\s+/g, " ").toLowerCase();
    if (cleanMeta.includes(cleanName)) {
      score += 10;
    }
  }

  // Rule 6: Contact email domain matches website domain (+20)
  if (homepageText) {
    // Basic email regex finder
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = homepageText.match(emailRegex) || [];
    
    // Determine the clean website domain name (excluding subdomains like 'www')
    let webDomain = hostname.toLowerCase().trim();
    if (!webDomain && url) {
      try {
        webDomain = new URL(url).hostname.toLowerCase().trim();
      } catch (e) {
        // Fallback
      }
    }
    const cleanWebDomain = webDomain.replace(/^www\./i, "");

    let hasDomainMatchedEmail = false;
    for (const email of emails) {
      const emailDomain = email.split("@")[1]?.toLowerCase().trim() || "";
      const cleanEmailDomain = emailDomain.replace(/^www\./i, "");
      
      if (cleanEmailDomain === cleanWebDomain && cleanWebDomain !== "") {
        hasDomainMatchedEmail = true;
        break;
      }
    }

    if (hasDomainMatchedEmail) {
      score += 20;
    }
  }

  // Cap the score at 100
  return Math.min(100, score);
};

export default {
  calculateConfidence
};
