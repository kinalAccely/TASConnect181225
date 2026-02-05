import { Routes, Route, Navigate } from "react-router-dom";
import WorkSpaceLayout from "./WorkSpaceLayout.jsx";
import Login from "./Login.jsx";
import React from "react";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  if (token) {
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
            <Login />
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
