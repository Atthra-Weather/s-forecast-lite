import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/", // ✅ 반드시 추가 (루트 기준 경로)
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      filename: "sw.js",  // ✅ 일치하게
 // ✅ 루트 이름 고정
      strategies: "generateSW",
      outDir: "dist",
      manifest: {
        name: "S-Forecast",
        short_name: "SForecast",
        description: "Adaptive Navier–Riemann Hybrid Weather Rhythm App",
        theme_color: "#0a84ff",
        background_color: "#f7f7f7",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globDirectory: "dist",
        globPatterns: ["**/*.{js,css,html,png,svg,ico,json}"]
      },
      devOptions: {
        enabled: true,
        type: "module"
      }
    })
  ]
});
