/**
 * Normalizes raw ranking data, formats numbers, and deduplicates.
 */
export function normalizeRankings(rawData, sourceUrl = "") {
  // Deduplicate and resolve rankings
  const rankingsMap = new Map(); // key: agency_category_year

  const normalizeCategory = (cat) => {
    const lower = cat.toLowerCase();
    if (lower.includes("eng") || lower.includes("b.tech") || lower.includes("btech")) return "Engineering";
    if (lower.includes("manag") || lower.includes("mba")) return "Management";
    if (lower.includes("med") || lower.includes("mbbs")) return "Medical";
    if (lower.includes("pharm")) return "Pharmacy";
    if (lower.includes("univ")) return "University";
    if (lower.includes("law")) return "Law";
    if (lower.includes("arch")) return "Architecture";
    return "Overall";
  };

  const processRankings = (arr) => {
    for (const item of arr) {
      if (!item.rank || !item.agency) continue;
      const rank = parseInt(item.rank);
      let year = item.year ? parseInt(item.year) : null;
      const score = item.score ? parseFloat(item.score) : null;
      if (isNaN(rank)) continue;

      // NIRF Year Bounds Check
      if (item.agency === "NIRF" && year) {
        if (year < 2016 || year > new Date().getFullYear() + 1) {
          year = null;
        }
      }

      const normalizedCategory = normalizeCategory(item.category);

      // Group by agency + category. If year is missing, assume it's current. 
      // We keep the highest rank (lowest number) if there are duplicates for the same year/category.
      const key = `${item.agency}_${normalizedCategory}_${year}`;
      const existing = rankingsMap.get(key);
      if (!existing || existing.rank > rank) {
        rankingsMap.set(key, {
          agency: item.agency,
          category: normalizedCategory,
          rank,
          year,
          score,
          sourceUrl
        });
      }
    }
  };

  processRankings(rawData.nirfRankings);
  processRankings(rawData.generalRankings);

  const finalRankings = Array.from(rankingsMap.values());

  // Deduplicate NAAC Data
  let bestNaac = { grade: "", score: null, validity: "" };
  const gradeRanks = { "A++": 7, "A+": 6, "A": 5, "B++": 4, "B+": 3, "B": 2, "C": 1 };

  for (const n of rawData.naacData) {
    const s = n.score ? parseFloat(n.score) : null;
    
    // Validate NAAC grade
    const cleanGrade = (n.grade || "").toUpperCase();
    if (!gradeRanks[cleanGrade]) continue;

    const gRank = gradeRanks[cleanGrade];
    const bestGRank = gradeRanks[bestNaac.grade] || 0;

    if (gRank > bestGRank || (gRank === bestGRank && s > bestNaac.score)) {
      bestNaac.grade = cleanGrade;
      bestNaac.score = isNaN(s) ? null : s;
      bestNaac.validity = n.validity || "";
    }
  }

  // Deduplicate NBA Data
  let nbaAccredited = false;
  let nbaValidity = "";
  for (const nba of rawData.nbaData) {
    if (nba.accredited) nbaAccredited = true;
    if (nba.validity && (!nbaValidity || nba.validity > nbaValidity)) {
      nbaValidity = nba.validity;
    }
  }

  // Find best NIRF rank for accreditation fields
  let bestNirf = null;
  for (const r of finalRankings) {
    if (r.agency === "NIRF" && (bestNirf === null || r.rank < bestNirf)) {
      bestNirf = r.rank;
    }
  }

  // Confidence Computation
  let fieldsFound = 0;
  if (finalRankings.length > 0) fieldsFound += 2;
  if (bestNaac.grade) fieldsFound++;
  if (nbaAccredited) fieldsFound++;
  if (bestNirf !== null) fieldsFound++;

  const confidence = Math.min(Math.round((fieldsFound / 4) * 100), 100);

  return {
    rankings: finalRankings,
    accreditationUpdate: {
      naacGrade: bestNaac.grade,
      naacScore: bestNaac.score,
      naacValidity: bestNaac.validity,
      nbaAccredited,
      nbaValidity,
      nirfRank: bestNirf,
      nirfParticipated: bestNirf !== null || rawData.nirfRankings.length > 0,
      confidence
    },
    confidence
  };
}
