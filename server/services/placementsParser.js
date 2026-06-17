import * as cheerio from "cheerio";

// Regex patterns
const PACKAGE_REGEX = /(?:rs\.?|inr|₹|\$)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(lpa|lakhs?|l|cr|crores?|k)?\b/i;
const YEAR_REGEX = /\b(20[1-3][0-9](?:\s*-\s*(?:20)?[1-4][0-9])?)\b/i;
const PERCENTAGE_REGEX = /([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*%/;

// Known recruiters to look for in text
const KNOWN_RECRUITERS = [
  "TCS", "Infosys", "Wipro", "Cognizant", "Accenture", "IBM", "Tech Mahindra",
  "Capgemini", "Amazon", "Microsoft", "Google", "Cisco", "Oracle", "Dell",
  "HCL", "Mindtree", "L&T", "Deloitte", "KPMG", "PwC", "EY", "Goldman Sachs"
];

/**
 * Extracts raw placements-related data from HTML.
 */
export function parsePlacementsHTML(html, sourceUrl = "") {
  const $ = cheerio.load(html);
  
  const rawData = {
    highestPackage: [],
    averagePackage: [],
    medianPackage: [],
    placementPercentage: [],
    recruiters: [],
    placementYear: [],
    branchPlacements: [], // Array of objects
    internshipHighestStipend: [],
    internshipAverageStipend: [],
    internshipCompanies: []
  };

  const bodyText = $.root().text();

  // 1. Recruiter Extraction (Logos + Text)
  $('img').each((_, img) => {
    const alt = $(img).attr('alt');
    if (alt && alt.length > 2 && alt.length < 50) {
      if (alt.toLowerCase().includes("logo") || alt.toLowerCase().includes("company")) {
        const cleanName = alt.replace(/logo|company|image/ig, "").trim();
        if (cleanName) rawData.recruiters.push(cleanName);
      }
    }
  });

  for (const company of KNOWN_RECRUITERS) {
    if (new RegExp(`\\b${company}\\b`, "i").test(bodyText)) {
      rawData.recruiters.push(company);
    }
  }

  // 2. Line-by-line metrics extraction
  const lines = bodyText.split(/\r?\n|\. /);
  for (const line of lines) {
    const txt = line.trim();
    if (!txt) continue;
    const lowerTxt = txt.toLowerCase();

    // Context flags
    const isInternship = lowerTxt.includes("internship") || lowerTxt.includes("stipend");
    const isPlacement = !isInternship && (lowerTxt.includes("placement") || lowerTxt.includes("package") || lowerTxt.includes("salary"));

    // Extract year
    const yearMatch = txt.match(YEAR_REGEX);
    if (yearMatch && isPlacement) {
      rawData.placementYear.push(yearMatch[1]);
    }

    // Extract packages
    const pkgMatch = txt.match(PACKAGE_REGEX);
    if (pkgMatch) {
      const valStr = pkgMatch[1];
      const unitStr = pkgMatch[2] || "";
      const val = { amount: valStr, unit: unitStr };

      if (isInternship) {
        if (lowerTxt.includes("highest") || lowerTxt.includes("maximum")) {
          rawData.internshipHighestStipend.push(val);
        } else if (lowerTxt.includes("average") || lowerTxt.includes("mean")) {
          rawData.internshipAverageStipend.push(val);
        }
      } else {
        if (lowerTxt.includes("highest") || lowerTxt.includes("maximum")) {
          rawData.highestPackage.push(val);
        } else if (lowerTxt.includes("average") || lowerTxt.includes("mean")) {
          rawData.averagePackage.push(val);
        } else if (lowerTxt.includes("median")) {
          rawData.medianPackage.push(val);
        }
      }
    }

    // Extract placement percentage
    const pctMatch = txt.match(PERCENTAGE_REGEX);
    if (pctMatch && (lowerTxt.includes("placed") || lowerTxt.includes("placement"))) {
      rawData.placementPercentage.push(pctMatch[1]);
    }
  }

  // 3. Table extraction for branch placements
  $('table').each((_, table) => {
    // Check if it's a branch placement table
    const tableText = $(table).text().toLowerCase();
    if (tableText.includes("branch") || tableText.includes("department")) {
      $(table).find('tr').each((_, tr) => {
        const rowText = $(tr).text().toLowerCase();
        // Skip headers
        if (rowText.includes("branch") && !rowText.includes("computer science")) return;

        const cols = $(tr).find('td, th');
        if (cols.length >= 2) {
          const branchName = $(cols[0]).text().trim();
          if (!branchName || branchName.length > 50) return;

          let highest = null;
          let average = null;
          let placedPct = null;

          // Attempt to find metrics in the remaining columns
          for (let i = 1; i < cols.length; i++) {
            const cellText = $(cols[i]).text().trim();
            const pkgMatch = cellText.match(PACKAGE_REGEX);
            const pctMatch = cellText.match(PERCENTAGE_REGEX);

            if (pctMatch) {
              placedPct = pctMatch[1];
            } else if (pkgMatch) {
              const val = { amount: pkgMatch[1], unit: pkgMatch[2] || "" };
              // We guess the first package is highest, second is average, unless specified in header.
              // For simplicity, without header context, we just push it to highest if not set.
              if (!highest) highest = val;
              else if (!average) average = val;
            }
          }

          if (highest || placedPct) {
            rawData.branchPlacements.push({
              branch: branchName,
              highestPackage: highest,
              averagePackage: average,
              placedPercentage: placedPct
            });
          }
        }
      });
    }
  });

  return {
    ...rawData,
    sourceUrl,
    extractedAt: new Date()
  };
}
