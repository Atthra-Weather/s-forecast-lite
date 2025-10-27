import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ PWA 서비스 워커 등록 (Vercel 호환 버전)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")  // ✅ 꼭 이렇게 (service-worker.js ❌)
      .then(() => console.log("✅ Service Worker registered"))
      .catch((err) => console.error("❌ SW registration failed:", err));
  });
}
