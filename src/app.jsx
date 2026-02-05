import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppRouter from "./route.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex h-full min-h-screen flex-col bg-transparent">
          <div className="flex flex-1 flex-col min-h-0">
            <AppRouter />
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
