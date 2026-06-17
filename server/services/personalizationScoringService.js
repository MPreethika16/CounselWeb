/**
 * Personalization Scoring Logic
 * Takes a base recommendation college object (with subscores) and applies user preferences.
 */

export function computePersonalizedScore(college, preferences) {
  const baseScore = college.overallScore || 0;
  const subscores = college.subscores || {};
  const data = college.officialData || {};
  
  let pScore = 0;
  let maxPScore = 0;
  const fitReasons = [];
  const mismatchReasons = [];

  // Normalize priorities (1-10 scale -> relative weights)
  const pPlacement = preferences.placementPriority || 5;
  const pAfford = preferences.affordabilityPriority || 5;
  const pRank = preferences.rankingPriority || 5;
  const pAcad = preferences.academicsPriority || 5;
  
  const totalP = pPlacement + pAfford + pRank + pAcad;
  const normWeights = {
    placement: pPlacement / totalP,
    affordability: pAfford / totalP,
    ranking: pRank / totalP,
    academics: pAcad / totalP
  };

  // 1. Re-weight Base Subscores (40% of personalized score)
  const baseWeights = 40;
  let availableBaseWeights = 0;
  let earnedBase = 0;

  if (subscores.placementScore !== null) {
    earnedBase += subscores.placementScore * normWeights.placement;
    availableBaseWeights += normWeights.placement;
  }
  if (subscores.affordabilityScore !== null) {
    earnedBase += subscores.affordabilityScore * normWeights.affordability;
    availableBaseWeights += normWeights.affordability;
  }
  if (subscores.rankingScore !== null) {
    earnedBase += subscores.rankingScore * normWeights.ranking;
    availableBaseWeights += normWeights.ranking;
  }
  if (subscores.academicsScore !== null) {
    earnedBase += subscores.academicsScore * normWeights.academics;
    availableBaseWeights += normWeights.academics;
  }

  const normalizedBase = availableBaseWeights > 0 ? (earnedBase / availableBaseWeights) : baseScore;
  pScore += normalizedBase * (baseWeights / 100);
  maxPScore += baseWeights;

  // 2. Budget Fit (20%)
  const budgetWeight = 20;
  if (preferences.budgetRange && preferences.budgetRange.max) {
    maxPScore += budgetWeight;
    const maxBudget = preferences.budgetRange.max;
    const fees = data.fees || [];
    const minFee = fees.length ? Math.min(...fees.map(f => f.tuitionFee || Infinity)) : null;

    if (minFee && minFee !== Infinity) {
      if (minFee <= maxBudget) {
        pScore += budgetWeight;
        fitReasons.push("Within your budget limit.");
      } else if (minFee <= maxBudget * 1.2) {
        pScore += budgetWeight * 0.5; // Slight penalty
        mismatchReasons.push("Slightly above your preferred budget.");
      } else {
        // Heavy penalty, 0 points
        mismatchReasons.push("Significantly above your preferred budget.");
      }
    } else {
      // Missing data penalty but not 0
      pScore += budgetWeight * 0.4;
    }
  }

  // 3. Location Fit (20%)
  const locWeight = 20;
  if ((preferences.preferredStates && preferences.preferredStates.length > 0) || 
      (preferences.preferredCities && preferences.preferredCities.length > 0)) {
    maxPScore += locWeight;
    let locMatch = 0;
    
    const prefStates = (preferences.preferredStates || []).map(s => s.toLowerCase());
    const prefCities = (preferences.preferredCities || []).map(c => c.toLowerCase());
    
    const cState = (college.state || "").toLowerCase();
    const cCity = (college.city || "").toLowerCase(); // Assume city might exist directly or we match state

    if (prefCities.includes(cCity)) {
      locMatch = 1;
      fitReasons.push("In your preferred city.");
    } else if (prefStates.includes(cState)) {
      locMatch = 0.8;
      fitReasons.push("In your preferred state.");
    } else {
      mismatchReasons.push("Outside your preferred locations.");
    }

    pScore += locWeight * locMatch;
  }

  // 4. Course Fit (20%)
  const courseWeight = 20;
  if (preferences.preferredCourses && preferences.preferredCourses.length > 0) {
    maxPScore += courseWeight;
    const prefCourses = preferences.preferredCourses.map(c => c.toLowerCase());
    
    const acad = data.academics || {};
    const allCourses = [...(acad.ugCourses || []), ...(acad.pgCourses || [])];
    
    let courseMatch = 0;
    for (const c of allCourses) {
      if (!c.name) continue;
      const cName = c.name.toLowerCase();
      if (prefCourses.includes(cName)) {
        courseMatch = 1;
        fitReasons.push("Offers your exact preferred course.");
        break;
      } else if (prefCourses.some(pc => cName.includes(pc) || pc.includes(cName))) {
        courseMatch = 0.6; // partial match
        fitReasons.push("Offers related courses to your preference.");
      }
    }

    if (courseMatch === 0) {
      mismatchReasons.push("Does not explicitly offer your preferred courses.");
    }

    pScore += courseWeight * courseMatch;
  }

  const finalScore = maxPScore > 0 ? Math.round((pScore / maxPScore) * 100) : baseScore;

  return {
    ...college,
    personalizedScore: finalScore,
    fitPercentage: finalScore, // synonymous
    fitReasons,
    mismatchReasons,
    confidence: college.confidence || 50
  };
}
