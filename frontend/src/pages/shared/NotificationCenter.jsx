import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Search,
  Bell,
  Trash2,
  CheckCircle,
  Megaphone,
  Syringe,
  FileText,
  Settings,
} from "lucide-react";
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

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(getSocketOrigin(), {
      transports: ["websocket", "polling"],
      reconnection: true,
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
    });

    socket.on("notification-removed", () => {
      loadNotifications();
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.disconnect();
    };
  }, [user?.id]);

  async function loadNotifications() {
    try {
      const res = await api.get("/notifications");

      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);

      toast.error("Unable to load notifications.");
    }
  }

  async function markAsRead(id) {
    try {
      await api.put(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                is_read: 1,
              }
            : item
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
          .map((n) =>
            api.put(`/notifications/${n.id}/read`)
          )
      );

      loadNotifications();

      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteNotification(id) {
    if (!window.confirm("Delete this notification?")) return;

    try {
      await api.delete(`/notifications/${id}`);

      setNotifications((prev) =>
        prev.filter((n) => n.id !== id)
      );

      toast.success("Notification deleted.");
    } catch (err) {
      console.error(err);
    }
  }

  async function clearAll() {
    if (!window.confirm("Clear all notifications?")) return;

    try {
      await api.delete("/notifications");

      setNotifications([]);

      toast.success("All notifications deleted.");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNotificationClick(item) {
    if (item.is_read === 0) {
      await markAsRead(item.id);
    }

    const path = getNotificationPath(user?.role, item);
    if (path) {
      navigate(path);
    }
  }

  function getIcon(type) {
    switch (type) {
      case "Announcement":
        return <Megaphone size={22} color="#2563EB" />;

      case "Vaccination":
        return <Syringe size={22} color="#16A34A" />;

      case "Record Request":
        return <FileText size={22} color="#9333EA" />;

      default:
        return <Settings size={22} color="#6B7280" />;
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const keyword =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.message.toLowerCase().includes(search.toLowerCase());

      if (!keyword) return false;

      if (filter === "Unread")
        return item.is_read === 0;

      if (filter === "Read")
        return item.is_read === 1;

      if (filter === "Announcement")
        return item.type === "Announcement";

      if (filter === "Vaccination")
        return item.type === "Vaccination";

      if (filter === "Request")
        return item.type === "Record Request";

      return true;
    });
  }, [notifications, search, filter]);

  return (
    <div className="page-container">

      <h1>Notification Center</h1>

      {/* Toolbar */}

      <div
        style={{
          display: "flex",
          gap: 15,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            position: "relative",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              color: "#777",
            }}
          />

          <input
            className="form-control"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              paddingLeft: 40,
            }}
          />
        </div>

        <select
          className="form-control"
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
          style={{
            width: 180,
          }}
        >
          <option>All</option>
          <option>Unread</option>
          <option>Read</option>
          <option>Announcement</option>
          <option>Vaccination</option>
          <option>Request</option>
        </select>

        <button
          className="secondary-btn"
          onClick={markAllAsRead}
        >
          <CheckCircle size={16} />

          Mark All Read
        </button>

        <button
          className="danger-btn"
          onClick={clearAll}
        >
          <Trash2 size={16} />

          Clear All
        </button>
      </div>

      {/* List */}

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {filteredNotifications.length === 0 ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "#777",
            }}
          >
            <Bell size={50} />

            <h3>No Notifications Found.</h3>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              style={{
                display: "flex",
                gap: 15,
                padding: 20,
                borderBottom: "1px solid #eee",
                background:
                  item.is_read === 0
                    ? "#EFF6FF"
                    : "#fff",
                cursor: "pointer",
              }}
            >
              <div>
                {getIcon(item.type)}
              </div>

              <div
                style={{
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <strong>{item.title}</strong>

                  {!item.is_read && (
                    <span
                      style={{
                        color: "#2563EB",
                        fontWeight: 600,
                      }}
                    >
                      Unread
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: "8px 0",
                  }}
                >
                  {item.message}
                </p>

                <small
                  style={{
                    color: "#777",
                  }}
                >
                  {new Date(
                    item.created_at
                  ).toLocaleString()}
                </small>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {!item.is_read && (
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      markAsRead(item.id)
                    }
                  >
                    <CheckCircle size={16} />
                  </button>
                )}

                <button
                  className="danger-btn"
                  onClick={() =>
                    deleteNotification(item.id)
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}