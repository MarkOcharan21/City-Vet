import { portalFromPathname, readAuthToken } from './authStorage';

export function getSocketOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || '';

  if (apiUrl.startsWith('http')) {
    return apiUrl.replace(/\/api\/?$/, '');
  }

  return window.location.origin;
}

export function getSocketAuthToken() {
  return readAuthToken(portalFromPathname(window.location.pathname));
}
