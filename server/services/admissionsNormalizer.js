/**
 * Normalizes raw admission data parsed from HTML.
 * Cleans formatting, deduplicates lists, and computes a confidence score.
 */
export function normalizeAdmissions(rawData) {
  const getUniqueList = (arr) => {
    if (!arr || !Array.isArray(arr)) return [];
    // remove duplicates and empty strings
    return [...new Set(arr.map(a => a.trim()).filter(a => a.length > 0))];
  };

  const getFirstUnique = (arr) => {
    const list = getUniqueList(arr);
    return list.length > 0 ? list[0] : "";
  };

  const joinUnique = (arr) => {
    const list = getUniqueList(arr);
    return list.length > 0 ? list.join(" | ") : "";
  };

  const eligibilityCriteria = getUniqueList(rawData.eligibilityCriteria);
  const entranceExams = getUniqueList(rawData.entranceExams);
  const requiredDocuments = getUniqueList(rawData.requiredDocuments);
  
  const eamcetRanks = getFirstUnique(rawData.eamcetRanks);
  const jeeRanks = getFirstUnique(rawData.jeeRanks);
  const cutoffRanges = getFirstUnique(rawData.cutoffRanges);
  
  const counselingProcess = joinUnique(rawData.counselingProcess);
  const managementQuota = joinUnique(rawData.managementQuota);
  const nriQuota = joinUnique(rawData.nriQuota);
  const admissionContact = joinUnique(rawData.admissionContact);
  const applicationDeadline = getFirstUnique(rawData.applicationDeadline);

  // Confidence Calculation
  let fieldsFound = 0;
  
  if (eligibilityCriteria.length > 0) fieldsFound++;
  if (entranceExams.length > 0) fieldsFound++;
  if (eamcetRanks || jeeRanks || cutoffRanges) fieldsFound++; // grouped rank fields
  if (counselingProcess) fieldsFound++;
  if (managementQuota || nriQuota) fieldsFound++; // grouped quota fields
  if (requiredDocuments.length > 0) fieldsFound++;
  if (admissionContact) fieldsFound++;
  if (applicationDeadline) fieldsFound++;

  // 8 possible distinct categories of information
  // 6 or more gives 100% confidence
  const confidence = Math.min(Math.round((fieldsFound / 6) * 100), 100);

  return {
    eligibilityCriteria,
    entranceExams,
    eamcetRanks,
    jeeRanks,
    cutoffRanges,
    counselingProcess,
    managementQuota,
    nriQuota,
    requiredDocuments,
    admissionContact,
    applicationDeadline,
    cutoffRank: null, // Legacy field
    confidence,
    sourceUrl: rawData.sourceUrl || "",
    extractedAt: rawData.extractedAt || new Date()
  };
}
