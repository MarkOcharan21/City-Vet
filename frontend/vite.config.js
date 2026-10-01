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

const BACKEND_TARGET = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Socket.io clients reconnect constantly (HMR reload, tab wake, backend
// restart, tunnel drop). Every one of those tears the proxied WebSocket down
// mid-flight, and http-proxy surfaces that as an *unhandled* 'error' event ->
// "[vite] ws proxy error: read ECONNRESET". These are normal reconnects, not
// faults, so they are handled instead of thrown.
const RECONNECT_CODES = new Set([
  'ECONNRESET',   // peer closed the socket (reconnect, restart, HMR)
  'ECONNABORTED', // socket destroyed locally
  'EPIPE',        // wrote to a socket the peer already closed
  'ERR_STREAM_PREMATURE_CLOSE',
  'ERR_STREAM_DESTROYED',
]);

function isReconnectNoise(err) {
  return RECONNECT_CODES.has(err?.code) ||
    /socket hang up|aborted|premature close/i.test(err?.message || '');
}

// For the /socket.io ws proxy, http-proxy passes the raw net.Socket as the
// 3rd arg. A real http.ServerResponse has writeHead(); a socket does not.
function isHttpResponse(res) {
  return typeof res?.writeHead === 'function';
}

function proxyLifecycle(label) {
  return (proxy) => {
    proxy.on('error', (err, req, res) => {
      if (isHttpResponse(res)) {
        // HTTP proxy: fail the request cleanly instead of killing the process.
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({
          success: false,
          error: 'Cannot reach the server. Check that the backend is running.',
        }));
        return;
      }

      // WebSocket proxy: close the half-open socket so socket.io can
      // reconnect, but only report it once per cause instead of per attempt.
      if (typeof res?.destroy === 'function') res.destroy();

      if (isReconnectNoise(err)) {
        const now = Date.now();
        if (now - proxyLifecycle.lastLog < 30000) return;
        proxyLifecycle.lastLog = now;
        console.warn(
          `[vite] ${label} connection reset (${err.code}) — socket.io will reconnect. ` +
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
    // HTTPS by default (self-signed certs). Falls back to plain HTTP only when
    // the local certs are missing. Force plain HTTP with VITE_HTTPS=0.
    https: process.env.VITE_HTTPS === "0" ? undefined : httpsOptions,
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