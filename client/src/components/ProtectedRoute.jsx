import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, roles, allowGuest }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    if (allowGuest) return children;
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === 'institution') return <Navigate to="/institution-dashboard" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
