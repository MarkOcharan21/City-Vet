import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Eye, Megaphone, UserRound, X } from "lucide-react";
import { io } from "socket.io-client";
import api from "../../services/api";
import { getSocketOrigin } from "../../utils/socketOrigin";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const AUDIENCE_LABELS = { All: "All Users", Owner: "Pet Owners", Staff: "Clinic Staff", Veterinarian: "Veterinarians", Admin: "Administrators" };
const VISIBLE_LIMIT = 3;

export default function AnnouncementWidget() {
  const [searchParams] = useSearchParams();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const highlightId = searchParams.get("highlight");

  async function loadAnnouncements() {
    try {
      const { data } = await api.get("/announcements");
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
    const socket = io(getSocketOrigin());
    socket.on("announcement-posted", loadAnnouncements);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!highlightId || loading || !announcements.length) return;
    const timer = setTimeout(() => {
      const element = document.getElementById(`announcement-${highlightId}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("announcement-widget__highlight");
      setTimeout(() => element.classList.remove("announcement-widget__highlight"), 2200);
    }, 250);
    return () => clearTimeout(timer);
  }, [highlightId, loading, announcements]);

  const visible = showAll ? announcements : announcements.slice(0, VISIBLE_LIMIT);
  const detail = useMemo(() => viewing && (announcements.find((item) => item.id === viewing.id) || viewing), [announcements, viewing]);
  const hiddenCount = announcements.length - VISIBLE_LIMIT;
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <section className="announcement-widget" aria-label="Announcements">
      <header className="announcement-widget__header">
        <div className="announcement-widget__heading">
          <span className="announcement-widget__heading-icon"><Megaphone size={20} /></span>
          <div><p>City Veterinary Office</p><h2>Latest Announcements</h2></div>
        </div>
        {!loading && !!announcements.length && <span className="announcement-widget__count">{announcements.length} update{announcements.length === 1 ? "" : "s"}</span>}
      </header>

      {loading ? <div className="announcement-widget__state">Loading announcements...</div> : announcements.length === 0 ? (
        <div className="announcement-widget__empty"><span><Megaphone size={30} /></span><div><h3>No announcements yet</h3><p>Official clinic updates will appear here.</p></div></div>
      ) : <>
        <div className="announcement-widget__list">
          {visible.map((item) => <article className="announcement-widget__card" key={item.id} id={`announcement-${item.id}`}>
            <div className="announcement-widget__content">
              <div className="announcement-widget__meta"><span className="announcement-widget__audience">{AUDIENCE_LABELS[item.audience] || item.audience}</span><span><CalendarDays size={13} />{formatDate(item.created_at)}</span></div>
              <h3>{item.title}</h3>
              <p className="announcement-widget__message">{item.message}</p>
              <footer className="announcement-widget__footer"><span><UserRound size={13} />{item.created_by_name || "City Veterinary Office"}</span><button type="button" onClick={() => setViewing(item)}>View details <Eye size={14} /></button></footer>
            </div>
          </article>)}
        </div>
        {hiddenCount > 0 && <button type="button" className="announcement-widget__toggle" onClick={() => setShowAll(!showAll)}>{showAll ? "Show less" : `View ${hiddenCount} more announcement${hiddenCount === 1 ? "" : "s"}`}</button>}
      </>}

      {detail && <div className="announcement-detail-overlay" onClick={() => setViewing(null)} role="presentation"><section className="announcement-detail-modal" role="dialog" aria-modal="true" aria-label={detail.title} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="announcement-detail-modal__close" onClick={() => setViewing(null)} aria-label="Close announcement details"><X size={18} /></button>
        {detail.image ? <img className="announcement-detail-modal__image" src={resolveMediaUrl(detail.image)} alt={detail.title} /> : <div className="announcement-detail-modal__placeholder"><Megaphone size={34} /></div>}
        <span className="announcement-widget__audience">{AUDIENCE_LABELS[detail.audience] || detail.audience}</span><h2>{detail.title}</h2><p className="announcement-detail-modal__message">{detail.message}</p>
        <footer><span><UserRound size={14} />{detail.created_by_name || "City Veterinary Office"}</span><span><CalendarDays size={14} />Posted {formatDate(detail.created_at)}</span></footer>
      </section></div>}
    </section>
  );
}
