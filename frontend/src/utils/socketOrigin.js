export function getSocketOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || '';

  if (apiUrl.startsWith('http')) {
    return apiUrl.replace(/\/api\/?$/, '');
  }

  return window.location.origin;
}

export function getSocketAuthToken() {
  const path = window.location.pathname;
  const hostname = window.location.hostname;
  let prefix = `public_${hostname}_`;

  if (path.startsWith('/admin')) {
    prefix = `admin_${hostname}_`;
  } else if (path.startsWith('/staff') || path.startsWith('/veterinarian')) {
    prefix = `clinic_${hostname}_`;
  } else if (path.startsWith('/owner')) {
    prefix = `owner_${hostname}_`;
  }

  const token = localStorage.getItem(`${prefix}token`);
  if (token) return token;

  if (prefix.startsWith('clinic_')) {
    return localStorage.getItem(`staff_${hostname}_token`);
  }

  return null;
}
