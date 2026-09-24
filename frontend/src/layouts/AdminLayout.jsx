import { NavLink, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutGrid,
  MapPinned,
  Users,
  ClipboardList,
  Route,
  BarChart3,
  Megaphone,
  FileText,
  Package,
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

function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  const firstName =
    (user?.full_name || user?.name || "").split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Admin";

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
          <h2>Admin Portal</h2>

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
          <NavLink to="/admin/overview" onClick={() => setMobileOpen(false)}>
            <LayoutGrid size={16} />
            <span className="sidebar-label">Admin Dashboard</span>
          </NavLink>

          <NavLink to="/admin/barangay-dashboard" onClick={() => setMobileOpen(false)}>
            <MapPinned size={16} />
            <span className="sidebar-label">Barangay Dashboard</span>
          </NavLink>

          <NavLink to="/admin/users" onClick={() => setMobileOpen(false)}>
            <Users size={16} />
            <span className="sidebar-label">User Directory</span>
          </NavLink>

          <NavLink to="/admin/registration-records" onClick={() => setMobileOpen(false)}>
            <ClipboardList size={16} />
            <span className="sidebar-label">Registration Records</span>
          </NavLink>

          <NavLink to="/admin/traceability" onClick={() => setMobileOpen(false)}>
            <Route size={16} />
            <span className="sidebar-label">Traceability</span>
          </NavLink>

          <NavLink to="/admin/analytics" onClick={() => setMobileOpen(false)}>
            <BarChart3 size={16} />
            <span className="sidebar-label">Analytics & Reports</span>
          </NavLink>

          <NavLink to="/admin/announcements" onClick={() => setMobileOpen(false)}>
            <Megaphone size={16} />
            <span className="sidebar-label">Announcements</span>
          </NavLink>

          <NavLink to="/admin/activity-audit-trail" onClick={() => setMobileOpen(false)}>
            <FileText size={16} />
            <span className="sidebar-label">Activity &amp; Audit Trail</span>
          </NavLink>

          <NavLink to="/admin/catalog" onClick={() => setMobileOpen(false)}>
            <Package size={16} />
            <span className="sidebar-label">Product Catalog</span>
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
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}