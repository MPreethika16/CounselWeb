import { useState, useCallback } from "react";
import { apiClient } from "../services/apiClient";

export const useApi = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (method, url, payload = null, params = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient({
        method,
        url,
        data: payload,
        params
      });
      setData(response.data);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.message || "An unexpected error occurred.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, error, loading, request };
};
