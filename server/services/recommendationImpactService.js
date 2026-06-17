export const recommendationImpactService = {
  simulateScore: (collegeData, isRemediated) => {
    let baseScore = 50; // Starting baseline

    const data = isRemediated ? collegeData.remediated : collegeData.original;

    if (!data) return baseScore;

    if (data.placements && data.placements.averagePackageLPA > 0) {
      baseScore += Math.min(25, data.placements.averagePackageLPA * 2);
    }
    
    if (data.rankings && data.rankings.length > 0) {
      const topRank = Math.min(...data.rankings.map(r => r.rank));
      if (topRank < 100) baseScore += 15;
      else if (topRank < 200) baseScore += 10;
    }

    if (data.accreditation && data.accreditation.naacGrade) {
      if (data.accreditation.naacGrade.includes("A")) baseScore += 10;
    }

    return Math.min(100, Math.max(0, baseScore));
  },

  analyzeImpact: (collegeDataArray) => {
    // 1. Calculate BEFORE scores
    const beforeResults = collegeDataArray.map(c => ({
      code: c.collegeCode,
      score: recommendationImpactService.simulateScore(c, false)
    })).sort((a, b) => b.score - a.score);

    // 2. Calculate AFTER scores
    const afterResults = collegeDataArray.map(c => ({
      code: c.collegeCode,
      score: recommendationImpactService.simulateScore(c, true)
    })).sort((a, b) => b.score - a.score);

    const impactLogs = [];
    let totalChanged = 0;
    let significantChanges = 0;
    let largestRankIncrease = 0;
    let largestRankDecrease = 0;

    for (const c of collegeDataArray) {
      const bRank = beforeResults.findIndex(r => r.code === c.collegeCode) + 1;
      const aRank = afterResults.findIndex(r => r.code === c.collegeCode) + 1;
      const bScore = beforeResults.find(r => r.code === c.collegeCode).score;
      const aScore = afterResults.find(r => r.code === c.collegeCode).score;

      const rankChange = bRank - aRank; // positive means rank improved (lower number)
      
      if (bRank !== aRank || bScore !== aScore) {
        totalChanged++;
      }

      if (Math.abs(rankChange) > 20) {
        significantChanges++;
      }

      if (rankChange > largestRankIncrease) largestRankIncrease = rankChange;
      if (rankChange < largestRankDecrease) largestRankDecrease = rankChange;

      impactLogs.push({
        collegeCode: c.collegeCode,
        beforeRank: bRank,
        afterRank: aRank,
        rankChange,
        beforeScore: bScore,
        afterScore: aScore,
        flag: Math.abs(rankChange) > 20 ? "SIGNIFICANT_CHANGE" : "NORMAL"
      });
    }

    return {
      summary: {
        totalAnalyzed: collegeDataArray.length,
        totalChanged,
        significantChanges,
        largestRankIncrease,
        largestRankDecrease
      },
      impactLogs
    };
  }
};
