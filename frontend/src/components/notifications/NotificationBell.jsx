import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getNotificationPath } from "../../utils/notificationRoutes";
import { getSocketOrigin, getSocketAuthToken } from "../../utils/socketOrigin";
import {
  getOfflineNotifications,
  markOfflineNotificationRead,
  markAllOfflineNotificationsRead,
  deleteOfflineNotification,
  clearOfflineNotifications,
} from "../../utils/offlineDraft";

function prependNotification(list, incoming) {
  if (!incoming?.id) return list;
  if (list.some((item) => item.id === incoming.id)) return list;
  return [incoming, ...list];
}

// Merge server notifications with locally-created (offline) ones. Offline
// entries are prefixed with "local:" so they never collide with real server
// IDs, and they are dropped once the server list contains a matching title.
function isUnread(n) {
  const read = n.is_read;
  if (read === true) return false;
  return read !== 1 && read !== "1";
}

// Offline entries are scoped per account, so they can never leak into another
// user's bell. A local row is only suppressed when the server carries the SAME
// sourceKey, which identifies the same underlying draft. Matching on title
// instead would hide an unrelated server notification that happens to share a
// subject line with a saved draft.
function mergeNotifications(serverList, offlineList) {
  const serverSourceKeys = new Set(
    serverList.map((n) => n.sourceKey).filter(Boolean)
  );
  const merged = offlineList
    .filter((n) => !(n.sourceKey && serverSourceKeys.has(n.sourceKey)))
    .map((n) => ({ ...n, isLocal: true }));
  return [...merged, ...serverList];
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [offlineNotifications, setOfflineNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [popCount, setPopCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Replay the ring on every arrival. A counter drives a React `key` so the
  // node is remounted and the keyframes restart from 0 — toggling a boolean
  // class cannot do this, because two notifications arriving inside one
  // animation window would leave the className unchanged and play only once.
  const popBell = useCallback(() => {
    setPopCount((n) => n + 1);
  }, []);

  const popping = popCount > 0;
  useEffect(() => {
    if (!popCount) return undefined;
    const timer = setTimeout(() => setPopCount(0), 1100);
    return () => clearTimeout(timer);
  }, [popCount]);

  async function loadOfflineNotifications() {
    try {
      const local = await getOfflineNotifications(user?.id);
      setOfflineNotifications(local);
    } catch {
      setOfflineNotifications([]);
    }
  }

  async function loadNotifications() {
    try {
      const res = await api.get("/notifications");
      const serverList = res.data.notifications || [];
      const localList = await getOfflineNotifications(user?.id).catch(() => []);
      setOfflineNotifications(localList);
      setNotifications(mergeNotifications(serverList, localList));
    } catch (err) {
      console.error(err);
      // Offline / server unreachable — still show locally-created ones.
      const localList = await getOfflineNotifications(user?.id).catch(() => []);
      setOfflineNotifications(localList);
      setNotifications(localList);
    } finally {
      setLoaded(true);
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
      auth: { token: getSocketAuthToken() },
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

    // Reload on (re)connect so notifications that arrived while the client
    // was offline (socket down) are picked up when the connection returns.
    const handleConnect = () => {
      joinRoom();
      loadNotifications();
      loadOfflineNotifications();
    };

    socket.on("connect", handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    socket.on("new-notification", (payload) => {
      if (payload?.id) {
        setNotifications((prev) => prependNotification(prev, payload));
      } else {
        loadNotifications();
      }
      loadOfflineNotifications();

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
      loadOfflineNotifications();
    });

    socket.on("notification-removed", () => {
      loadNotifications();
      loadOfflineNotifications();
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, [user?.id, navigateToNotification, popBell]);

  async function markAsRead(id) {
    const isLocal = String(id).startsWith('local-');
    try {
      if (isLocal) {
        const realId = Number(String(id).replace('local-', ''));
        await markOfflineNotificationRead(user?.id, realId);
        setOfflineNotifications((prev) =>
          prev.map((n) => (n.id === realId ? { ...n, is_read: 1 } : n))
        );
      } else {
        await api.put(`/notifications/${id}/read`);
      }

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
      const serverUnread = notifications
        .filter((n) => isUnread(n) && !n.isLocal)
        .map((n) => api.put(`/notifications/${n.id}/read`));
      await Promise.all(serverUnread);
      await markAllOfflineNotificationsRead(user?.id);

      await loadNotifications();
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteNotification(id) {
    const isLocal = String(id).startsWith('local-');
    try {
      if (isLocal) {
        const realId = Number(String(id).replace('local-', ''));
        await deleteOfflineNotification(user?.id, realId);
        setOfflineNotifications((prev) => prev.filter((n) => n.id !== realId));
      } else {
        await api.delete(`/notifications/${id}`);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted.");
    } catch (err) {
      console.error(err);
    }
  }

  async function clearAll() {
    try {
      await api.delete("/notifications");
      await clearOfflineNotifications(user?.id);
      setOfflineNotifications([]);
      setNotifications([]);
      toast.success("All notifications cleared.");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNotificationClick(notification) {
    if (isUnread(notification)) {
      await markAsRead(notification.isLocal ? `local-${notification.id}` : notification.id);
    }

    setOpen(false);

    if (notification.isLocal) return;

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

  const unread = notifications.filter(isUnread).length;

  const prevUnreadRef = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    const prev = prevUnreadRef.current;
    if (unread > 0 && (prev === null || unread > prev)) popBell();
    prevUnreadRef.current = unread;
  }, [unread, loaded, popBell]);

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
          <Bell
            key={popCount}
            size={18}
            color="#fff"
            className={`notification-bell__icon${unread > 0 ? " has-unread" : ""}`}
          />

          {unread > 0 && (
            <span
              key={`badge-${popCount}`}
              className={`notification-bell__badge--unread${
                popping ? " is-popping" : ""
              }`}
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
            notifications.map((n) => {
              const reactKey = n.isLocal ? `local-${n.id}` : n.id;
              return (
              <div
                key={reactKey}
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
                  {n.isLocal && (
                    <span style={{
                      marginLeft: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      background: "#b8860b",
                      borderRadius: 4,
                      padding: "1px 5px",
                      verticalAlign: "middle",
                    }}>OFFLINE</span>
                  )}
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
                      deleteNotification(reactKey);
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
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
