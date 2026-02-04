import { Routes, Route, Navigate } from "react-router-dom";
import WorkSpaceLayout from "./WorkSpaceLayout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import React from "react";

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
