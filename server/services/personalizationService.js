import UserPreference from "../models/UserPreference.js";
import { getRecommendations } from "./recommendationService.js";
import { computePersonalizedScore } from "./personalizationScoringService.js";

/**
 * Gets or creates the user preference profile.
 */
export async function getPreferences(userId) {
  let prefs = await UserPreference.findOne({ userId }).lean();
  if (!prefs) {
    // Create default
    const newPrefs = new UserPreference({ userId });
    await newPrefs.save();
    prefs = newPrefs.toObject();
  }
  return prefs;
}

/**
 * Updates the user preference profile.
 */
export async function updatePreferences(userId, updates) {
  const prefs = await UserPreference.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return prefs;
}

/**
 * Fetches recommendations and applies personalization scoring.
 */
export async function getPersonalizedRecommendations(userId, filters = {}, options = {}) {
  const prefs = await getPreferences(userId);
  
  // Base recommendations
  const recs = await getRecommendations(filters, options);

  if (!recs.data || recs.data.length === 0) return recs;

  // Apply personalization
  const personalizedData = recs.data.map(college => {
    return computePersonalizedScore(college, prefs);
  });

  // Re-sort based on personalizedScore (descending)
  personalizedData.sort((a, b) => b.personalizedScore - a.personalizedScore);

  // Extract top recommended to update history (limit to first 5)
  const topRecs = personalizedData.slice(0, 5).map(c => c.collegeCode);
  await logRecommendationHistory(userId, topRecs);

  return {
    ...recs,
    data: personalizedData
  };
}

export async function saveCollege(userId, collegeCode) {
  await UserPreference.findOneAndUpdate(
    { userId },
    { $addToSet: { savedColleges: collegeCode } },
    { upsert: true }
  );
  return { success: true };
}

export async function removeSavedCollege(userId, collegeCode) {
  await UserPreference.findOneAndUpdate(
    { userId },
    { $pull: { savedColleges: collegeCode } }
  );
  return { success: true };
}

export async function getSavedColleges(userId) {
  const prefs = await getPreferences(userId);
  return prefs.savedColleges || [];
}

export async function logViewHistory(userId, collegeCode) {
  await UserPreference.findOneAndUpdate(
    { userId },
    { $push: { viewHistory: { collegeCode, viewedAt: new Date() } } },
    { upsert: true }
  );
  // Trigger async inference
  updateInferredPreferences(userId).catch(e => console.error(e));
}

export async function logRecommendationHistory(userId, collegeCodes) {
  const historyEntries = collegeCodes.map(code => ({ collegeCode: code, recommendedAt: new Date() }));
  await UserPreference.findOneAndUpdate(
    { userId },
    { $push: { recommendedHistory: { $each: historyEntries } } },
    { upsert: true }
  );
}

export async function getHistory(userId) {
  const prefs = await getPreferences(userId);
  return {
    viewHistory: prefs.viewHistory || [],
    recommendedHistory: prefs.recommendedHistory || []
  };
}

export async function getInferredPreferences(userId) {
  const prefs = await getPreferences(userId);
  return prefs.inferredPreferences || {};
}

/**
 * Simple machine learning heuristic: reads view history and determines most frequent items.
 * (In a real scenario, this would map collegeCodes back to their states/courses to infer patterns).
 */
async function updateInferredPreferences(userId) {
  const prefs = await getPreferences(userId);
  const views = prefs.viewHistory || [];
  
  if (views.length === 0) return;

  // We would normally hydrate colleges here. For mock/MVP, we'll just track frequency of codes
  // or simulate finding top traits.
  // We'll leave it as a stub that could aggregate actual college data.
  const inferred = {
    frequentlyViewedCourses: ["Mock Inferred Course"],
    frequentlyViewedStates: ["Mock Inferred State"],
    lastUpdated: new Date()
  };

  await UserPreference.updateOne(
    { userId },
    { $set: { inferredPreferences: inferred } }
  );
}
