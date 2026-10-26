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

// For Render deployment: force plain HTTP to avoid cert issues
// Set VITE_HTTPS=0 in Render environment to disable HTTPS forcing
const FORCE_HTTP = process.env.VITE_FORCE_HTTP === "1";

const BACKEND_TARGET = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

const RECONNECT_CODES = new Set([
  'ECONNRESET',
  'ECONNABORTED',
  'EPIPE',
  'ERR_STREAM_PREMATURE_CLOSE',
  'ERR_STREAM_DESTROYED',
]);

function isReconnectNoise(err) {
  return RECONNECT_CODES.has(err?.code) ||
    /socket hang up|aborted|premature close/i.test(err?.message || '');
}

function isHttpResponse(res) {
  return typeof res?.writeHead === 'function';
}

function proxyLifecycle(label) {
  return (proxy) => {
    proxy.on('error', (err, req, res) => {
      if (isHttpResponse(res)) {
        if (!res.headersSent) {
          res.writeHead(520, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({
          success: false,
          error: 'Cannot reach the server. Check that the backend is running.',
        }));
        return;
      }
      if (typeof res?.destroy === 'function') res.destroy();
      if (isReconnectNoise(err)) {
        const now = Date.now();
        if (now - proxyLifecycle.lastLog < 30000) return;
        proxyLifecycle.lastLog = now;
        console.warn(
          `[vite] ${label} connection reset (${err.code}) �?" socket.io will reconnect. ` +
          `Target: ${BACKEND_TARGET}`
        );
        return;
      }
      console.error(`[vite] ${label} proxy error:`, err);
    });
  };
}
proxyLifecycle.lastLog = 0;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5178,
    strictPort: true,
    // Force plain HTTP to avoid SSL cert issues on Render
    // Remove the line below or set VITE_HTTPS=true in Render env to enable HTTPS
    https: FORCE_HTTP ? undefined : httpsOptions,
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        configure: proxyLifecycle('api'),
      },
      '/uploads': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        configure: proxyLifecycle('uploads'),
      },
      '/socket.io': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        ws: true,
        configure: proxyLifecycle('socket.io'),
      },
    },
  },
});