import React, { type JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While auth is hydrating (e.g., checking token, calling /auth/me),
  // render a lightweight loading state to prevent redirect loops.
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <p className="text-sm text-stone-600">Checking authentication...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login and remember the intended destination
  // so the app can navigate back after successful login.
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
