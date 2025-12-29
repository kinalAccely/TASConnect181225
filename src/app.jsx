import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./route.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-full min-h-screen flex-col bg-transparent">
        <div className="flex flex-1 flex-col min-h-0">
          <AppRouter />
        </div>
      </div>
    </BrowserRouter>
  );
}
