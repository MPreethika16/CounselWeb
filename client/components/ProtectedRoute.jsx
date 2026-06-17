import React, { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== "undefined") {
        window.location.href = "/login?redirect=" + window.location.pathname;
      }
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return children;
};

export default ProtectedRoute;
