import axios from 'axios';

const api = axios.create({
  // A relative URL lets Vite proxy requests when the app is opened from another
  // device on the local network. An explicit VITE_API_URL still takes precedence.
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
  return config;
});

api.interceptors.response.use(
  (response) => {
    window.dispatchEvent(new CustomEvent('api:network-online'));
    return response;
  },
  (error) => {
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
