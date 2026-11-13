
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "STATION0_");

  return {
    plugins: [react()],

    server: {
      host: "127.0.0.1",

      proxy: {
        // ===================================
        // STATION 0 - REGISTRATION & RFID
        // ===================================
        "/api/station0": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,

          configure(proxy) {
            proxy.on("proxyReq", (proxyReq, req) => {
              const path = req.url || "";

              const isHistory =
                req.method === "GET" &&
                path.startsWith("/api/station0/registrations");

              const isRegistration =
                req.method === "POST" &&
                path.startsWith("/api/station0/register");

              const isReaderLatest =
                req.method === "GET" &&
                path.startsWith("/api/station0/reader/latest");

              if (isHistory || isRegistration) {
                proxyReq.setHeader(
                  "x-station0-token",
                  env.STATION0_API_TOKEN || ""
                );
              }

              if (isReaderLatest) {
                proxyReq.setHeader(
                  "x-reader-token",
                  env.STATION0_READER_TOKEN || ""
                );
              }
            });
          },
        },

        // ===================================
        // STATION 1 - PK STORAGE
        // ===================================
        "/api/station1": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,

          configure(proxy) {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader(
                "x-station0-token",
                env.STATION0_API_TOKEN || ""
              );
            });
          },
        },
      },
    },
  };
});
