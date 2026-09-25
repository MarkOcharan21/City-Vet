import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  Syringe,
  Stethoscope,
  Pill,
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

function fmtDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VeterinarianLayout() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const firstName =
    (user?.full_name || user?.name || "").split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Veterinarian";

  const handleLogout = () => {
    sessionStorage.removeItem("staff_check_in_name");
    sessionStorage.removeItem("staff_check_in_time");
    logout();
  };

  return (
    <div className="portal-layout">
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}>
        <div className="sidebar-header">
          <h2>Veterinarian Portal</h2>
          <button
            type="button"
            className="sidebar-toggle-btn sidebar-desktop-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
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
          <NavLink to="/veterinarian/dashboard" onClick={() => setMobileOpen(false)}>
            <LayoutDashboard size={16} />
            <span className="sidebar-label">Dashboard</span>
          </NavLink>
          <NavLink to="/veterinarian/queue" onClick={() => setMobileOpen(false)}>
            <ListChecks size={16} />
            <span className="sidebar-label">Walk-in Queue</span>
          </NavLink>
          <NavLink to="/veterinarian/pet-records" onClick={() => setMobileOpen(false)}>
            <ClipboardList size={16} />
            <span className="sidebar-label">Pet Records</span>
          </NavLink>
          <NavLink to="/veterinarian/clinical-records" onClick={() => setMobileOpen(false)}>
            <Stethoscope size={16} />
            <span className="sidebar-label">Consultation Records</span>
          </NavLink>
          <NavLink to="/veterinarian/medicine-records" onClick={() => setMobileOpen(false)}>
            <Pill size={16} />
            <span className="sidebar-label">Medicine Records</span>
          </NavLink>
          <NavLink to="/veterinarian/vaccination-monitoring" onClick={() => setMobileOpen(false)}>
            <Syringe size={16} />
            <span className="sidebar-label">Vaccination Records</span>
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
    </div>
  );
}
