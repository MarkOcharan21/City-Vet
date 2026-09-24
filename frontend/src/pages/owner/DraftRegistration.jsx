import { useEffect, useState } from 'react';
import useMinLoading from '../../hooks/useMinLoading';
import {
  CalendarDays,
  ChevronDown,
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
import DraftEditorModal from '../../components/owner/DraftEditorModal';
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

export default function DraftRegistration() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offlineLoading, setOfflineLoading] = useState(true);
  const showLoading = useMinLoading(loading || offlineLoading);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editorDraft, setEditorDraft] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineDraft, setOfflineDraft] = useState(null);

  function refreshOfflineDraft() {
    setOfflineLoading(true);
    getOfflineDraft()
      .then((draft) => setOfflineDraft(draft && draft.form ? draft : null))
      .catch(() => {})
      .finally(() => setOfflineLoading(false));
  }

  function loadDrafts() {
    api.get('/drafts')
      .then((res) => setDrafts(res.data.drafts || []))
      .catch((err) => {
        // Silent on network failures (offline) — the locally-saved draft is
        // still surfaced as a card below.
        if (err.response) toast.error('Could not load drafts.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDrafts(); }, []);
  useEffect(() => { refreshOfflineDraft(); }, []);

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

  function discardOfflineDraft() {
    return clearOfflineDraft()
      .catch(() => Promise.reject(new Error('offline-discard-failed')))
      .finally(() => setOfflineDraft(null));
  }

  const offlineCard = offlineDraft && {
    id: 'offline',
    source: 'offline',
    sync_state: 'Draft',
    temp_reg_info: offlineDraft.form,
    created_at: offlineDraft.updatedAt
      ? new Date(offlineDraft.updatedAt).toISOString()
      : null,
    updatedAt: offlineDraft.updatedAt,
  };

  const allDrafts = [...(offlineCard ? [offlineCard] : []), ...drafts];
  const pendingDrafts = allDrafts.filter((d) => d.sync_state !== 'Synced');
  const submittedDrafts = allDrafts.filter((d) => d.sync_state === 'Synced');

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

  function statusOk(draft) {
    if (filter === 'pending') return draft.sync_state !== 'Synced';
    if (filter === 'submitted') return draft.sync_state === 'Synced';
    return true;
  }

  const visibleDrafts = allDrafts.filter(matchesQuery).filter(statusOk);
  const showEmptyFilter = visibleDrafts.length === 0;
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

  function handleEditorSaved() {
    loadDrafts();
    refreshOfflineDraft();
  }

  function handleEditorSubmitted() {
    setEditorDraft(null);
    loadDrafts();
    refreshOfflineDraft();
  }

  function cancelDelete() {
    if (deletingId) return;
    setDeleteTarget(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    if (deleteTarget.source === 'offline') {
      setDeletingId('offline');
      try {
        await discardOfflineDraft();
        toast.success('Offline draft discarded.');
        setDeleteTarget(null);
      } catch {
        toast.error('Could not discard the offline draft.');
      } finally {
        setDeletingId(null);
      }
      return;
    }

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

  if (showLoading) {
    return <LoadingSpinner text="Loading your drafts..." />;
  }

  if (allDrafts.length === 0) {
    return (
      <div className="page">
        <header className="draft-page-header">
          <h1>Draft Registration</h1>
          <p className="page-intro">
            Save incomplete pet registrations and finish them whenever you are ready.
          </p>
        </header>

        <EmptyState
          title="No Drafts Saved"
          message="Start a pet registration and use Save as Draft if you need to finish later."
          buttonText="Register a Pet"
          buttonLink="/owner/register-pet"
        />
      </div>
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

        <div className="summary-row">
          <div className="summary-card">
            <p className="summary-card-value">{allDrafts.length}</p>
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

        <section className="draft-section">
          <div className="draft-section-heading">
            <PawPrint size={20} />
            <h2>Your Drafts</h2>
          </div>

          <div className="draft-card-grid">
            {visibleDrafts.map((draft) => {
              const info = parseDraftInfo(draft.temp_reg_info);
              const isOffline = draft.source === 'offline';
              const isSubmitted = draft.sync_state === 'Synced';
              const isBusy = deletingId === draft.id;
              const petName = info?.name?.trim() || 'Untitled Pet';
              const isExpanded = expandedId === draft.id;

              return (
                <article
                  key={draft.id}
                  className={`draft-card draft-card--accordion ${isSubmitted ? 'draft-card--submitted' : ''} ${isExpanded ? 'draft-card--open' : ''}`}
                >
                  <div className="draft-card-main">
                    <div className="draft-card-icon">
                      <PawPrint size={22} />
                    </div>
                    <div className="draft-card-title-wrap">
                      <h3>{petName}</h3>
                      <span className="draft-card-id">
                        {isOffline ? 'Offline Draft' : `Draft #${draft.id}`}
                        {isOffline && <span className="draft-source-tag">Offline</span>}
                      </span>
                    </div>
                  </div>

                  <div className="draft-card-meta">
                    <div className="draft-meta-item">
                      <CalendarDays size={16} />
                      <span>Saved {formatSavedDate(draft.created_at)}</span>
                    </div>
                    <div className="draft-meta-item">
                      <PawPrint size={16} />
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
                    {isSubmitted && draft.sync_date && (
                      <div className="draft-meta-item">
                        <Send size={16} />
                        <span>Submitted {formatSavedDate(draft.sync_date)}</span>
                      </div>
                    )}
                  </div>

                  <StatusBadge status={draft.sync_state} />

                  <button
                    type="button"
                    className="draft-row-toggle"
                    aria-label={`${isExpanded ? 'Hide' : 'Show'} actions for ${petName}`}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                  >
                    <ChevronDown size={18} className={`draft-chevron ${isExpanded ? 'draft-chevron--open' : ''}`} />
                  </button>

                  <div className={`draft-actions-panel ${isExpanded ? 'draft-actions-panel--open' : ''}`}>
                    <div className="draft-actions-panel-inner">
                      <div className="draft-card-actions">
                        {isSubmitted ? (
                          <button
                            type="button"
                            className="btn-secondary draft-action-btn draft-action-danger"
                            onClick={() => setDeleteTarget({ id: draft.id, name: petName })}
                            disabled={isBusy}
                          >
                            <Trash2 size={16} />
                            Remove Record
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-primary draft-action-btn"
                              onClick={() => isOffline ? setEditorDraft(draft) : handleSubmit(draft.id)}
                              disabled={isBusy}
                            >
                              <Send size={16} />
                              {isBusy ? 'Submitting...' : 'Submit Registration'}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary draft-action-btn"
                              onClick={() => setEditorDraft(draft)}
                              disabled={isBusy}
                            >
                              <Pencil size={16} />
                              Continue Editing
                            </button>
                            <button
                              type="button"
                              className="btn-secondary draft-action-btn draft-action-danger"
                              onClick={() => setDeleteTarget({
                                id: draft.id,
                                name: petName,
                                source: draft.source,
                              })}
                              disabled={isBusy}
                            >
                              <Trash2 size={16} />
                              {isOffline ? 'Discard Draft' : 'Delete Draft'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

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

      <DraftEditorModal
        open={Boolean(editorDraft)}
        draft={editorDraft}
        online={online}
        onClose={() => setEditorDraft(null)}
        onSaved={handleEditorSaved}
        onSubmitted={handleEditorSubmitted}
      />

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