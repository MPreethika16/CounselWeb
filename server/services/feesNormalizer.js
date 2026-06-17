/**
 * Normalizes raw fee data parsed from HTML.
 * Cleans formatting, resolves duplicates by selecting the maximum safely parsed value, 
 * and computes a confidence score.
 */
export function normalizeFees(rawData) {
  const parseSafeAmount = (arr) => {
    if (!arr || arr.length === 0) return null;
    
    let maxVal = null;
    for (const item of arr) {
      if (typeof item === 'string') {
        const cleanStr = item.replace(/,/g, "");
        const parsed = parseFloat(cleanStr);
        if (!isNaN(parsed) && parsed > 0) {
          if (maxVal === null || parsed > maxVal) {
            maxVal = parsed;
          }
        }
      }
    }
    return maxVal;
  };

  const tuitionFee = parseSafeAmount(rawData.tuitionFee);
  const hostelFee = parseSafeAmount(rawData.hostelFee);
  const transportFee = parseSafeAmount(rawData.transportFee);
  const examFee = parseSafeAmount(rawData.examFee);
  const miscFee = parseSafeAmount(rawData.miscFee);
  const annualFee = parseSafeAmount(rawData.annualFee);
  const semesterFee = parseSafeAmount(rawData.semesterFee);

  // For string fields, we can just pick the first valid non-empty entry 
  // or join them. We will pick the first unique one.
  const getFirstUnique = (arr) => {
    if (!arr || arr.length === 0) return "";
    const unique = [...new Set(arr.map(a => a.trim()).filter(a => a.length > 0))];
    return unique.length > 0 ? unique[0] : "";
  };

  const feeYear = getFirstUnique(rawData.feeYear);
  const categoryQuota = getFirstUnique(rawData.categoryQuota);

  // Confidence Calculation
  let fieldsFound = 0;
  const targetFields = [
    tuitionFee, hostelFee, transportFee, examFee, miscFee, annualFee, semesterFee
  ];
  
  for (const field of targetFields) {
    if (field !== null) fieldsFound++;
  }
  if (feeYear) fieldsFound++;
  if (categoryQuota) fieldsFound++;

  // We consider 5 distinct extracted elements as high confidence (100)
  // Max possible fields is 9
  const confidence = Math.min(Math.round((fieldsFound / 5) * 100), 100);

  return {
    tuitionFee,
    hostelFee,
    transportFee,
    examFee,
    miscFee,
    annualFee,
    semesterFee,
    feeYear,
    categoryQuota,
    currency: "INR",
    confidence,
    sourceUrl: rawData.sourceUrl || "",
    extractedAt: rawData.extractedAt || new Date()
  };
}
