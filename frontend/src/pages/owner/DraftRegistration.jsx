import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  FileEdit,
  PawPrint,
  Pencil,
  RotateCcw,
  SearchX,
  Send,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { getOfflineDraft, clearOfflineDraft } from '../../utils/offlineDraft';

function parseDraftInfo(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function formatSavedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeAgo(ts) {
  if (!ts) return '';
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.round(hrs / 24)} day${Math.round(hrs / 24) === 1 ? '' : 's'} ago`;
}

export default function DraftRegistration() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineDraft, setOfflineDraft] = useState(null);

  function loadDrafts() {
    setLoading(true);
    api.get('/drafts')
      .then((res) => setDrafts(res.data.drafts || []))
      .catch((err) => {
        // Silent on network failures (offline) — the offline draft banner still
        // surfaces any locally-saved draft.
        if (err.response) toast.error('Could not load drafts.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDrafts(); }, []);

  useEffect(() => {
    const go = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', go);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', go);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    getOfflineDraft()
      .then((draft) => setOfflineDraft(draft && draft.form ? draft : null))
      .catch(() => {});
  }, []);

  function discardOfflineDraft() {
    clearOfflineDraft()
      .then(() => setOfflineDraft(null))
      .catch(() => toast.error('Could not discard the offline draft.'));
  }

  const offlineDraftBanner = offlineDraft && (
    <div className="offline-draft-banner">
      <div className="offline-draft-banner-info">
        <span className="offline-draft-banner-icon" aria-hidden="true">📡</span>
        <div>
          <strong>Saved Offline Draft</strong>
          <p>
            {offlineDraft.form?.name?.trim() || 'Untitled pet'} · saved {formatTimeAgo(offlineDraft.updatedAt)}
            {online ? ' · you can continue now' : ' · waiting for your connection'}
          </p>
        </div>
      </div>
      <div className="offline-draft-banner-actions">
        <button
          type="button"
          className="btn-primary offline-draft-action"
          onClick={() => navigate('/owner/register-pet')}
        >
          <FileEdit size={16} />
          Continue Editing
        </button>
        <button
          type="button"
          className="btn-secondary offline-draft-action offline-draft-discard"
          onClick={discardOfflineDraft}
        >
          <Trash2 size={16} />
          Discard
        </button>
      </div>
    </div>
  );

  const pendingDrafts = drafts.filter((d) => d.sync_state !== 'Synced');
  const submittedDrafts = drafts.filter((d) => d.sync_state === 'Synced');

  const q = search.trim().toLowerCase();

  function matchesQuery(draft) {
    if (!q) return true;
    const info = parseDraftInfo(draft.temp_reg_info);
    const hay = [
      info?.name,
      info?.color,
      info?.species_id,
      `#${draft.id}`,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  const visiblePending = pendingDrafts.filter(matchesQuery);
  const visibleSubmitted = submittedDrafts.filter(matchesQuery);

  const showPendingSection = filter !== 'submitted' && visiblePending.length > 0;
  const showSubmittedSection = filter !== 'pending' && visibleSubmitted.length > 0;
  const showEmptyFilter = !showPendingSection && !showSubmittedSection;
  const isFiltering = search.trim() !== '' || filter !== 'all';

  function resetFilters() {
    setSearch('');
    setFilter('all');
  }

  async function handleSubmit(id) {
    setDeletingId(id);
    try {
      const res = await api.post(`/drafts/${id}/submit`);
      toast.success(`Submitted! Pet code: ${res.data.petCode}`);
      loadDrafts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit draft.');
    } finally {
      setDeletingId(null);
    }
  }

  function cancelDelete() {
    if (deletingId) return;
    setDeleteTarget(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    const draftId = deleteTarget.id;
    setDeletingId(draftId);
    try {
      await api.post(`/drafts/${draftId}/delete`);
      toast.success('Draft deleted.');
      setDeleteTarget(null);
      loadDrafts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete draft.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleContinue(id) {
    navigate(`/owner/register-pet?draftId=${id}`);
  }

  if (loading) {
    return <LoadingSpinner text="Loading your drafts..." />;
  }

  if (drafts.length === 0) {
    return (
      <>
        <div className="page">
          <header className="draft-page-header">
            <h1>Draft Registration</h1>
            <p className="page-intro">
              Save incomplete pet registrations and finish them whenever you are ready.
            </p>
          </header>

          {offlineDraftBanner}

          <EmptyState
            title={offlineDraft ? 'No Saved Drafts Yet' : 'No Drafts Saved'}
            message={offlineDraft
              ? 'Your offline draft is waiting above — continue editing it whenever you are ready.'
              : 'Start a pet registration and use Save as Draft if you need to finish later.'}
            buttonText="Register a Pet"
            buttonLink="/owner/register-pet"
          />
        </div>
      </>
    );
  }

  return (
    <>
    <div className="page">
      <header className="draft-page-header">
        <div>
          <h1>Draft Registration</h1>
          <p className="page-intro">
            Review saved registrations, continue editing, or submit them when the details are complete.
          </p>
        </div>
      </header>

      {offlineDraftBanner}

      <div className="summary-row">
        <div className="summary-card">
          <p className="summary-card-value">{drafts.length}</p>
          <p className="summary-card-label">Total Drafts</p>
        </div>
        <div className="summary-card">
          <p className="summary-card-value">{pendingDrafts.length}</p>
          <p className="summary-card-label">Pending Submission</p>
        </div>
        <div className="summary-card">
          <p className="summary-card-value">{submittedDrafts.length}</p>
          <p className="summary-card-label">Already Submitted</p>
        </div>
      </div>

      <div className="toolbar-row draft-toolbar">
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Search by pet name, color, or draft ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search drafts"
            />
          </div>

          <div className="toolbar-select">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter drafts by status"
            >
              <option value="all">All Drafts</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>

          {isFiltering && (
            <button
              type="button"
              className="btn-secondary draft-toolbar-reset"
              onClick={resetFilters}
            >
              <RotateCcw size={16} />
              Reset
            </button>
          )}
        </div>

      {showPendingSection && (
        <section className="draft-section">
          <div className="draft-section-heading">
            <FileEdit size={20} />
            <h2>Pending Drafts</h2>
          </div>

          <div className="draft-card-grid">
            {visiblePending.map((draft) => {
              const info = parseDraftInfo(draft.temp_reg_info);
              const isBusy = deletingId === draft.id;
              const petName = info?.name?.trim() || 'Untitled Pet';

              return (
                <article key={draft.id} className="draft-card">
                  <div className="draft-card-top">
                    <div className="draft-card-icon">
                      <PawPrint size={22} />
                    </div>
                    <div className="draft-card-title-wrap">
                      <h3>{petName}</h3>
                      <span className="draft-card-id">Draft #{draft.id}</span>
                    </div>
                    <StatusBadge status={draft.sync_state} />
                  </div>

                  <div className="draft-card-meta">
                    <div className="draft-meta-item">
                      <CalendarDays size={16} />
                      <span>Saved {formatSavedDate(draft.created_at)}</span>
                    </div>
                    <div className="draft-meta-item">
                      <ClipboardList size={16} />
                      <span>
                        {info?.species_id ? `Species ID: ${info.species_id}` : 'Species not selected yet'}
                      </span>
                    </div>
                    {info?.color && (
                      <div className="draft-meta-item">
                        <span className="draft-meta-dot" />
                        <span>{info.color}</span>
                      </div>
                    )}
                  </div>

                  <div className="draft-card-actions">
                    <button
                      type="button"
                      className="btn-primary draft-action-btn"
                      onClick={() => handleSubmit(draft.id)}
                      disabled={isBusy}
                    >
                      <Send size={16} />
                      {isBusy ? 'Submitting...' : 'Submit Registration'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary draft-action-btn"
                      onClick={() => handleContinue(draft.id)}
                      disabled={isBusy}
                    >
                      <Pencil size={16} />
                      Continue Editing
                    </button>
                    <button
                      type="button"
                      className="btn-secondary draft-action-btn draft-action-danger"
                      onClick={() => setDeleteTarget({ id: draft.id, name: petName })}
                      disabled={isBusy}
                    >
                      <Trash2 size={16} />
                      Delete Draft
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {showSubmittedSection && (
        <section className="draft-section">
          <div className="draft-section-heading">
            <ClipboardList size={20} />
            <h2>Submitted Drafts</h2>
          </div>

          <div className="draft-card-grid draft-card-grid--submitted">
            {visibleSubmitted.map((draft) => {
              const info = parseDraftInfo(draft.temp_reg_info);
              const isBusy = deletingId === draft.id;
              const petName = info?.name?.trim() || 'Untitled Pet';

              return (
                <article key={draft.id} className="draft-card draft-card--submitted">
                  <div className="draft-card-top">
                    <div className="draft-card-title-wrap">
                      <h3>{petName}</h3>
                      <span className="draft-card-id">Draft #{draft.id}</span>
                    </div>
                    <StatusBadge status={draft.sync_state} />
                  </div>

                  <div className="draft-card-meta">
                    <div className="draft-meta-item">
                      <CalendarDays size={16} />
                      <span>Saved {formatSavedDate(draft.created_at)}</span>
                    </div>
                    {draft.sync_date && (
                      <div className="draft-meta-item">
                        <Send size={16} />
                        <span>Submitted {formatSavedDate(draft.sync_date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="draft-card-actions">
                    <button
                      type="button"
                      className="btn-secondary draft-action-btn draft-action-danger"
                      onClick={() => setDeleteTarget({ id: draft.id, name: petName })}
                      disabled={isBusy}
                    >
                      <Trash2 size={16} />
                      Remove Record
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {showEmptyFilter && (
        <div className="draft-empty-filter">
          <div className="draft-empty-icon">
            <SearchX size={24} />
          </div>
          <h3>{isFiltering ? 'No matching drafts' : 'No drafts here'}</h3>
          <p>
            {isFiltering
              ? `Nothing matches your search${filter !== 'all' ? ' and filter' : ''}. Try a different keyword or clear the filters.`
              : filter === 'pending'
                ? 'You have no pending drafts right now.'
                : 'You have no submitted drafts right now.'}
          </p>
          {isFiltering && (
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              <RotateCcw size={16} />
              Clear Search & Filters
            </button>
          )}
        </div>
      )}

    </div>

    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Delete Draft"
      message={`Are you sure you want to delete the draft for ${deleteTarget?.name || 'this pet'}? This cannot be undone.`}
      confirmText="Delete Draft"
      loading={Boolean(deletingId)}
      onConfirm={handleDeleteConfirm}
      onCancel={cancelDelete}
    />
    </>
  );
}
