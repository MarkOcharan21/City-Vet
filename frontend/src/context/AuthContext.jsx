import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  portalFromPathname,
  storagePrefixForPortal,
  loginPathForPortal,
  roleMatchesPath,
  loadPortalSession,
  savePortalSession,
  clearPortalSession,
} from '../utils/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Each portal keeps its own session, so the active one is derived from the
  // URL. Re-resolving on every navigation is what keeps /veterinarian/* on the
  // veterinarian page after a refresh instead of falling back to staff.
  const portal = portalFromPathname(location.pathname);
  const storageKeyPrefix = storagePrefixForPortal(portal);

  const [user, setUser] = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  // Tracks which portal the current `user` belongs to. Until it matches, the
  // in-memory user is stale and consumers must wait.
  const [syncedPortal, setSyncedPortal] = useState(null);
  const initializing = syncedPortal !== portal;

  // Restore this portal's session from localStorage, validating the JWT.
  useEffect(() => {
    // Public pages (homepage, public pet profile, mobile scan) own no session.
    // Keep the current user instead of clearing it, so browsing them must not
    // look like being signed out.
    if (portal === 'public') {
      setSyncedPortal(portal);
      return;
    }
    const { user: restored } = loadPortalSession(portal);
    setUser(restored);
    setSessionValid(true);
    setSyncedPortal(portal);
  }, [portal]);

  // Handle 401 events fired by the api.js interceptor.
  // Uses React Router navigate() — no hard page reload, no React state wipe.
  const handleAutoLogout = useCallback(() => {
    setUser(null);
    clearPortalSession(portal);
    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    navigate(`${loginPathForPortal(portal)}?returnTo=${returnTo}&session=expired`, { replace: true });
  }, [navigate, portal]);

  useEffect(() => {
    window.addEventListener('auth:logout', handleAutoLogout);
    return () => window.removeEventListener('auth:logout', handleAutoLogout);
  }, [handleAutoLogout]);

  function login(token, userData) {
    savePortalSession(portal, token, userData);
    setUser(userData);
    setSyncedPortal(portal);
    setSessionValid(true);
  }

  function logout() {
    // Fire-and-forget the server-side LOGOUT audit event (never blocks logout)
    const token = localStorage.getItem(`${storageKeyPrefix}token`);
    if (token) {
      api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }

    clearPortalSession(portal);
    setUser(null);

    // Navigate to correct portal login after manual logout
    navigate(loginPathForPortal(portal), { replace: true });
  }

  // Legacy — kept for backward compat, now delegates to the event handler
  function autoLogout() {
    setUser(null);
    clearPortalSession(portal);
  }

  // Check if the current user's role matches the current URL path
  function validateCurrentSession() {
    if (!user) return false;
    if (!roleMatchesPath(user.role, location.pathname)) {
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
