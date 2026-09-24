import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getNotificationPath } from "../../utils/notificationRoutes";
import { getSocketOrigin } from "../../utils/socketOrigin";

function prependNotification(list, incoming) {
  if (!incoming?.id) return list;
  if (list.some((item) => item.id === incoming.id)) return list;
  return [incoming, ...list];
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  async function loadNotifications() {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
    }
  }

  const navigateToNotification = useCallback(
    (notification) => {
      const path = getNotificationPath(user?.role, notification);
      if (path) {
        navigate(path);
      }
    },
    [navigate, user?.role],
  );

  useEffect(() => {
    if (!user?.id) return;

    loadNotifications();

    const socket = io(getSocketOrigin(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    const joinRoom = () => {
      socket.emit("join-room", user.id);
    };

    socket.on("connect", joinRoom);
    if (socket.connected) {
      joinRoom();
    }

    socket.on("new-notification", (payload) => {
      if (payload?.id) {
        setNotifications((prev) => prependNotification(prev, payload));
      } else {
        loadNotifications();
      }

      const label =
        payload?.type === "Announcement"
          ? `New announcement: ${payload.title}`
          : payload?.title || "You have a new notification.";

      toast.success(label, {
        duration: 5000,
        onClick: () => {
          if (payload?.id) {
            navigateToNotification(payload);
          }
        },
      });
    });

    socket.on("announcement-posted", () => {
      loadNotifications();
    });

    socket.on("notification-removed", () => {
      loadNotifications();
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.disconnect();
    };
  }, [user?.id, navigateToNotification]);

  async function markAsRead(id) {
    try {
      await api.put(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, is_read: 1 }
            : n
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllAsRead() {
    try {
      await Promise.all(
        notifications
          .filter((n) => n.is_read === 0)
          .map((n) => api.put(`/notifications/${n.id}/read`))
      );

      await loadNotifications();
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteNotification(id) {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted.");
    } catch (err) {
      console.error(err);
    }
  }

  async function clearAll() {
    try {
      await api.delete("/notifications");
      setNotifications([]);
      toast.success("All notifications cleared.");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNotificationClick(notification) {
    if (notification.is_read === 0) {
      await markAsRead(notification.id);
    }

    setOpen(false);

    const path = getNotificationPath(user?.role, notification);
    if (path) {
      navigate(path);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case "Vaccination":
        return "💉";
      case "QR":
        return "📱";
      case "LostPet":
        return "🚨";
      case "Record":
        return "📄";
      case "Announcement":
        return "📢";
      case "Registration":
        return "🐾";
      default:
        return "🔔";
    }
  }

  const unread = notifications.filter((n) => n.is_read === 0).length;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => setOpen(!open)}
          aria-label="Notifications"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Bell size={18} color="#fff" />

          {unread > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                background: "#DC2626",
                color: "#fff",
                minWidth: 18,
                height: 18,
                borderRadius: "50%",
                fontSize: 11,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "0 4px",
                fontWeight: "600",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div
          className="notification-dropdown"
          style={{
            position: "absolute",
            right: 0,
            top: 40,
            width: 360,
            background: "var(--color-card)",
            color: "var(--color-ink)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "0 10px 25px rgba(0,0,0,.15)",
            maxHeight: 450,
            overflowY: "auto",
            zIndex: 999,
          }}
        >
          <div
            style={{
              padding: 15,
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Notifications ({notifications.length})</strong>

            <div style={{ display: "flex", gap: 10 }}>
              {unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#2563EB",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Read All
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#DC2626",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--color-text-muted)" }}>
              🔔
              <br />
              <br />
              No notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: 15,
                  borderBottom: "1px solid var(--color-border)",
                  cursor: "pointer",
                  background: n.is_read ? "var(--color-card)" : "var(--color-primary-tint)",
                }}
              >
                <strong>
                  {getNotificationIcon(n.type)} {n.title}
                </strong>

                <br />

                <small>{n.message}</small>

                <br />

                <small style={{ color: "var(--color-text-muted)" }}>
                  {new Date(n.created_at).toLocaleString()}
                </small>

                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#DC2626",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
