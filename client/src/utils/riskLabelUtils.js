export const getRiskDisplayLabel = (risk) => {
  if (risk === "Dream") return "Competitive Colleges";
  if (risk === "Moderate") return "Best Matching Colleges";
  if (risk === "Safe") return "Backup Colleges";
  // Add backward compatibility/flexibility just in case
  if (risk === "Competitive") return "Competitive Colleges";
  if (risk === "BestMatch") return "Best Matching Colleges";
  if (risk === "Backup") return "Backup Colleges";
  return risk;
};

export const getRiskShortLabel = (risk) => {
  if (risk === "Dream") return "Competitive";
  if (risk === "Moderate") return "Best Match";
  if (risk === "Safe") return "Backup";
  // Add backward compatibility/flexibility just in case
  if (risk === "Competitive") return "Competitive";
  if (risk === "BestMatch") return "Best Match";
  if (risk === "Backup") return "Backup";
  return risk;
};
