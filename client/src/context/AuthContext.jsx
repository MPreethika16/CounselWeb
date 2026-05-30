import React, { createContext, useContext, useState, useEffect } from "react";
import { API_URL } from "../config/api";
import { getCookie, setCookie, eraseCookie } from "../utils/cookie";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncAuth = () => {
    const storedToken = getCookie("token");
    const storedUser = localStorage.getItem("user");
    setToken(storedToken || null);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem("user");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    syncAuth();
    setLoading(false);

    window.addEventListener("authChange", syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener("authChange", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setCookie("token", authToken, 7);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    eraseCookie("token");
    window.location.href = "/login";
  };

  const updateUser = (data) => {
    setUser((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const auth = useContext(AuthContext);
  if (auth === undefined || auth === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return auth;
};
