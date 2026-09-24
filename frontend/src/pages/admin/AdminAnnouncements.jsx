import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../../services/api";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import useMinLoading from "../../hooks/useMinLoading";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { getSocketOrigin } from "../../utils/socketOrigin";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Megaphone,
  Users,
  CalendarDays,
  ImagePlus,
} from "lucide-react";

const emptyForm = {
  title: "",
  message: "",
  audience: "All",
  scheduled_at: "",
};

const AUDIENCE_LABELS = {
  All: "All Users",
  Owner: "Pet Owners",
  Staff: "Clinic Staff",
  Veterinarian: "Veterinarians",
  Admin: "Administrators",
};

const VISIBLE_LIMIT = 5;

export default function AdminAnnouncements() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoading(loading);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const imageInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const formCardRef = useRef(null);

  useEffect(() => {
    loadAnnouncements();

    const socket = io(getSocketOrigin());
    socket.on("announcement-posted", loadAnnouncements);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!highlightId || loading || announcements.length === 0) return;

    const highlightedIndex = announcements.findIndex(
      (item) => String(item.id) === String(highlightId)
    );

    if (highlightedIndex >= VISIBLE_LIMIT) {
      setShowAll(true);
    }

    const timer = setTimeout(() => {
      const element = document.getElementById(`announcement-${highlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [highlightId, loading, announcements]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function clearImageSelection() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function resetImageState() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only image files are allowed (jpeg, jpg, png, gif, webp).");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrlRef.current);
    setRemoveImage(false);
  }

  function buildFormData() {
    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("message", form.message.trim());
    formData.append("audience", form.audience);
    if (form.scheduled_at) formData.append("scheduled_at", form.scheduled_at);
    if (imageFile) formData.append("image", imageFile);
    if (removeImage) formData.append("remove_image", "true");
    return formData;
  }

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const res = await api.get("/announcements");
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnnouncement(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      return toast.error("Please complete all required fields.");
    }

    setSubmitting(true);
    try {
      const formData = buildFormData();

      if (editingId) {
        await api.put(`/announcements/${editingId}`, formData);
        toast.success("Announcement updated.");
      } else {
        const res = await api.post("/announcements", formData);
        toast.success(res.data.message || "Announcement published.");
      }

      setEditingId(null);
      setForm(emptyForm);
      resetImageState();
      loadAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Unable to save announcement.");
    } finally {
      setSubmitting(false);
    }
  }

  function editAnnouncement(item) {
    resetImageState();
    setEditingId(item.id);
    setForm({
      title: item.title,
      message: item.message,
      audience: item.audience || "All",
      scheduled_at: item.scheduled_at ? item.scheduled_at.substring(0, 16) : "",
    });
    if (item.image) {
      setImagePreview(resolveMediaUrl(item.image));
    }

    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openDeleteConfirm(item) {
    setDeleteTarget(item);
  }

  function cancelDelete() {
    if (deletingId) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    try {
      await api.delete(`/announcements/${deleteTarget.id}`);
      toast.success("Announcement deleted.");
      setDeleteTarget(null);
      loadAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Unable to delete announcement.");
    } finally {
      setDeletingId(null);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    resetImageState();
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const visibleAnnouncements = showAll
    ? announcements
    : announcements.slice(0, VISIBLE_LIMIT);

  const hiddenCount = Math.max(announcements.length - VISIBLE_LIMIT, 0);

  return (
    <div className="page announcement-page">
      <h1>Announcement Management</h1>
      <p className="page-intro">
        Publish clinic updates and send notifications to pet owners, staff, or other user groups.
      </p>

      <div
        ref={formCardRef}
        className={`form-card announcement-form-card${editingId ? " announcement-form-card--editing" : ""}`}
      >
        {editingId ? (
          <div className="announcement-editing-banner">
            <Pencil size={16} />
            <span>
              Editing: <strong>{form.title || "Announcement"}</strong>
            </span>
          </div>
        ) : null}

        <h3>{editingId ? "Edit Announcement" : "Create Announcement"}</h3>

        <form onSubmit={submitAnnouncement}>
          <div className="announcement-form-grid">
            <div className="form-field-full">
              <label htmlFor="announcement-title">Title</label>
              <input
                id="announcement-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Clinic schedule update"
                required
              />
            </div>

            <div className="form-field-full">
              <label htmlFor="announcement-message">Message</label>
              <textarea
                id="announcement-message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Write the announcement details here..."
                required
              />
            </div>

            <div className="form-field-full">
              <label htmlFor="announcement-image">Image (Optional)</label>
              <div className="announcement-image-upload">
                <input
                  ref={imageInputRef}
                  id="announcement-image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="announcement-image-input"
                />
                <label htmlFor="announcement-image" className="announcement-image-picker">
                  <ImagePlus size={18} />
                  {imageFile ? "Change image" : "Choose image"}
                </label>
                <span className="announcement-image-hint">
                  JPEG, PNG, GIF, or WebP — max 5 MB
                </span>
              </div>

              {imagePreview && (
                <div className="announcement-image-preview-wrap">
                  <img
                    src={imagePreview}
                    alt="Announcement preview"
                    className="announcement-image-preview"
                    onClick={() => setLightboxSrc(imagePreview)}
                  />
                  <button
                    type="button"
                    className="btn-secondary announcement-image-remove"
                    onClick={clearImageSelection}
                  >
                    <X size={14} />
                    Remove image
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="announcement-audience">Audience</label>
              <select
                id="announcement-audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              >
                <option value="All">All Users</option>
                <option value="Owner">Pet Owners</option>
                <option value="Staff">Clinic Staff</option>
                <option value="Veterinarian">Veterinarians</option>
                <option value="Admin">Administrators</option>
              </select>
            </div>

            <div>
              <label htmlFor="announcement-schedule">Schedule (Optional)</label>
              <input
                id="announcement-schedule"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {editingId ? (
                <>
                  <Pencil size={16} />
                  {submitting ? "Saving..." : "Update Announcement"}
                </>
              ) : (
                <>
                  <Plus size={16} />
                  {submitting ? "Publishing..." : "Publish Announcement"}
                </>
              )}
            </button>

            {editingId && (
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                <X size={16} />
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="announcement-history-card">
        <div className="announcement-history-header">Announcement History</div>

        {loading ? (
          <div style={{ padding: "2rem" }}>
            <LoadingSpinner text="Loading announcements..." fullPage={false} />
          </div>
        ) : announcements.length === 0 ? (
          <div className="announcement-empty">
            <Megaphone size={42} />
            <p style={{ margin: 0, fontWeight: 600 }}>No announcements yet.</p>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.88rem" }}>
              Published announcements will appear here.
            </p>
          </div>
        ) : (
          <>
            {visibleAnnouncements.map((item) => (
              <div
                key={item.id}
                id={`announcement-${item.id}`}
                className={`announcement-item${editingId === item.id ? " announcement-item--editing" : ""}${String(item.id) === String(highlightId) ? " announcement-item--highlighted" : ""}`}
              >
                <div className="announcement-item-header">
                  <h4 className="announcement-item-title">{item.title}</h4>
                  {editingId === item.id && (
                    <span className="announcement-editing-badge">Currently editing</span>
                  )}
                </div>

                <p className="announcement-item-message">{item.message}</p>

                {item.image && (
                  <div className="announcement-item-image-wrap">
                    <img
                      src={resolveMediaUrl(item.image)}
                      alt={item.title}
                      className="announcement-item-image"
                      onClick={() => setLightboxSrc(resolveMediaUrl(item.image))}
                    />
                  </div>
                )}

                <div className="announcement-item-meta">
                  <span className="announcement-badge announcement-badge--audience">
                    <Users size={12} />
                    {AUDIENCE_LABELS[item.audience] || item.audience}
                  </span>

                  <span className="announcement-badge announcement-badge--author">
                    By: {item.created_by_name || "Administrator"}
                  </span>

                  {item.scheduled_at && !item.sent_at && (
                    <span className="announcement-badge announcement-badge--scheduled">
                      <CalendarDays size={12} />
                      Scheduled: {formatDateTime(item.scheduled_at)}
                    </span>
                  )}

                  {item.sent_at && (
                    <span className="announcement-badge announcement-badge--sent">
                      Sent: {formatDateTime(item.sent_at)}
                    </span>
                  )}
                </div>

                <div className="announcement-item-date">
                  Created: {formatDateTime(item.created_at)}
                </div>

                <div className="announcement-item-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => editAnnouncement(item)}
                    disabled={editingId === item.id}
                  >
                    <Pencil size={14} />
                    {editingId === item.id ? "Editing..." : "Edit Announcement"}
                  </button>
                  <button
                    type="button"
                    className="btn-delete-text"
                    onClick={() => openDeleteConfirm(item)}
                    disabled={deletingId === item.id}
                  >
                    <Trash2 size={14} />
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}

            {!showAll && hiddenCount > 0 && (
              <div style={{ padding: "0.85rem 1.25rem 1.15rem" }}>
                <button
                  type="button"
                  className="btn-view-more"
                  onClick={() => setShowAll(true)}
                >
                  View More ({hiddenCount} more)
                </button>
              </div>
            )}

            {showAll && announcements.length > VISIBLE_LIMIT && (
              <div style={{ padding: "0.85rem 1.25rem 1.15rem" }}>
                <button
                  type="button"
                  className="btn-view-more btn-view-more--less"
                  onClick={() => setShowAll(false)}
                >
                  Show Less
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {lightboxSrc && (
        <div
          className="announcement-image-lightbox"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Full size announcement image"
        >
          <img src={lightboxSrc} alt="Full size announcement" />
        </div>
      )}

      {deleteTarget && (
        <div className="logout-modal-overlay" onClick={cancelDelete}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Announcement</h3>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>?
              <br /><br />
              This action cannot be undone.
            </p>
            <div className="logout-modal-buttons">
              <button
                type="button"
                className="cancel-btn"
                onClick={cancelDelete}
                disabled={!!deletingId}
              >
                No, Keep It
              </button>
              <button
                type="button"
                className="confirm-logout-btn"
                onClick={confirmDelete}
                disabled={!!deletingId}
              >
                {deletingId ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
