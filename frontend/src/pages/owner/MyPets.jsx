
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useMinLoading from '../../hooks/useMinLoading';
import {
  Calendar,
  ChevronDown,
  Hash,
  Palette,
  PawPrint,
  Pencil,
  QrCode,
  RotateCcw,
  SearchX,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react';
import api from '../../services/api';
import { resolveMediaUrl } from '../../utils/mediaUrl';

import PetStatusItem from '../../components/PetStatusItem';
import StatusBadge from '../../components/StatusBadge';
import PetEditModal from '../../components/PetEditModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { getPetCardStatuses } from '../../utils/petStatus';

function formatBirthdate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyPets() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showLoading = useMinLoading(loading);

  const loadPets = () => {
    setLoading(true);
    setError('');
    api.get('/pets/my-pets')
      .then((res) => setPets(res.data.pets || []))
      .catch((err) => {
        console.error('Error loading pets:', err);
        setError(err.response?.data?.message || 'Failed to load pets');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPets(); }, []);

  const verifiedCount = pets.filter((p) => p.status === 'Verified').length;
  const pendingCount = pets.filter((p) => p.status !== 'Verified').length;

  const q = search.trim().toLowerCase();

  function matchesQuery(pet) {
    if (!q) return true;
    const hay = [
      pet.name,
      pet.species_name,
      pet.breed_name,
      pet.pet_code,
      pet.color,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  const visiblePets = pets.filter((pet) => {
    if (filter === 'verified' && pet.status !== 'Verified') return false;
    if (filter === 'pending' && pet.status !== 'Registered') return false;
    return matchesQuery(pet);
  });

  const showGrid = visiblePets.length > 0;
  const isFiltering = search.trim() !== '' || filter !== 'all';
  const showEmptyFilter = !showGrid;
  const hasPets = pets.length > 0;

  function resetFilters() {
    setSearch('');
    setFilter('all');
  }

  function handleDeletePet() {
    if (!deleteTarget) return;
    setDeleting(true);
    api.delete(`/pets/${deleteTarget.id}`)
      .then((res) => {
        toast.success(res.data?.message || 'Pet deleted.');
        setDeleteTarget(null);
        loadPets();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to delete pet.');
        setDeleteTarget(null);
      })
      .finally(() => setDeleting(false));
  }

  if (showLoading) {
    return <LoadingSpinner text="Loading your pets..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load pets"
        message={error}
        onRetry={loadPets}
      />
    );
  }

  if (!hasPets) {
    return (
      <EmptyState
        title="No Pets Yet"
        message="You haven't registered any pets."
        buttonText="Register Pet"
        buttonLink="/owner/register-pet"
      />
    );
  }

  return (
    <>
    <div className="page">
      <header className="draft-page-header">
        <div>
          <h1>My Pets</h1>
          <p className="page-intro">
            Track each pet&apos;s registration, QR code, and vaccination status.
          </p>
        </div>
      </header>

      <div className="summary-row">
        <div className="summary-card">
          <p className="summary-card-value">{pets.length}</p>
          <p className="summary-card-label">Total Pets</p>
        </div>
        <div className="summary-card">
          <p className="summary-card-value">{verifiedCount}</p>
          <p className="summary-card-label">Verified</p>
        </div>
        <div className="summary-card">
          <p className="summary-card-value">{pendingCount}</p>
          <p className="summary-card-label">Pending Verification</p>
        </div>
      </div>

      <div className="toolbar-row draft-toolbar">
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Search by pet name, breed, or pet code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search pets"
          />
        </div>

        <div className="toolbar-select">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter pets by status"
          >
            <option value="all">All Pets</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
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

      {showGrid && (
        <div className="pet-acc-list">
          {visiblePets.map((pet) => {
            const statusItems = getPetCardStatuses(pet);
            const isOpen = expandedId === pet.id;
            const hasPhoto = pet.photo && String(pet.photo).trim() !== '';

            return (
              <div key={pet.id} className={`pet-acc${isOpen ? ' pet-acc--open' : ''}`}>
                <div
                  className="pet-acc-head"
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isOpen ? null : pet.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId(isOpen ? null : pet.id);
                    }
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`pet-body-${pet.id}`}
                >
                  <span className="pet-acc-photo">
                    {hasPhoto ? (
                      <img
                        src={resolveMediaUrl(pet.photo)}
                        alt={`${pet.name} photo`}
                      />
                    ) : null}
                  </span>

                  <span className="pet-acc-main">
                    <span className="pet-acc-name-row">
                      <span className="pet-acc-name">{pet.name}</span>
                      <StatusBadge status={pet.status} />
                    </span>
                    <span className="pet-acc-species">
                      {pet.species_name}{pet.breed_name ? ` \u2014 ${pet.breed_name}` : ''}
                    </span>
                    <span className="pet-acc-quick">
                      <span className="pet-acc-quick-item">
                        <Hash size={12} /> {pet.pet_code || '—'}
                      </span>
                      {pet.sex && (
                        <span className="pet-acc-quick-item">
                          <User size={12} /> {pet.sex}
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="pet-acc-side">
                    <button
                      type="button"
                      className="pet-card-mini-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPet(pet);
                      }}
                      aria-label={`Edit ${pet.name} info`}
                      title="Edit pet info"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="pet-card-mini-btn pet-card-mini-btn--danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(pet);
                      }}
                      aria-label={`Delete ${pet.name}`}
                      title="Delete pet"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronDown size={20} className="pet-acc-chevron" />
                  </span>
                </div>

                <div className="pet-acc-body" id={`pet-body-${pet.id}`}>
                  <div className="pet-acc-body-inner">
                    <div className="pet-acc-details">
                      <div className="pet-card-info-chips">
                        <div className="pet-card-chip">
                          <span className="pet-card-chip-icon"><Hash size={14} /></span>
                          <div>
                            <span className="pet-card-chip-label">Pet Code</span>
                            <span className="pet-card-chip-value">{pet.pet_code || '—'}</span>
                          </div>
                        </div>

                        <div className="pet-card-chip">
                          <span className="pet-card-chip-icon"><Calendar size={14} /></span>
                          <div>
                            <span className="pet-card-chip-label">Birthdate</span>
                            <span className="pet-card-chip-value">{formatBirthdate(pet.birthdate)}</span>
                          </div>
                        </div>

                        {pet.color && (
                          <div className="pet-card-chip">
                            <span className="pet-card-chip-icon"><Palette size={14} /></span>
                            <div>
                              <span className="pet-card-chip-label">Color</span>
                              <span className="pet-card-chip-value">{pet.color}</span>
                            </div>
                          </div>
                        )}

                        {pet.sex && (
                          <div className="pet-card-chip">
                            <span className="pet-card-chip-icon"><User size={14} /></span>
                            <div>
                              <span className="pet-card-chip-label">Sex</span>
                              <span className="pet-card-chip-value">{pet.sex}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pet-card-divider" />

                      <div className="pet-card-statuses">
                        {statusItems.map((item) => (
                          <PetStatusItem
                            key={`${pet.id}-${item.category}`}
                            category={item.category}
                            status={item.status}
                            description={item.description}
                          />
                        ))}
                      </div>

                      <div className="pet-card-actions">
                        <Link to="/owner/qr-records" className="btn-secondary">
                          <QrCode size={16} />
                          QR Record
                        </Link>
                        <Link to="/owner/clinical-medicine" className="btn-secondary">
                          <Stethoscope size={16} />
                          Clinical Records
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEmptyFilter && (
        <div className="draft-empty-filter">
          <div className="draft-empty-icon">
            <SearchX size={24} />
          </div>
          <h3>{isFiltering ? 'No matching pets' : 'No pets here'}</h3>
          <p>
            {isFiltering
              ? `Nothing matches your search${filter !== 'all' ? ' and filter' : ''}. Try a different keyword or clear the filters.`
              : filter === 'pending'
                ? 'You have no pending pets right now.'
                : 'You have no verified pets right now.'}
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

    <PetEditModal
      pet={editingPet}
      onClose={() => setEditingPet(null)}
      onSaved={() => {
        setEditingPet(null);
        loadPets();
      }}
    />

    <ConfirmDialog
      open={!!deleteTarget}
      title="Delete this pet?"
      message={`Are you sure you want to delete ${deleteTarget?.name || 'this pet'}'s registration? This will permanently remove its records, QR code, vaccinations, and clinical history. This action cannot be undone.`}
      confirmText="Delete Pet"
      loading={deleting}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={handleDeletePet}
    />
    </>
  );
}
