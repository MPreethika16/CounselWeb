import { apiClient } from "./apiClient";

export const collegeService = {
  getCollegeDetails: async (collegeCode) => {
    const { data } = await apiClient.get(`/colleges/${collegeCode}`);
    return data;
  }
};
