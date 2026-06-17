import React, { createContext, useState, useEffect } from "react";
import { apiClient } from "../services/apiClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Re-hydrate session on mount
    const loadSession = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const { data } = await apiClient.get("/auth/profile");
          setUser(data.user);
        } catch (error) {
          console.error("Session rehydration failed", error);
        }
      }
      setLoading(false);
    };
    loadSession();
  }, []);

  const login = async (email, password) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    
    // Fetch profile
    const profileRes = await apiClient.get("/auth/profile");
    setUser(profileRes.data.user);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
