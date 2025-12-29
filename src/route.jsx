import { Routes, Route , Navigate } from "react-router-dom";
import WorkSpaceLayout from "./WorkSpaceLayout.jsx";
import React from "react";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/chat" element={<WorkSpaceLayout />} />
      <Route path="/chat/:chatId" element={<WorkSpaceLayout />} />
    </Routes>
  );
}

export default AppRoutes;
