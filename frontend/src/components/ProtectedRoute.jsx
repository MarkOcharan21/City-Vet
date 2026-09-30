import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginPathForPathname, dashboardPathForRole, roleMatchesPath } from '../utils/authStorage';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Still reading localStorage — render nothing to avoid flash-redirect
  if (initializing) return null;

  const pathname = location.pathname;

  // No user logged in — redirect to the correct login page
  if (!user) {
    const loginPath = loginPathForPathname(pathname);

    // Pass the full current path as ?returnTo= so login can redirect back
    const returnTo = encodeURIComponent(pathname + location.search);
    return <Navigate to={`${loginPath}?returnTo=${returnTo}`} replace />;
  }

  // Check if the user's role is allowed for this route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but wrong role — send to their correct portal
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  // Check if the user's role matches the current URL path
  // This prevents the "wrong portal" issue when refreshing with a token from another role
  if (!roleMatchesPath(user.role, pathname)) {
    // User is on the wrong portal path — redirect to their correct dashboard
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return children;
}
