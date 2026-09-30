import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  portalFromPathname,
  loginPathForPathname,
  dashboardPathForRole,
} from '../../utils/authStorage';

// Catch-all for unknown URLs (stale bookmarks, retired routes, typos).
// React Router renders nothing when no route matches, which shows the user a
// blank page — so send them somewhere useful instead:
//   signed in            -> their own portal dashboard
//   known portal, logged out -> that portal's login
//   anything else        -> homepage
export default function NotFound() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Still restoring the session — wait so we don't bounce a signed-in user
  // to the login page just because the auth state hasn't loaded yet.
  if (initializing) return null;

  if (user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  if (portalFromPathname(location.pathname) !== 'public') {
    return <Navigate to={loginPathForPathname(location.pathname)} replace />;
  }

  return <Navigate to="/" replace />;
}
