import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  BadgeCheck,
  FileOutput,
  Receipt,
  HandCoins,
  ShieldCheck,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "../components/notifications/NotificationBell";
import GlobalLoadingOverlay from "../components/GlobalLoadingOverlay";

function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const firstName =
    (user?.full_name || user?.name || "").split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Staff";

  // Check if staff has checked in
  useEffect(() => {
    const checkInName = sessionStorage.getItem('staff_check_in_name');
    const checkInTime = sessionStorage.getItem('staff_check_in_time');
    
    // If not checked in and not on check-in page, redirect to check-in
    if (!checkInName && location.pathname !== '/staff/check-in') {
      navigate('/staff/check-in');
    }
  }, [location.pathname, navigate]);

  // Handle logout with check-in cleanup
  const handleLogout = () => {
    // Clear check-in session
    sessionStorage.removeItem('staff_check_in_name');
    sessionStorage.removeItem('staff_check_in_time');
    logout();
  };

  return (
    <div className="portal-layout">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}>
        <div className="sidebar-header">
           <h2>Clinic Staff</h2>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            className="sidebar-toggle-btn sidebar-desktop-toggle"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            className="sidebar-toggle-btn sidebar-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav>
           <NavLink to="/staff/dashboard" onClick={() => setMobileOpen(false)}>
             <LayoutDashboard size={16} />
             <span className="sidebar-label">Dashboard</span>
           </NavLink>

           <NavLink to="/staff/pet-records" onClick={() => setMobileOpen(false)}>
            <ClipboardList size={16} />
            <span className="sidebar-label">Pet Records</span>
          </NavLink>

          <NavLink to="/staff/verify-registration" onClick={() => setMobileOpen(false)}>
            <BadgeCheck size={16} />
            <span className="sidebar-label">Verify Registration</span>
          </NavLink>

           <NavLink to="/staff/issue-records" onClick={() => setMobileOpen(false)}>
            <FileOutput size={16} />
            <span className="sidebar-label">Issue Requested Records</span>
          </NavLink>

          <NavLink to="/staff/payment-monitoring" onClick={() => setMobileOpen(false)}>
            <Receipt size={16} />
            <span className="sidebar-label">Payment Monitoring</span>
          </NavLink>

          <NavLink to="/staff/outreach-monitoring" onClick={() => setMobileOpen(false)}>
            <HandCoins size={16} />
            <span className="sidebar-label">Outreach Payment Monitoring</span>
          </NavLink>

          <NavLink to="/staff/security" onClick={() => setMobileOpen(false)}>
            <ShieldCheck size={16} />
            <span className="sidebar-label">Account Security</span>
          </NavLink>
        </nav>

        <button
          className="logout-btn"
          onClick={() => setShowLogOutModal(true)}
        >
          <LogOut size={16} />
          <span className="sidebar-label">Log Out</span>
        </button>
      </aside>

      <main className="portal-content">
        <header
          className="portal-topbar portal-topbar--hero"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              className="sidebar-hamburger-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <h1>Welcome back, {firstName}!</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="od-hero-date">{fmtDate(new Date())}</span>

            {/* Dark mode toggle button */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
          </div>
        </header>

        <Outlet />
      </main>

      {showLogOutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Confirm Logout</h3>

            <p>Are you sure you want to log out?</p>

            <div className="logout-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowLogOutModal(false)}
              >
                Cancel
              </button>

              <button
                className="confirm-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <GlobalLoadingOverlay visible={pageLoading} message="Loading dashboard..." />
    </div>
  );
}