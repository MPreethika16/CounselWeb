import CollegeMaster from "../models/CollegeMaster.js";
import { parseFeesHTML } from "./feesParser.js";
import { normalizeFees } from "./feesNormalizer.js";

/**
 * Orchestrates the extraction of fees data for a college.
 * @param {string} collegeCode The code of the college to update.
 * @param {string} html The raw HTML of the target page.
 * @param {string} sourceUrl The URL from which the HTML was fetched.
 * @returns {Promise<object>} The updated fees subdocument.
 */
export async function runFeesScraping(collegeCode, html, sourceUrl) {
  // 1. Parse raw HTML
  const rawData = parseFeesHTML(html, sourceUrl);

  // 2. Normalize and score
  const normalizedData = normalizeFees(rawData);

  // 3. Update database
  // We use findOneAndUpdate to only update the fees field within officialData
  const updatedCollege = await CollegeMaster.findOneAndUpdate(
    { collegeCode },
    {
      $set: {
        "officialData.fees": normalizedData
      }
    },
    { new: true } // Return the updated document
  );

  if (!updatedCollege) {
    throw new Error(`College not found: ${collegeCode}`);
  }

  return updatedCollege.officialData.fees;
}
