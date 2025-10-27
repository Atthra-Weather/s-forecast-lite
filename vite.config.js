import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png"
      ],
      manifest: {
        name: "S-Forecast",
        short_name: "SForecast",
        description: "Adaptive Navier–CEF Hybrid Weather Rhythm App",
        theme_color: "#0a84ff",
        background_color: "#f7f7f7",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,png,svg,ico,json}"],
      },
      devOptions: {
        enabled: true, // 개발 모드에서도 PWA 확인 가능
      },
    }),
  ],
});
