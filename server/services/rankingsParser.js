import * as cheerio from "cheerio";

const YEAR_REGEX = /\b(20[1-3][0-9])\b/;
const RANK_REGEX = /\b(?:rank|ranked|position)\s*(?:no\.?|#)?\s*([0-9]{1,4})\b/i;
const RANK_FALLBACK_REGEX = /\b([0-9]{1,4})(?:th|st|nd|rd)\b/i;
const SCORE_REGEX = /(?:cgpa|score|points)[^\d]*([0-9]{1,3}(?:\.[0-9]{1,2})?)|([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:cgpa|points)/i;
const NAAC_GRADE_REGEX = /\b(A\+\+|A\+|A|B\+\+|B\+|B|C)(?:$|\s|['".,;]|\b)/i;

/**
 * Extracts raw rankings and accreditation data from HTML.
 */
export function parseRankingsHTML(html, sourceUrl = "") {
  const $ = cheerio.load(html);
  const bodyText = $.root().text();
  const lowerBodyText = bodyText.toLowerCase();

  const rawData = {
    nirfRankings: [],
    naacData: [],
    nbaData: [],
    generalRankings: []
  };

  // 1. Table Extraction (Specifically for NIRF and other structured rankings)
  $('table').each((_, table) => {
    const tableText = $(table).text().toLowerCase();
    const prevText = $(table).prev().text().toLowerCase();
    const parentText = $(table).parent().text().toLowerCase();
    
    // Check if table or its surrounding context contains NIRF
    if (tableText.includes("nirf") || tableText.includes("national institutional ranking framework") ||
        prevText.includes("nirf") || prevText.includes("national institutional ranking framework") ||
        parentText.includes("nirf") || parentText.includes("national institutional ranking framework")) {
      $(table).find('tr').each((_, tr) => {
        let rank = null, year = null, score = null, category = "Overall";
        
        $(tr).find('td, th').each((_, col) => {
          const colText = $(col).text();
          const colLower = colText.toLowerCase();

          if (!rank) {
            const rankMatch = colText.match(/\b([0-9]{1,4})\b/);
            // Ignore if it's a year
            if (rankMatch && !colText.match(YEAR_REGEX)) rank = rankMatch[1];
          }
          if (!year) {
            const yearMatch = colText.match(/\b(20[1-3][0-9])\b/);
            if (yearMatch) year = yearMatch[1];
          }
          if (!score) {
            const scoreMatch = colText.match(/([0-9]{1,3}(?:\.[0-9]{1,2})?)/);
            // Ignore if it's a year or rank
            if (scoreMatch && scoreMatch[1] !== rank && scoreMatch[1] !== year && scoreMatch[1].includes('.')) score = scoreMatch[1];
          }

          if (colLower.includes("engineering")) category = "Engineering";
          else if (colLower.includes("management")) category = "Management";
          else if (colLower.includes("pharmacy")) category = "Pharmacy";
          else if (colLower.includes("medical")) category = "Medical";
          else if (colLower.includes("university")) category = "University";
        });

        if (rank && year) {
          rawData.nirfRankings.push({ rank, year, category, score, agency: "NIRF" });
        }
      });
    }
  });

  // 2. Text-based Parsing for NIRF (if tables not found)
  if (rawData.nirfRankings.length === 0 && lowerBodyText.includes("nirf")) {
    const lines = bodyText.split(/\r?\n|\. /);
    for (const line of lines) {
      if (line.toLowerCase().includes("nirf")) {
        let rank = null, year = null, score = null, category = "Overall";
        
        const rankMatch = line.match(RANK_REGEX) || line.match(/\b([0-9]{1,4})(?:th|st|nd|rd)\b/i);
        if (rankMatch) rank = rankMatch[1];

        const yearMatch = line.match(YEAR_REGEX);
        if (yearMatch) year = yearMatch[1];

        const lowerLine = line.toLowerCase();
        if (lowerLine.includes("engineering")) category = "Engineering";
        else if (lowerLine.includes("management")) category = "Management";
        else if (lowerLine.includes("pharmacy")) category = "Pharmacy";
        else if (lowerLine.includes("medical")) category = "Medical";
        else if (lowerLine.includes("university")) category = "University";

        if (rank) {
          rawData.nirfRankings.push({ rank, year, category, score, agency: "NIRF" });
        }
      }
    }
  }

  // 3. NAAC Parsing
  if (lowerBodyText.includes("naac")) {
    const lines = bodyText.split(/\r?\n|\. /);
    for (const line of lines) {
      if (line.toLowerCase().includes("naac")) {
        let grade = null, score = null, validity = null;

        const gradeMatch = line.match(/(?:grade\s*['"]?\b([A-C](?:\+\+?|))(?:$|[\s'".,;])|['"]?\b([A-C](?:\+\+?|))(?:$|[\s'".,;])\s*grade)/i);
        if (gradeMatch) grade = (gradeMatch[1] || gradeMatch[2]).toUpperCase();

        const scoreMatch = line.match(SCORE_REGEX);
        if (scoreMatch) score = scoreMatch[1] || scoreMatch[2];

        const validityMatch = line.match(/valid\s+(?:up\s*to|till|until)\s+([0-9]{4})/i);
        if (validityMatch) validity = validityMatch[1];

        if (grade || score) {
          rawData.naacData.push({ grade, score, validity });
        }
      }
    }
  }

  // 4. NBA Parsing
  if (lowerBodyText.includes("nba") || lowerBodyText.includes("national board of accreditation")) {
    const lines = bodyText.split(/\r?\n|\. /);
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("nba") || lowerLine.includes("national board of accreditation")) {
        let validity = null;
        const validityMatch = line.match(/valid\s+(?:up\s*to|till|until)\s+([0-9]{4})/i);
        if (validityMatch) validity = validityMatch[1];
        
        rawData.nbaData.push({ accredited: true, validity, evidence: line });
      }
    }
  }

  // 5. General Rankings (India Today, Times, QS, etc.)
  const agencies = ["India Today", "Times", "QS", "The Week", "Outlook", "ARIIA"];
  const lines = bodyText.split(/\r?\n|\. /);
  for (const line of lines) {
    for (const agency of agencies) {
      if (line.toLowerCase().includes(agency.toLowerCase())) {
        const ranks = [...line.matchAll(new RegExp(RANK_FALLBACK_REGEX, 'ig')), ...line.matchAll(new RegExp(RANK_REGEX, 'ig'))].map(m => m[1]);
        const years = [...line.matchAll(new RegExp(YEAR_REGEX, 'g'))].map(m => m[1]);
        
        // Pair them up
        const count = Math.max(ranks.length, years.length);
        for (let i = 0; i < count; i++) {
          const rank = ranks[i] || ranks[0];
          const year = years[i] || years[0];
          if (rank) {
            rawData.generalRankings.push({ agency, rank, year, category: "Overall" });
          }
        }
      }
    }
  }

  return {
    ...rawData,
    sourceUrl,
    extractedAt: new Date()
  };
}
