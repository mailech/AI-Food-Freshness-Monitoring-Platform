import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// dev server proxies /api and /uploads to the FastAPI backend so we don't
// have to deal with CORS while working locally
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
});
