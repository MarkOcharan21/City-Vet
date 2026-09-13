export function getBackendOrigin() {
  if (import.meta.env.VITE_API_ORIGIN) {
    return import.meta.env.VITE_API_ORIGIN.replace(/\/$/, "");
  }

  const apiUrl = import.meta.env.VITE_API_URL || "/api";

  if (apiUrl.startsWith("http://") || apiUrl.startsWith("https://")) {
    return apiUrl.replace(/\/api\/?$/, "");
  }

  // Vite dev proxy: REST uses /api; sockets can use the same origin.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
}

export function resolveMediaUrl(path, fallback) {
  if (!path) return fallback ?? null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const apiUrl = import.meta.env.VITE_API_URL || "/api";

  if (apiUrl.startsWith("/")) {
    return path;
  }

  return `${apiUrl.replace(/\/api\/?$/, "")}${path}`;
}
