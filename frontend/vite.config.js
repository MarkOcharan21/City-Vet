import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(__dirname, "certs");

function httpsConfig() {
  try {
    return {
      key: fs.readFileSync(path.join(certDir, "vite-key.pem")),
      cert: fs.readFileSync(path.join(certDir, "vite.pem")),
    };
  } catch (err) {
    console.warn("[vite] certs not found, serving plain HTTP:", err.message);
    return undefined;
  }
}

const httpsOptions = httpsConfig();

export default defineConfig({
  plugins: [react()],
    server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5178,
    strictPort: false,
    // HTTPS by default (self-signed certs). Falls back to plain HTTP only when
    // the local certs are missing. Force plain HTTP with VITE_HTTPS=0.
    https: process.env.VITE_HTTPS === "0" ? undefined : httpsOptions,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});