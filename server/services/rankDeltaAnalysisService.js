class RankDeltaAnalysisService {
  /**
   * Calculate rank deltas between old and new recommendations.
   * @param {Array} oldSnapshot 
   * @param {Array} newSnapshot 
   * @returns {Array} List of rank deltas with classification
   */
  calculateRankDeltas(oldSnapshot, newSnapshot) {
    const oldRanks = new Map(oldSnapshot.map(r => [r.collegeCode, r.rank]));
    const deltas = [];

    for (const newRec of newSnapshot) {
      if (oldRanks.has(newRec.collegeCode)) {
        const oldRank = oldRanks.get(newRec.collegeCode);
        const newRank = newRec.rank;
        const rankDelta = oldRank - newRank; // Positive means rank improved (smaller number)

        let classification = 'MAJOR_CHANGE';
        const absDelta = Math.abs(rankDelta);
        
        if (absDelta <= 5) {
          classification = 'STABLE';
        } else if (absDelta <= 20) {
          classification = 'MINOR_CHANGE';
        } else if (absDelta <= 50) {
          classification = 'SIGNIFICANT_CHANGE';
        }

        deltas.push({
          collegeCode: newRec.collegeCode,
          oldRank,
          newRank,
          rankDelta,
          classification
        });
      }
    }
    return deltas;
  }

  /**
   * Calculate score deltas between old and new recommendations.
   * @param {Array} oldSnapshot 
   * @param {Array} newSnapshot 
   * @returns {Object} Score deltas and aggregations
   */
  calculateScoreDeltas(oldSnapshot, newSnapshot) {
    const oldScores = new Map(oldSnapshot.map(r => [r.collegeCode, r.score]));
    const deltas = [];

    let maxIncrease = 0;
    let maxDecrease = 0;
    let totalDelta = 0;

    for (const newRec of newSnapshot) {
      if (oldScores.has(newRec.collegeCode)) {
        const oldScore = oldScores.get(newRec.collegeCode);
        const newScore = newRec.score;
        const scoreDelta = newScore - oldScore;

        deltas.push({
          collegeCode: newRec.collegeCode,
          oldScore,
          newScore,
          scoreDelta
        });

        totalDelta += scoreDelta;
        if (scoreDelta > maxIncrease) maxIncrease = scoreDelta;
        if (scoreDelta < maxDecrease) maxDecrease = scoreDelta;
      }
    }

    // Calculate Average and Median
    const count = deltas.length;
    const avgScoreChange = count > 0 ? totalDelta / count : 0;
    
    // Sort to find median
    const sortedDeltas = [...deltas].sort((a, b) => a.scoreDelta - b.scoreDelta);
    let medianScoreChange = 0;
    if (count > 0) {
      const mid = Math.floor(count / 2);
      medianScoreChange = count % 2 !== 0 ? sortedDeltas[mid].scoreDelta : (sortedDeltas[mid - 1].scoreDelta + sortedDeltas[mid].scoreDelta) / 2;
    }

    return {
      deltas,
      aggregations: {
        averageScoreChange: avgScoreChange,
        medianScoreChange,
        maxIncrease,
        maxDecrease
      }
    };
  }
}

export default new RankDeltaAnalysisService();
