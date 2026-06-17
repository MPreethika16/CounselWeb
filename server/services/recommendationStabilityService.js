import rankDeltaAnalysisService from './rankDeltaAnalysisService.js';
import remediationImpactAuditService from './remediationImpactAuditService.js';

class RecommendationStabilityService {
  /**
   * Compute Stability Metrics (Analysis 7)
   */
  computeStabilityMetrics(rankDeltas, scoreAggregations, newlySurfaced, filtered) {
    const totalCompared = rankDeltas.length;
    let stableCount = 0;
    let significantCount = 0;
    let majorCount = 0;
    let totalRankDelta = 0;

    for (const delta of rankDeltas) {
      totalRankDelta += Math.abs(delta.rankDelta);
      if (delta.classification === 'STABLE') stableCount++;
      if (delta.classification === 'SIGNIFICANT_CHANGE') significantCount++;
      if (delta.classification === 'MAJOR_CHANGE') majorCount++;
    }

    return {
      totalCollegesCompared: totalCompared,
      stableRecommendationsPercent: totalCompared > 0 ? (stableCount / totalCompared) * 100 : 0,
      significantRankChangesPercent: totalCompared > 0 ? (significantCount / totalCompared) * 100 : 0,
      majorRankChangesPercent: totalCompared > 0 ? (majorCount / totalCompared) * 100 : 0,
      newlySurfacedColleges: newlySurfaced.length,
      filteredColleges: filtered.length,
      averageRankDelta: totalCompared > 0 ? totalRankDelta / totalCompared : 0,
      averageScoreDelta: scoreAggregations.averageScoreChange
    };
  }

  /**
   * Generate Verdict (Analysis 8)
   */
  generateIntegrityVerdict(metrics) {
    const stablePct = metrics.stableRecommendationsPercent;
    const majorPct = metrics.majorRankChangesPercent;

    if (stablePct >= 90 && majorPct < 2) {
      return 'PASS';
    } else if (stablePct < 75 || majorPct > 10) {
      return 'FAIL';
    } else {
      return 'WARNING';
    }
  }

  /**
   * Orchestrate the full audit across two snapshots.
   */
  runFullAudit(oldSnapshot, newSnapshot, topN) {
    const rankDeltas = rankDeltaAnalysisService.calculateRankDeltas(oldSnapshot, newSnapshot);
    const scoreAnalysis = rankDeltaAnalysisService.calculateScoreDeltas(oldSnapshot, newSnapshot);
    
    const newlySurfaced = remediationImpactAuditService.identifyNewlySurfacedColleges(oldSnapshot, newSnapshot, topN);
    const filtered = remediationImpactAuditService.identifyFilteredColleges(oldSnapshot, newSnapshot);
    
    const scoreDeltasMap = new Map(scoreAnalysis.deltas.map(d => [d.collegeCode, d]));
    const attributions = remediationImpactAuditService.attributeRemediationImpact(rankDeltas, scoreDeltasMap);

    const metrics = this.computeStabilityMetrics(rankDeltas, scoreAnalysis.aggregations, newlySurfaced, filtered);
    const verdict = this.generateIntegrityVerdict(metrics);

    return {
      rankDeltas,
      scoreAnalysis,
      newlySurfaced,
      filtered,
      attributions,
      metrics,
      verdict
    };
  }
}

export default new RecommendationStabilityService();
