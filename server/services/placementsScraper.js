import CollegeMaster from "../models/CollegeMaster.js";
import { parsePlacementsHTML } from "./placementsParser.js";
import { normalizePlacements } from "./placementsNormalizer.js";

/**
 * Orchestrates the extraction of placements data for a college.
 * @param {string} collegeCode The code of the college to update.
 * @param {string} html The raw HTML of the target page.
 * @param {string} sourceUrl The URL from which the HTML was fetched.
 * @returns {Promise<object>} The updated placements subdocument.
 */
export async function runPlacementsScraping(collegeCode, html, sourceUrl) {
  // 1. Parse raw HTML
  const rawData = parsePlacementsHTML(html, sourceUrl);

  // 2. Normalize and score
  const normalizedData = normalizePlacements(rawData);

  // 3. Update database
  const updatedCollege = await CollegeMaster.findOneAndUpdate(
    { collegeCode },
    {
      $set: {
        "officialData.placements": normalizedData
      }
    },
    { new: true }
  );

  if (!updatedCollege) {
    throw new Error(`College not found: ${collegeCode}`);
  }

  return updatedCollege.officialData.placements;
}
