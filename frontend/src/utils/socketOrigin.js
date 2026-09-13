export function getSocketOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || '';

  if (apiUrl.startsWith('http')) {
    return apiUrl.replace(/\/api\/?$/, '');
  }

  return window.location.origin;
}
