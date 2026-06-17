import { apiClient } from "./apiClient";

export const comparisonService = {
  compareColleges: async (collegeCodes) => {
    if (!collegeCodes || collegeCodes.length === 0) return [];
    const { data } = await apiClient.post("/search/compare", { collegeCodes });
    return data;
  }
};
