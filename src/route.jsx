import { Routes, Route, Navigate } from "react-router-dom";
import WorkSpaceLayout from "./WorkSpaceLayout.jsx";
import Login from "./Login.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
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
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<Navigate to="/chat" replace />} />
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
