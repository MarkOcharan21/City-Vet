import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

// Returns the correct login path for the current URL
function getLoginPathForCurrentUrl() {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return '/admin/login';
  if (path.startsWith('/staff')) return '/staff/login';
  return '/owner/login';
}

// Returns the storage key prefix based on the current URL path (not role)
// This avoids circular dependency - we determine prefix from URL, not from token
function getStorageKeyPrefix() {
  const path = window.location.pathname;
  const hostname = window.location.hostname;
  
  if (path.startsWith('/admin')) return `admin_${hostname}_`;
  if (path.startsWith('/staff')) return `staff_${hostname}_`;
  if (path.startsWith('/owner')) return `owner_${hostname}_`;
  return `public_${hostname}_`;
}

// Checks if a role matches the current URL path pattern
function roleMatchesPath(role, pathname) {
  if (pathname.startsWith('/admin')) return role === 'Admin';
  if (pathname.startsWith('/staff')) return role === 'Staff' || role === 'Veterinarian';
  if (pathname.startsWith('/owner')) return role === 'Owner';
  return true; // Public paths are fine
}

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  const navigate = useNavigate();

  const storageKeyPrefix = getStorageKeyPrefix();

  // Restore session from localStorage on first mount with validation
  useEffect(() => {
    const token = localStorage.getItem(`${storageKeyPrefix}token`);
    const saved = localStorage.getItem(`${storageKeyPrefix}user`);

    if (!token || isTokenExpired(token)) {
      localStorage.removeItem(`${storageKeyPrefix}token`);
      localStorage.removeItem(`${storageKeyPrefix}user`);
      setUser(null);
      setInitializing(false);
      return;
    }

    // Decode JWT to get the source-of-truth role
    const decoded = decodeToken(token);
    if (!decoded || !decoded.role) {
      // Token is malformed — clear everything
      localStorage.removeItem(`${storageKeyPrefix}token`);
      localStorage.removeItem(`${storageKeyPrefix}user`);
      setUser(null);
      setInitializing(false);
      return;
    }

    // Try to parse saved user data, safely
    let savedUser = null;
    try {
      savedUser = saved ? JSON.parse(saved) : null;
    } catch {
      // Corrupted localStorage — clear it
      localStorage.removeItem(`${storageKeyPrefix}user`);
    }

    // CRITICAL FIX: Validate that the JWT token's role matches the saved user's role
    // The JWT is the source of truth. If mismatched, rebuild the user object from the token.
    if (savedUser && savedUser.role !== decoded.role) {
      // Token says one role, saved user says another — trust the token
      savedUser = { ...savedUser, role: decoded.role };
      localStorage.setItem(`${storageKeyPrefix}user`, JSON.stringify(savedUser));
    }

    // If savedUser is null but we have a valid token, create a minimal user from the token
    if (!savedUser && decoded) {
      savedUser = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };
      localStorage.setItem(`${storageKeyPrefix}user`, JSON.stringify(savedUser));
    }

    setUser(savedUser);
    setInitializing(false);
  }, [storageKeyPrefix]);

  // Handle 401 events fired by the api.js interceptor.
  // Uses React Router navigate() — no hard page reload, no React state wipe.
  const handleAutoLogout = useCallback(() => {
    setUser(null);
    const loginPath = getLoginPathForCurrentUrl();
    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    navigate(`${loginPath}?returnTo=${returnTo}&session=expired`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('auth:logout', handleAutoLogout);
    return () => window.removeEventListener('auth:logout', handleAutoLogout);
  }, [handleAutoLogout]);

  function login(token, userData) {
    localStorage.setItem(`${storageKeyPrefix}token`, token);
    localStorage.setItem(`${storageKeyPrefix}user`, JSON.stringify(userData));
    setUser(userData);
    setSessionValid(true);
  }

  function logout() {
    // Fire-and-forget the server-side LOGOUT audit event (never blocks logout)
    const token = localStorage.getItem(`${storageKeyPrefix}token`);
    if (token) {
      api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }

    localStorage.removeItem(`${storageKeyPrefix}token`);
    localStorage.removeItem(`${storageKeyPrefix}user`);
    setUser(null);

    // Navigate to correct portal login after manual logout
    const loginPath = getLoginPathForCurrentUrl();
    navigate(loginPath, { replace: true });
  }

  // Legacy — kept for backward compat, now delegates to the event handler
  function autoLogout() {
    setUser(null);
    localStorage.removeItem(`${storageKeyPrefix}token`);
    localStorage.removeItem(`${storageKeyPrefix}user`);
  }

  // Check if the current user's role matches the current URL path
  function validateCurrentSession() {
    if (!user) return false;
    const pathname = window.location.pathname;
    if (!roleMatchesPath(user.role, pathname)) {
      setSessionValid(false);
      return false;
    }
    setSessionValid(true);
    return true;
  }

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      initializing,
      sessionValid,
      login,
      logout,
      autoLogout,
      validateCurrentSession
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
