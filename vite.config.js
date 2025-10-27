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
      strategies: "generateSW",
      outDir: "dist",
      manifest: {
        name: "S-Forecast",
        short_name: "SForecast",
        description: "Adaptive Navier–Riemann Hybrid Weather Rhythm App",
        theme_color: "#0a84ff",
        background_color: "#f7f7f7",
        display: "standalone",
        start_url: "/?v=3.0",
        scope: "/",
        version: "3.0.0-refresh", // ✅ 캐시 강제 무효화용
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "s-forecast-v3-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: "module"
      }
    })
  ]
});
