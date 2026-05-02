import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        manifest: {
          name: "Altasmim Project Tracker",
          short_name: "Altasmim",
          description:
            "A professional project and employee payment tracking application.",
          theme_color: "#0D47A1",
          background_color: "#F5F9FD",
          display: "standalone",
          orientation: "portrait",
          icons: [
            {
              src: "https://placehold.jp/dc2626/ffffff/192x192.png?text=AE",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "https://placehold.jp/dc2626/ffffff/512x512.png?text=AE",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "https://placehold.jp/dc2626/ffffff/512x512.png?text=AE",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
