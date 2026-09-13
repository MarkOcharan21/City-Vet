import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ClipboardPlus,
  FileClock,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  PawPrint,
  QrCode,
  Receipt,
  Settings,
  Stethoscope,
  Syringe,
  User,
  X,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Menu,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "../components/notifications/NotificationBell";
import SimulateOfflineToggle from "../components/dev/SimulateOfflineToggle";
import { ProfileForm, PasswordForm } from "../pages/owner/OwnerSettings";

function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Inline settings modal ────────────────────────────────────
function SettingsModal({ onClose }) {
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="settings-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Account Settings"
    >
      <div className="settings-modal">
        {/* Header */}
        <div className="settings-modal-header">
          <div>
            <h2>Account Settings</h2>
            <p>Manage your profile and password.</p>
          </div>
          <button
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab selector */}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            padding: "0.85rem 1.75rem 0",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {[
            { id: "profile", label: "Profile", icon: <User size={15} /> },
            { id: "password", label: "Password", icon: <KeyRound size={15} /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                border: "none",
                borderBottom: tab === t.id ? "2px solid var(--color-primary)" : "2px solid transparent",
                background: "transparent",
                color: tab === t.id ? "var(--color-primary)" : "var(--color-text-muted)",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                marginBottom: "-1px",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="settings-modal-body">
          {tab === "profile" && (
            <>
              <p className="settings-modal-section-title">Profile Information</p>
              <ProfileForm compact onSaved={onClose} />
            </>
          )}
          {tab === "password" && (
            <>
              <p className="settings-modal-section-title">Change Password</p>
              <PasswordForm onSaved={onClose} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────
export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();

  const [showLogOutModal,  setShowLogOutModal]  = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const firstName =
    (user?.full_name || user?.name || "").split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Pet Owner";

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

      {/* Sidebar */}
      <aside className={`sidebar${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}>
        <div className="sidebar-header">
          <h2>Pet Owner Portal</h2>

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
          <NavLink to="/owner/dashboard" onClick={() => setMobileOpen(false)}>
            <LayoutDashboard size={16} />
            <span className="sidebar-label">Dashboard</span>
          </NavLink>

          <NavLink to="/owner/register-pet" onClick={() => setMobileOpen(false)}>
            <ClipboardPlus size={16} />
            <span className="sidebar-label">Pet Registration</span>
          </NavLink>

          <NavLink to="/owner/drafts" onClick={() => setMobileOpen(false)}>
            <FileClock size={16} />
            <span className="sidebar-label">Draft Registration</span>
          </NavLink>

          <NavLink to="/owner/my-pets" onClick={() => setMobileOpen(false)}>
            <PawPrint size={16} />
            <span className="sidebar-label">My Pets</span>
          </NavLink>

          <NavLink to="/owner/qr-records" onClick={() => setMobileOpen(false)}>
            <QrCode size={16} />
            <span className="sidebar-label">QR Records</span>
          </NavLink>

          <NavLink to="/owner/vaccinations" onClick={() => setMobileOpen(false)}>
            <Syringe size={16} />
            <span className="sidebar-label">Vaccine History</span>
          </NavLink>

          <NavLink to="/owner/clinical-medicine" onClick={() => setMobileOpen(false)}>
            <Stethoscope size={16} />
            <span className="sidebar-label">Consultation and Medication</span>
          </NavLink>

          <NavLink to="/owner/payment-history" onClick={() => setMobileOpen(false)}>
            <Receipt size={16} />
            <span className="sidebar-label">Payment History</span>
          </NavLink>

          <NavLink to="/owner/record-requests" onClick={() => setMobileOpen(false)}>
            <FileSearch size={16} />
            <span className="sidebar-label">Request Records</span>
          </NavLink>

          <NavLink to="/owner/settings" onClick={() => setMobileOpen(false)}>
            <Settings size={16} />
            <span className="sidebar-label">Settings</span>
          </NavLink>
        </nav>

        <button
          className="logout-btn"
          onClick={() => setShowLogOutModal(true)}
        >
          <LogOut size={16} />
          <span className="sidebar-label">Logout</span>
        </button>
      </aside>

      {/* Content */}
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

            {/* Gear / Settings button */}
            <button
              type="button"
              className="topbar-gear-btn"
              onClick={() => setShowSettingsModal(true)}
              aria-label="Open account settings"
              title="Account Settings"
            >
              <Settings size={18} />
            </button>

            <NotificationBell />
          </div>
        </header>

        <Outlet />
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Dev-only connectivity demo toggle */}
      {import.meta.env.DEV && <SimulateOfflineToggle />}

      {/* Logout Modal */}
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
