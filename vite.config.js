import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      filename: "sw.js",
      outDir: "dist",
      strategies: "generateSW",
      manifest: {
        name: "S-Forecast",
        short_name: "SForecast",
        description: "Adaptive Navier–Riemann Hybrid Weather Rhythm App",
        theme_color: "#0a84ff",
        background_color: "#f7f7f7",
        display: "standalone",
        start_url: "/?v=3.0-refresh",
        scope: "/",
        version: "3.0-refresh", // ✅ 새 버전 추가
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        cacheId: "s-forecast-v3-cache", // ✅ 캐시명도 변경
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
