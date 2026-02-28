import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import {
  hasRequiredRole,
  isTokenExpired,
} from "../../utils/authToken";
import { AuthContext } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  const { token, user, loading, logout } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-9 h-9 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isTokenExpired(token)) {
    logout();
    return <Navigate to="/login" replace />;
  }

  if (!requiredRole) {
    return children;
  }

  const allowed = hasRequiredRole(user, requiredRole);

  if (!allowed) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}
