import { Fragment, useEffect, useMemo, useState } from 'react';
import { Trash2, CheckCircle, AlertTriangle, X, MapPin, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

export default function VerifyRegistration() {
  const [pets, setPets]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({
    today: true,
    yesterday: true,
    earlierThisWeek: true,
    lastWeek: false,
    lastMonth: false,
    earlierThisYear: false,
    earlier: false,
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting]         = useState(false);

  // View details modal state
  const [viewPetId, setViewPetId]       = useState(null);
  const [viewPet, setViewPet]           = useState(null);
  const [viewLoading, setViewLoading]   = useState(false);

  function loadPets() {
    setLoading(true);
    api.get('/pets')
      .then((res) => setPets(res.data.pets || []))
      .catch(() => toast.error('Failed to load pets'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPets(); }, []);

  async function handleVerify(id) {
    try {
      await api.put(`/pets/${id}/verify`);
      toast.success('Pet registration verified successfully');
      loadPets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify registration');
    }
  }

  async function openViewModal(id) {
    setViewPetId(id);
    setViewPet(null);
    setViewLoading(true);
    try {
      const res = await api.get(`/pets/${id}`);
      setViewPet(res.data.pet || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load pet details');
      setViewPetId(null);
    } finally {
      setViewLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/pets/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name}'s registration has been deleted`);
      setDeleteTarget(null);
      loadPets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete registration');
    } finally {
      setDeleting(false);
    }
  }

  const barangays = useMemo(() => (
    [...new Set(pets.map((pet) => pet.barangay?.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  ), [pets]);

  const filtered = pets.filter((p) => {
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter ||
      (statusFilter === 'Verified' ? p.status === 'Verified' : p.status !== 'Verified');
    const matchesBarangay = !barangayFilter || p.barangay === barangayFilter;

    return matchesSearch && matchesStatus && matchesBarangay;
  });

  const hasActiveFilters = Boolean(search || statusFilter || barangayFilter);

  const dateGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    // Use rolling seven-day windows so each monitoring section remains useful
    // even on Monday, when a calendar-week "earlier this week" would be empty.
    const earlierThisWeekStart = new Date(today);
    earlierThisWeekStart.setDate(today.getDate() - 6);
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 13);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentYearStart = new Date(today.getFullYear(), 0, 1);

    const groups = [
      { id: 'today', label: 'Today', pets: [] },
      { id: 'yesterday', label: 'Yesterday', pets: [] },
      { id: 'earlierThisWeek', label: 'Earlier this week', pets: [] },
      { id: 'lastWeek', label: 'Last week', pets: [] },
      { id: 'lastMonth', label: 'Last month', pets: [] },
      { id: 'earlierThisYear', label: 'Earlier this year', pets: [] },
      { id: 'earlier', label: 'Earlier registrations', pets: [] },
    ];

    const groupsById = {};
    groups.forEach((group) => { groupsById[group.id] = group; });

    filtered.forEach((pet) => {
      const registeredAt = pet.created_at ? new Date(pet.created_at) : null;
      if (!registeredAt || Number.isNaN(registeredAt.getTime())) {
        groupsById.earlier.pets.push(pet);
        return;
      }
      registeredAt.setHours(0, 0, 0, 0);

      if (registeredAt.getTime() === today.getTime()) groupsById.today.pets.push(pet);
      else if (registeredAt.getTime() === yesterday.getTime()) groupsById.yesterday.pets.push(pet);
      else if (registeredAt >= earlierThisWeekStart) groupsById.earlierThisWeek.pets.push(pet);
      else if (registeredAt >= lastWeekStart) groupsById.lastWeek.pets.push(pet);
      else if (registeredAt >= lastMonthStart && registeredAt < currentMonthStart) groupsById.lastMonth.pets.push(pet);
      else if (registeredAt >= currentYearStart) groupsById.earlierThisYear.pets.push(pet);
      else groupsById.earlier.pets.push(pet);
    });

    return groups.filter((group) => group.pets.length > 0);
  }, [filtered]);

  function toggleGroup(groupId) {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.35rem' }}>Verify Registration</h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Review new pet records and verify or remove them from the queue.
        </p>
      </div>

      <div className="toolbar-row" style={{ marginBottom: '1.25rem' }}>
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Search by pet name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search registrations"
          />
        </div>

        <div className="toolbar-select">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter registrations by verification status"
          >
            <option value="">All statuses</option>
            <option value="Verified">Verified</option>
            <option value="Unverified">Unverified</option>
          </select>
        </div>

        <div className="toolbar-select toolbar-select--barangay input-with-icon">
          <MapPin size={18} aria-hidden="true" />
          <select
            value={barangayFilter}
            onChange={(e) => setBarangayFilter(e.target.value)}
            aria-label="Filter registrations by pet owner registered barangay"
          >
            <option value="">All registered barangays</option>
            {barangays.map((barangay) => (
              <option key={barangay} value={barangay}>{barangay}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading registrations...
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pet Name</th>
                <th>Species / Breed</th>
                <th>Owner</th>
                <th>Registered Barangay</th>
                <th>Registered</th>
                <th>QR Code</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dateGroups.map((group) => (
                <Fragment key={group.id}>
                  <tr className="group-header-row">
                    <td colSpan="8" style={{ padding: 0, background: 'var(--color-surface, #f8fafc)' }}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={Boolean(expandedGroups[group.id])}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem',
                          padding: '0.8rem 1rem', border: 'none', background: 'transparent',
                          color: 'var(--color-ink)', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {expandedGroups[group.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <span>{group.label}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {group.pets.length} registration{group.pets.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                    </td>
                  </tr>
                  {expandedGroups[group.id] && group.pets.map((p) => (
                  <tr key={p.id}>
                  <td data-label="Pet Name" style={{ fontWeight: 600 }}>{p.name}</td>
                  <td data-label="Species / Breed" style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                    {p.species_name}{p.breed_name ? ` · ${p.breed_name}` : ''}
                  </td>
                  <td data-label="Owner">{p.owner_name || '—'}</td>
                  <td data-label="Registered Barangay">{p.barangay || '—'}</td>
                  <td data-label="Registered" style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td data-label="QR Code">
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 999,
                      background: p.status === 'Verified' ? 'var(--color-success-tint)' : 'var(--color-warning-tint)',
                      color: p.status === 'Verified' ? 'var(--color-success)' : 'var(--color-warning)',
                    }}>
                      {p.status === 'Verified' ? 'Generated' : 'Pending'}
                    </span>
                  </td>
                  <td data-label="Status"><StatusBadge status={p.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => openViewModal(p.id)}
                        title="View pet details"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          background: '#fff',
                          color: 'var(--color-ink)',
                          border: '1.5px solid var(--color-border)',
                          borderRadius: 7,
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <Eye size={14} />
                        View
                      </button>
                      {p.status !== 'Verified' && (
                        <button
                          onClick={() => handleVerify(p.id)}
                          title="Verify registration"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            background: 'var(--color-success-tint)',
                            color: 'var(--color-success)',
                            border: '1.5px solid var(--color-success)',
                            borderRadius: 7,
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#c6efd7'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-success-tint)'}
                        >
                          <CheckCircle size={14} />
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                        title="Delete registration"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          background: 'var(--color-primary-tint)',
                          color: 'var(--color-primary)',
                          border: '1.5px solid var(--color-primary)',
                          borderRadius: 7,
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5c0c8'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary-tint)'}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                  ))}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                    {hasActiveFilters ? 'No registrations match your filters.' : 'No registrations to review.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── View Pet Details Modal ── */}
      {viewPetId && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(36,20,22,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(2px)',
        }} onClick={() => !viewLoading && setViewPetId(null)}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '1.75rem 2rem',
            width: '100%',
            maxWidth: 520,
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(36,20,22,0.18)',
            animation: 'fadeIn 0.15s ease',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={20} /> Pet Details
              </h3>
              <button
                onClick={() => setViewPetId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem', borderRadius: 6 }}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            {viewLoading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading pet details...
              </div>
            ) : viewPet ? (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem',
                }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{viewPet.name}</span>
                  <StatusBadge status={viewPet.status} />
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem 1.5rem',
                  background: 'var(--color-surface, #f8fafc)',
                  borderRadius: 10, padding: '1.1rem 1.25rem',
                }}>
                  {[
                    ['Species', viewPet.species_name || '—'],
                    ['Breed', viewPet.breed_name || '—'],
                    ['Sex', viewPet.sex || '—'],
                    ['Color / Markings', viewPet.color || '—'],
                    ['Birthdate', viewPet.birthdate ? new Date(viewPet.birthdate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'],
                    ['Registered Barangay', viewPet.barangay || '—'],
                    ['Owner', viewPet.owner_name || '—'],
                    ['Registered', viewPet.created_at ? new Date(viewPet.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'],
                    ['QR Code', viewPet.qr_status === 'active' ? 'Generated' : 'Pending'],
                    ['Vaccination Records', String(viewPet.vaccination_count ?? 0)],
                    ['Overdue Vaccinations', String(viewPet.overdue_vaccinations ?? 0)],
                    ['Payment Status', viewPet.latest_payment_status ? String(viewPet.latest_payment_status).replace(/_/g, ' ') : '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>{label}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-ink)' }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => setViewPetId(null)}
                    style={{
                      padding: '0.6rem 1.25rem', background: '#fff',
                      border: '1.5px solid var(--color-border)', borderRadius: 8,
                      fontWeight: 600, cursor: 'pointer', fontSize: '0.92rem', color: 'var(--color-ink)',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Pet details not available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(36,20,22,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '2rem',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 24px 60px rgba(36,20,22,0.18)',
            animation: 'fadeIn 0.15s ease',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--color-primary-tint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={24} color="var(--color-primary)" />
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', padding: '0.25rem',
                  borderRadius: 6,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>Delete Registration</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--color-ink)' }}>{deleteTarget.name}</strong>'s registration?
              This will also remove all associated QR codes and vaccination records.
              <br /><br />
              <strong style={{ color: 'var(--color-primary)' }}>This action cannot be undone.</strong>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#fff',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.92rem',
                  color: 'var(--color-ink)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: deleting ? '#e88' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.92rem',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  transition: 'background 0.15s',
                }}
              >
                <Trash2 size={15} />
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
