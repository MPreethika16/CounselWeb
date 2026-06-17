import CollegeMaster from "../models/CollegeMaster.js";
import { parseRankingsHTML } from "./rankingsParser.js";
import { normalizeRankings } from "./rankingsNormalizer.js";

/**
 * Orchestrates the extraction of rankings and accreditation data.
 * @param {string} collegeCode The code of the college to update.
 * @param {string} html The raw HTML of the target page.
 * @param {string} sourceUrl The URL from which the HTML was fetched.
 */
export async function runRankingsScraping(collegeCode, html, sourceUrl) {
  // 1. Parse raw HTML
  const rawData = parseRankingsHTML(html, sourceUrl);

  // 2. Normalize and score
  const normalizedData = normalizeRankings(rawData, sourceUrl);

  // 3. Update database
  // We want to update rankings fully, but for accreditation, we only $set the fields we actually extracted.
  const setObj = {
    "officialData.rankings": normalizedData.rankings
  };

  // Dynamically set accreditation fields
  const acc = normalizedData.accreditationUpdate;
  if (acc.naacGrade) setObj["officialData.accreditation.naacGrade"] = acc.naacGrade;
  if (acc.naacScore) setObj["officialData.accreditation.naacScore"] = acc.naacScore;
  if (acc.naacValidity) setObj["officialData.accreditation.naacValidity"] = acc.naacValidity;
  if (acc.nbaAccredited !== undefined) setObj["officialData.accreditation.nbaAccredited"] = acc.nbaAccredited;
  if (acc.nbaValidity) setObj["officialData.accreditation.nbaValidity"] = acc.nbaValidity;
  if (acc.nirfRank) setObj["officialData.accreditation.nirfRank"] = acc.nirfRank;
  if (acc.nirfParticipated !== undefined) setObj["officialData.accreditation.nirfParticipated"] = acc.nirfParticipated;
  
  // Set confidence and timestamps on accreditation
  setObj["officialData.accreditation.confidence"] = acc.confidence;
  setObj["officialData.accreditation.sourceUrl"] = sourceUrl;
  setObj["officialData.accreditation.extractedAt"] = new Date();

  const updatedCollege = await CollegeMaster.findOneAndUpdate(
    { collegeCode },
    { $set: setObj },
    { new: true }
  );

  if (!updatedCollege) {
    throw new Error(`College not found: ${collegeCode}`);
  }

  return {
    rankings: updatedCollege.officialData.rankings,
    accreditation: updatedCollege.officialData.accreditation
  };
}
