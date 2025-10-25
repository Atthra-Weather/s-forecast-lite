import React from "react";
import ReactDOM from "react-dom/client";
import SForecastApp from "./App";
import "./App.css";   // ✅ index.css가 아니라 App.css 임 (중요)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SForecastApp />
  </React.StrictMode>
);
