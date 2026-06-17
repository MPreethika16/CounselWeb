export const dataRemediationService = {
  remediateWebsite: (website) => {
    let result = { status: "VALID", value: website, mutated: false };
    if (!website || typeof website !== "string" || website.trim() === "") {
      return { status: "UNRESOLVED_WEBSITE", value: null, mutated: false };
    }

    let cleanUrl = website.trim().toLowerCase();
    
    // Auto-fix missing protocols
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
      result.mutated = true;
    }

    // Upgrade http to https heuristically
    if (cleanUrl.startsWith("http://")) {
      cleanUrl = cleanUrl.replace("http://", "https://");
      result.mutated = true;
    }

    // Check malformed domains
    const URL_REGEX = /^https:\/\/(?!localhost)(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    if (!URL_REGEX.test(cleanUrl)) {
      return { status: "UNRESOLVED_WEBSITE", value: website, mutated: false };
    }

    result.value = cleanUrl;
    return result;
  },

  remediatePlacement: (placements) => {
    let result = { status: "VALID", value: { ...placements }, mutated: false };
    if (!placements || Object.keys(placements).length === 0) {
      return { status: "MISSING", value: null, mutated: false };
    }

    let { averagePackageLPA, highestPackageLPA, placementPercentage } = result.value;

    // Fix Field Inversion (e.g. Average = 50, Highest = 8)
    if (averagePackageLPA && highestPackageLPA && averagePackageLPA > highestPackageLPA) {
      const temp = averagePackageLPA;
      result.value.averagePackageLPA = highestPackageLPA;
      result.value.highestPackageLPA = temp;
      result.mutated = true;
    }

    // Isolate impossible logic
    if (placementPercentage > 100 || placementPercentage < 0 || averagePackageLPA < 0 || highestPackageLPA < 0) {
      return { status: "QUARANTINED", value: placements, mutated: false };
    }

    return result;
  },

  remediateFees: (fees) => {
    let result = { status: "VALID", value: { ...fees }, mutated: false };
    if (!fees) {
      return { status: "MISSING", value: null, mutated: false };
    }

    // Recover averageTuition from feeStructure array if available
    if ((!fees.averageTuition || fees.averageTuition <= 0) && fees.feeStructure && fees.feeStructure.length > 0) {
      const firstYear = fees.feeStructure[0].firstYearTuition;
      if (firstYear > 0) {
        result.value.averageTuition = firstYear;
        result.mutated = true;
      } else {
        return { status: "UNRESOLVED_FEE", value: fees, mutated: false };
      }
    }

    if (result.value.averageTuition <= 0 || result.value.averageTuition > 15000000) {
      return { status: "UNRESOLVED_FEE", value: fees, mutated: false };
    }

    return result;
  },

  remediateRankings: (rankings) => {
    let result = { status: "VALID", value: rankings, mutated: false };
    if (!rankings || rankings.length === 0) {
      return { status: "NOT_RANKED", value: [], mutated: false };
    }

    const cleaned = rankings.filter(r => r.rank > 0 && r.year >= 2000 && r.agency);
    
    if (cleaned.length === 0) {
      return { status: "INVALID_RANKING_DATA", value: rankings, mutated: false };
    }

    if (cleaned.length !== rankings.length) {
      result.status = "PARTIAL_RECOVERY";
      result.mutated = true;
      result.value = cleaned;
    }

    return result;
  },

  remediateNaac: (college) => {
    let result = { status: "NAAC_FOUND", value: college.officialData?.accreditation?.naacGrade, mutated: false };
    
    if (result.value) {
      const VALID = new Set(["A++", "A+", "A", "B++", "B+", "B", "C"]);
      if (!VALID.has(result.value)) return { status: "NAAC_UNRESOLVED", value: result.value, mutated: false };
      return result;
    }

    // Attempt recovery from aliases or meta desc
    const metaStr = JSON.stringify(college.meta || {});
    if (metaStr.includes("NAAC A++")) return { status: "NAAC_RECOVERED", value: "A++", mutated: true };
    if (metaStr.includes("NAAC A+")) return { status: "NAAC_RECOVERED", value: "A+", mutated: true };
    if (metaStr.includes("NAAC A")) return { status: "NAAC_RECOVERED", value: "A", mutated: true };

    return { status: "NAAC_NOT_AVAILABLE", value: null, mutated: false };
  }
};
