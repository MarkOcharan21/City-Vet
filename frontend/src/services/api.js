import axios from 'axios';

const api = axios.create({
  // A relative URL lets Vite proxy requests when the app is opened from another
  // device on the local network. An explicit VITE_API_URL still takes precedence.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // Fail hung requests so the offline-draft flow detects connectivity loss
  // promptly instead of waiting on the browser/OS default connect timeout.
  timeout: 15000,
});

// Helper function to get storage key prefix based on URL path (same as AuthContext)
function getStorageKeyPrefix() {
  const path = window.location.pathname;
  const hostname = window.location.hostname;
  
  if (path.startsWith('/admin')) return `admin_${hostname}_`;
  if (path.startsWith('/staff')) return `staff_${hostname}_`;
  if (path.startsWith('/owner')) return `owner_${hostname}_`;
  return `public_${hostname}_`;
}

api.interceptors.request.use((config) => {
  const storageKeyPrefix = getStorageKeyPrefix();
  const token = localStorage.getItem(`${storageKeyPrefix}token`);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Bypass ngrok free-tier interstitial warning page on browser requests.
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

// Tolerate transient tunnel/network glitches by retrying failed requests a few
// times with a short backoff before surfacing the error to the caller.
const MAX_RETRIES = 5;

function shouldRetry(error, attempt) {
  if (attempt >= MAX_RETRIES) return false;
  if (!error.response) return true; // network-layer failure (tunnel drop, DNS, timeout)
  // A 2xx that was dropped mid-body (free tunnels abort large payloads) surfaces
  // as an empty response — retry it too, the next attempt usually completes.
  if (error.response.status >= 200 && error.response.status < 300) return true;
  return error.response.status >= 500 || error.response.status === 408 ||
    error.response.status === 429;
}

api.interceptors.response.use(
  (response) => {
    window.dispatchEvent(new CustomEvent('api:network-online'));
    return response;
  },
  (error) => {
    const config = error.config || {};
    config.retryCount = config.retryCount || 0;
    const requestMethod = String(error.config?.method || 'get').toUpperCase();
    const isRetryableIdempotent = ['GET', 'PUT', 'DELETE'].includes(requestMethod);
    if (isRetryableIdempotent && !config._retried && shouldRetry(error, config.retryCount)) {
      config._retried = true;
      config.retryCount += 1;
      const delay = 700 * config.retryCount;
      return new Promise((resolve) => setTimeout(resolve, delay))
        .then(() => api.request(config));
    }
    if (!error.response) {
      // Network-layer failure (offline, DNS, timeout, server down) — notify the
      // offline-draft flow so it can keep the pre-registration data safe.
      window.dispatchEvent(new CustomEvent('api:network-offline'));
    }
    if (error.response?.status === 401) {
      const storageKeyPrefix = getStorageKeyPrefix();
      const token = localStorage.getItem(`${storageKeyPrefix}token`);
      if (token) {
        localStorage.removeItem(`${storageKeyPrefix}token`);
        localStorage.removeItem(`${storageKeyPrefix}user`);
        window.dispatchEvent(new CustomEvent('auth:logout', {
          detail: { reason: 'expired' },
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
