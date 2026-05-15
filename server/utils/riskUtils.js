export const getEffectiveRank = (userRank, specialCategory) => {
  if (specialCategory && specialCategory !== "None") {
    return Math.round(userRank * 0.90);
  }
  return userRank;
};

export const getRiskLabel = (cutoff, effectiveRank) => {
  if (cutoff >= effectiveRank) {
    return "Safe";
  }
  if (cutoff >= effectiveRank * 0.60) {
    return "Moderate";
  }
  return "Dream";
};

export const getSpecialCategoryBonus = (specialCategory) => {
  if (specialCategory && specialCategory !== "None") {
    return 10;
  }
  return 0;
};
