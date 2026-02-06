import { Routes, Route, Navigate } from "react-router-dom";
import WorkSpaceLayout from "./WorkSpaceLayout.jsx";
import { isAuthenticated } from "./utils/tokenManager";
import React from "react";
import AuthPage from "./pages/AuthPage.jsx";

const ProtectedRoute = ({ children }) => {
  const isAuth = isAuthenticated();
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const isAuth = isAuthenticated();
  if (isAuth) {
    return <Navigate to="/chat" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/chat" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <WorkSpaceLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <ProtectedRoute>
            <WorkSpaceLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
