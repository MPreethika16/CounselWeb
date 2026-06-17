// server/services/academicsScraper.js

import CollegeMaster from "../models/CollegeMaster.js";
import { parseAcademicsHTML } from "./academicsParser.js";
import { normalizeAcademics } from "./academicsNormalizer.js";

/**
 * Orchestrates the extraction of academic data for a college.
 * @param {string} collegeCode The code of the college to update.
 * @param {string} html The raw HTML of the target page.
 * @param {string} sourceUrl The URL from which the HTML was fetched.
 * @returns {Promise<object>} The updated academics subdocument.
 */
export async function runAcademicsScraping(collegeCode, html, sourceUrl) {
  // 1. Parse raw HTML
  const rawData = parseAcademicsHTML(html, sourceUrl);

  // 2. Normalize and score
  const normalizedData = normalizeAcademics(rawData);

  // 3. Update database
  // We use findOneAndUpdate to only update the academics field within officialData
  const updatedCollege = await CollegeMaster.findOneAndUpdate(
    { collegeCode },
    {
      $set: {
        "officialData.academics": normalizedData
      }
    },
    { new: true } // Return the updated document
  );

  if (!updatedCollege) {
    throw new Error(`College not found: ${collegeCode}`);
  }

  return updatedCollege.officialData.academics;
}
