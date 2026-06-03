import { createContext, useContext, useState, useEffect } from "react";
import { API_URL } from "../config/api";
import { getCookie, setCookie, eraseCookie } from "../utils/cookie";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getCookie("token") || null);
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (err) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        eraseCookie("token");
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const syncAuth = () => {
    const storedToken = getCookie("token");
    const storedUser = localStorage.getItem("user");
    setToken(storedToken || null);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
        eraseCookie("token");
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
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
