import CollegeMaster from "../models/CollegeMaster.js";
import { parseAdmissionsHTML } from "./admissionsParser.js";
import { normalizeAdmissions } from "./admissionsNormalizer.js";

/**
 * Orchestrates the extraction of admissions data for a college.
 * @param {string} collegeCode The code of the college to update.
 * @param {string} html The raw HTML of the target page.
 * @param {string} sourceUrl The URL from which the HTML was fetched.
 * @returns {Promise<object>} The updated admissions subdocument.
 */
export async function runAdmissionsScraping(collegeCode, html, sourceUrl) {
  // 1. Parse raw HTML
  const rawData = parseAdmissionsHTML(html, sourceUrl);

  // 2. Normalize and score
  const normalizedData = normalizeAdmissions(rawData);

  // 3. Update database
  // We use findOneAndUpdate to only update the admissions field within officialData
  const updatedCollege = await CollegeMaster.findOneAndUpdate(
    { collegeCode },
    {
      $set: {
        "officialData.admissions": normalizedData
      }
    },
    { new: true } // Return the updated document
  );

  if (!updatedCollege) {
    throw new Error(`College not found: ${collegeCode}`);
  }

  return updatedCollege.officialData.admissions;
}
