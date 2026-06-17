import * as cheerio from "cheerio";

// Helper regex patterns
const AMOUNT_REGEX = /(?:rs\.?|inr|₹|\$)?\s*([0-9][0-9,]*[0-9]|[0-9]+)\s*(?:rs\.?|inr|₹|\$)?/i;
const YEAR_REGEX = /(?:\b|\D|^)(20[1-3][0-9](?:\s*-\s*(?:20)?[1-4][0-9])?)(?:\b|\D|$)/i;

/**
 * Extracts raw numeric values associated with specific fee keywords
 * Searches through tables, lists, and paragraphs.
 */
export function parseFeesHTML(html, sourceUrl = "") {
  const $ = cheerio.load(html);
  
  const rawData = {
    tuitionFee: [],
    hostelFee: [],
    transportFee: [],
    examFee: [],
    miscFee: [],
    annualFee: [],
    semesterFee: [],
    feeYear: [],
    categoryQuota: []
  };

  // 1. Text-based extraction from paragraphs/spans/lists
  const extractFromText = (text) => {
    const lines = text.split(/\r?\n|;/);
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const amountMatch = line.match(AMOUNT_REGEX);
      const yearMatch = line.match(YEAR_REGEX);

      if (yearMatch) rawData.feeYear.push(yearMatch[1]);

      if (lowerLine.includes("quota") || lowerLine.includes("category")) {
        if (lowerLine.includes("management")) rawData.categoryQuota.push("Management");
        if (lowerLine.includes("nri")) rawData.categoryQuota.push("NRI");
        if (lowerLine.includes("merit") || lowerLine.includes("general")) rawData.categoryQuota.push("General/Merit");
      }

      if (amountMatch) {
        const amountStr = amountMatch[1];
        if (lowerLine.includes("tuition")) rawData.tuitionFee.push(amountStr);
        else if (lowerLine.includes("hostel") || lowerLine.includes("accommodation")) rawData.hostelFee.push(amountStr);
        else if (lowerLine.includes("transport") || lowerLine.includes("bus")) rawData.transportFee.push(amountStr);
        else if (lowerLine.includes("exam")) rawData.examFee.push(amountStr);
        else if (lowerLine.includes("misc") || lowerLine.includes("other fee") || lowerLine.includes("library")) rawData.miscFee.push(amountStr);
        else if (lowerLine.includes("annual fee") || lowerLine.includes("total fee") || lowerLine.includes("per year")) rawData.annualFee.push(amountStr);
        else if (lowerLine.includes("semester fee") || lowerLine.includes("per sem")) rawData.semesterFee.push(amountStr);
      }
    }
  };

  extractFromText($.root().text());

  // 2. Table-based extraction (looks for key-value rows)
  $('table tr').each((_, tr) => {
    const cols = $(tr).find('td, th');
    if (cols.length >= 2) {
      const key = $(cols[0]).text().toLowerCase().trim();
      const valText = $(cols[1]).text().trim();
      const valMatch = valText.match(AMOUNT_REGEX);

      if (valMatch) {
        const amountStr = valMatch[1];
        if (key.includes("tuition")) rawData.tuitionFee.push(amountStr);
        if (key.includes("hostel") || key.includes("accommodation")) rawData.hostelFee.push(amountStr);
        if (key.includes("transport") || key.includes("bus")) rawData.transportFee.push(amountStr);
        if (key.includes("exam")) rawData.examFee.push(amountStr);
        if (key.includes("misc") || key.includes("other") || key.includes("library")) rawData.miscFee.push(amountStr);
        if (key.includes("annual") || key.includes("total") || key.includes("per year")) rawData.annualFee.push(amountStr);
        if (key.includes("semester") || key.includes("per sem")) rawData.semesterFee.push(amountStr);
      }
      
      const yearMatch = valText.match(YEAR_REGEX);
      if (key.includes("year") && yearMatch) {
        rawData.feeYear.push(yearMatch[1]);
      }
    }
  });

  return {
    ...rawData,
    sourceUrl,
    extractedAt: new Date()
  };
}
