import * as cheerio from "cheerio";

// Helper regex patterns
const RANK_REGEX = /(?:rank|cutoff)[\s:=]*([0-9,]+(?:\s*-\s*[0-9,]+)?|below\s*[0-9,]+|above\s*[0-9,]+)/i;
const EXAMS_LIST = ["JEE", "EAMCET", "ECET", "ICET", "PGCET", "GATE", "CAT", "MAT", "NEET"];

/**
 * Extracts raw admission-related text from HTML.
 */
export function parseAdmissionsHTML(html, sourceUrl = "") {
  const $ = cheerio.load(html);
  
  const rawData = {
    eligibilityCriteria: [],
    entranceExams: [],
    eamcetRanks: [],
    jeeRanks: [],
    cutoffRanges: [],
    counselingProcess: [],
    managementQuota: [],
    nriQuota: [],
    requiredDocuments: [],
    admissionContact: [],
    applicationDeadline: []
  };

  const bodyText = $.root().text();
  
  // 1. Entrance exams global search
  for (const exam of EXAMS_LIST) {
    if (new RegExp(`\\b${exam}\\b`, "i").test(bodyText)) {
      rawData.entranceExams.push(exam);
    }
  }

  // 2. Structured section extraction
  const collectListUnderHeading = (keywords) => {
    const items = [];
    $(`h1,h2,h3,h4,h5,p,strong,b`).each((_, el) => {
      const headingText = $(el).text().toLowerCase();
      if (keywords.some(kw => headingText.includes(kw))) {
        let sibling = $(el).next();
        let limit = 0;
        while (sibling && sibling.length && limit < 5) {
          if (sibling.is('ul,ol')) {
            sibling.find('li').each((_, li) => {
              const txt = $(li).text().trim();
              if (txt) items.push(txt);
            });
            break; // Stop after finding the list
          }
          if (sibling.is('p')) {
            const txt = sibling.text().trim();
            if (txt && txt.length > 5) items.push(txt);
          }
          sibling = sibling.next();
          limit++;
        }
      }
    });
    return items;
  };

  rawData.eligibilityCriteria = collectListUnderHeading(["eligibility", "qualification", "who can apply"]);
  rawData.requiredDocuments = collectListUnderHeading(["document", "certificates required"]);
  rawData.counselingProcess = collectListUnderHeading(["counseling", "counselling", "admission process"]);
  rawData.managementQuota = collectListUnderHeading(["management quota", "management category", "category b"]);
  rawData.nriQuota = collectListUnderHeading(["nri quota", "nri category", "nri candidate", "nri admission"]);

  // 3. Line-by-line extraction for specific quotas and deadlines
  const lines = bodyText.split(/\r?\n|\. /);
  for (const line of lines) {
    const txt = line.trim();
    if (!txt) continue;
    const lowerTxt = txt.toLowerCase();

    if (lowerTxt.includes("management quota") || lowerTxt.includes("category b")) {
      rawData.managementQuota.push(txt);
    }
    if (lowerTxt.includes("nri quota") || lowerTxt.includes("nri category") || lowerTxt.includes("nri candidate")) {
      rawData.nriQuota.push(txt);
    }
    if (lowerTxt.includes("contact") && (lowerTxt.includes("admission") || lowerTxt.match(/[0-9]{10}/))) {
      if (lowerTxt.length < 150) rawData.admissionContact.push(txt);
    }
    if (lowerTxt.includes("deadline") || lowerTxt.includes("last date")) {
      if (lowerTxt.length < 150) rawData.applicationDeadline.push(txt);
    }

    // Rank extraction
    const rankMatch = txt.match(RANK_REGEX);
    if (rankMatch) {
      const val = rankMatch[1].trim();
      rawData.cutoffRanges.push(val);
      if (lowerTxt.includes("eamcet")) rawData.eamcetRanks.push(val);
      if (lowerTxt.includes("jee")) rawData.jeeRanks.push(val);
    }
  }

  // 4. Table extraction for cutoffs
  $('table tr').each((_, tr) => {
    const text = $(tr).text().toLowerCase();
    const rankMatch = text.match(RANK_REGEX);
    // Fallback regex for pure ranges in tables next to exam names
    const rangeFallbackMatch = text.match(/([0-9]{3,7}\s*-\s*[0-9]{3,7})/);
    
    if (rankMatch) {
      const val = rankMatch[1].trim();
      rawData.cutoffRanges.push(val);
      if (text.includes("eamcet")) rawData.eamcetRanks.push(val);
      if (text.includes("jee")) rawData.jeeRanks.push(val);
    } else if (rangeFallbackMatch && (text.includes("jee") || text.includes("eamcet"))) {
      const val = rangeFallbackMatch[1].trim();
      rawData.cutoffRanges.push(val);
      if (text.includes("eamcet")) rawData.eamcetRanks.push(val);
      if (text.includes("jee")) rawData.jeeRanks.push(val);
    }
  });

  return {
    ...rawData,
    sourceUrl,
    extractedAt: new Date()
  };
}
