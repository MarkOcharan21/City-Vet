import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Megaphone } from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import useMinLoading from "../../hooks/useMinLoading";
import AnnouncementCard from "../../components/announcements/AnnouncementCard";

import { getSocketOrigin } from "../../utils/socketOrigin";

const API_ORIGIN = getSocketOrigin();

export default function Announcements() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoading(loading);

  async function loadAnnouncements() {
    try {
      const res = await api.get("/announcements");
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error(err);
      toast.error("Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();

    const socket = io(API_ORIGIN);
    socket.on("announcement-posted", loadAnnouncements);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!highlightId || loading) return;

    const timer = setTimeout(() => {
      const element = document.getElementById(`announcement-${highlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [highlightId, loading, announcements]);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: "var(--color-primary-tint)", color: "var(--color-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Megaphone size={22} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Clinic Announcements</h1>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>
            Official notices from the City Veterinary Office.
          </p>
        </div>
      </div>

      {showLoading ? (
        <LoadingSpinner text="Loading announcements…" fullPage={false} />
      ) : announcements.length === 0 ? (
        <div style={{
          background: "var(--color-card)", padding: "48px 24px",
          borderRadius: 14, textAlign: "center", color: "var(--color-text-muted)",
          border: "1px dashed var(--color-border)",
        }}>
          <Megaphone size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>No announcements yet</p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>
            Check back later for updates from the clinic.
          </p>
        </div>
      ) : (
        /* showAudience=true so staff can see which audience each post targets */
        announcements.map((item) => (
          <AnnouncementCard
            key={item.id}
            item={item}
            showAudience
            highlighted={String(item.id) === String(highlightId)}
          />
        ))
      )}
    </div>
  );
}
