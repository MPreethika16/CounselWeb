/**
 * Normalizes raw placement data parsed from HTML.
 * Translates LPA/Lakhs to full INR amounts, deduplicates recruiters, and computes confidence.
 */
export function normalizePlacements(rawData) {
  // Helper to convert salary object to full INR number
  const parseSafeAmount = (valObj) => {
    if (!valObj || !valObj.amount) return null;
    let numStr = valObj.amount.replace(/,/g, "");
    let num = parseFloat(numStr);
    if (isNaN(num)) return null;

    const unit = valObj.unit ? valObj.unit.toLowerCase() : "";
    if (unit.includes("lpa") || unit.includes("lakh") || unit.includes("l")) {
      num = num * 100000;
    } else if (unit.includes("cr") || unit.includes("crore")) {
      num = num * 10000000;
    } else if (unit.includes("k")) {
      num = num * 1000;
    } else if (num < 1000) {
      // If no unit but small number, assume LPA based on domain context
      num = num * 100000;
    }

    return num;
  };

  // Helper to pick the maximum valid amount from an array
  const getMaxAmount = (arr) => {
    if (!arr || arr.length === 0) return null;
    let maxVal = null;
    for (const item of arr) {
      const val = parseSafeAmount(item);
      if (val !== null && (maxVal === null || val > maxVal)) {
        maxVal = val;
      }
    }
    return maxVal;
  };

  // Pick first unique string
  const getFirstUnique = (arr) => {
    if (!arr || arr.length === 0) return "";
    const unique = [...new Set(arr.map(a => a.trim()).filter(a => a.length > 0))];
    return unique.length > 0 ? unique[0] : "";
  };

  // Process core metrics
  const highestPackage = getMaxAmount(rawData.highestPackage);
  const averagePackage = getMaxAmount(rawData.averagePackage);
  const medianPackage = getMaxAmount(rawData.medianPackage);

  const internshipHighestStipend = getMaxAmount(rawData.internshipHighestStipend);
  const internshipAverageStipend = getMaxAmount(rawData.internshipAverageStipend);

  const placementYearStr = getFirstUnique(rawData.placementYear);
  const placementYear = placementYearStr ? parseInt(placementYearStr.split('-')[0]) : null;

  // Process recruiters (unique, mapped to schema objects)
  const uniqueRecruitersText = [...new Set(rawData.recruiters.map(r => r.trim()).filter(r => r.length > 0))];
  const recruiters = uniqueRecruitersText.map(name => ({
    name,
    confidence: 100, // Detected directly
    sourceUrl: rawData.sourceUrl || "",
    evidenceText: "Parsed from page content"
  }));

  // Process branch placements
  const branchPlacements = rawData.branchPlacements.map(bp => {
    return {
      branch: bp.branch,
      highestPackage: parseSafeAmount(bp.highestPackage),
      averagePackage: parseSafeAmount(bp.averagePackage),
      placedPercentage: bp.placedPercentage ? parseFloat(bp.placedPercentage) : null
    };
  });

  // Pick max placement percentage
  let maxPct = null;
  const allPcts = [...rawData.placementPercentage, ...branchPlacements.map(b => b.placedPercentage).filter(p => p !== null)];
  
  for (const pct of allPcts) {
    const p = typeof pct === "string" ? parseFloat(pct) : pct;
    if (!isNaN(p) && p <= 100 && (maxPct === null || p > maxPct)) {
      maxPct = p;
    }
  }

  // Confidence Calculation
  let fieldsFound = 0;
  if (highestPackage) fieldsFound++;
  if (averagePackage || medianPackage) fieldsFound++;
  if (maxPct) fieldsFound++;
  if (recruiters.length > 0) fieldsFound++;
  if (placementYear) fieldsFound++;
  if (branchPlacements.length > 0) fieldsFound++;
  if (internshipHighestStipend || internshipAverageStipend) fieldsFound++;

  // 7 distinct metrics categories possible.
  // 5 or more distinct items grants 100% confidence.
  const confidence = Math.min(Math.round((fieldsFound / 5) * 100), 100);

  return {
    highestPackage,
    averagePackage,
    medianPackage,
    placementPercentage: maxPct,
    totalOffers: null,
    totalPlacedStudents: null,
    recruiters,
    placementYear,
    placementYearEvidence: placementYearStr,
    branchPlacements,
    internshipData: {
      highestStipend: internshipHighestStipend,
      averageStipend: internshipAverageStipend,
      companies: []
    },
    sourceType: "official_placement_page",
    confidence,
    sourceUrl: rawData.sourceUrl || "",
    extractedAt: rawData.extractedAt || new Date()
  };
}
