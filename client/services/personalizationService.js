import { apiClient } from "./apiClient";

export const personalizationService = {
  getPreferences: async () => {
    const { data } = await apiClient.get("/personalization/preferences");
    return data;
  },
  updatePreferences: async (preferences) => {
    const { data } = await apiClient.put("/personalization/preferences", preferences);
    return data;
  },
  getSavedColleges: async () => {
    const { data } = await apiClient.get("/personalization/saved");
    return data;
  },
  saveCollege: async (collegeCode) => {
    const { data } = await apiClient.post("/personalization/saved", { collegeCode });
    return data;
  },
  removeSavedCollege: async (collegeCode) => {
    const { data } = await apiClient.delete(`/personalization/saved/${collegeCode}`);
    return data;
  },
  getHistory: async () => {
    const { data } = await apiClient.get("/personalization/history");
    return data;
  }
};
