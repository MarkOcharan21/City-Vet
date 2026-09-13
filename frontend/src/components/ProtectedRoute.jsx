import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Returns the correct login path based on the URL the user is trying to visit
function getLoginPath(pathname) {
  if (pathname.startsWith('/staff') || pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin')) return '/admin/login';
    return '/staff/login';
  }
  return '/owner/login';
}

// Returns the correct dashboard path for a given role
function getDashboardPath(role) {
  if (role === 'Admin') return '/admin/overview';
  if (role === 'Staff' || role === 'Veterinarian') return '/staff/dashboard';
  return '/owner/dashboard';
}

// Checks if the current URL path is compatible with the user's role
function pathMatchesRole(pathname, role) {
  if (pathname.startsWith('/admin')) return role === 'Admin';
  if (pathname.startsWith('/staff')) return role === 'Staff' || role === 'Veterinarian';
  if (pathname.startsWith('/owner')) return role === 'Owner';
  return true; // Public paths
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, initializing } = useAuth();

  // Still reading localStorage — render nothing to avoid flash-redirect
  if (initializing) return null;

  // No user logged in — redirect to the correct login page
  if (!user) {
    const pathname = window.location.pathname;
    const loginPath = getLoginPath(pathname);

    // Pass the full current path as ?returnTo= so login can redirect back
    const returnTo = encodeURIComponent(pathname + window.location.search);
    return <Navigate to={`${loginPath}?returnTo=${returnTo}`} replace />;
  }

  // Check if the user's role is allowed for this route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but wrong role — send to their correct portal
    const dashboardPath = getDashboardPath(user.role);
    return <Navigate to={dashboardPath} replace />;
  }

  // CRITICAL FIX: Check if the user's role matches the current URL path
  // This prevents the "wrong portal" issue when refreshing with a token from another role
  const currentPath = window.location.pathname;
  if (!pathMatchesRole(currentPath, user.role)) {
    // User is on the wrong portal path — redirect to their correct dashboard
    const dashboardPath = getDashboardPath(user.role);
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
}
