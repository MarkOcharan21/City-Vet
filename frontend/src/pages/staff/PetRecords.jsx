import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  PawPrint,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import DigitalPetBooklet from '../../components/booklet/DigitalPetBooklet';
import PetHealthNotesModal from '../../components/PetHealthNotesModal';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { useAuth } from '../../context/AuthContext';
import {
  CABUYAO_BARANGAYS,
  CABUYAO_POB_BARANGAYS,
} from '../../data/cabuyaoBarangays';
import PrintReportButton from '../../components/staff/PrintReportButton';

const NO_BARANGAY_KEY = '__none__';
const PAGE_SIZE = 25;

function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

// Safety-critical context a vet should see before opening a consultation.
function hasHealthNotes(pet) {
  return (
    hasValue(pet.allergies) ||
    hasValue(pet.current_medication) ||
    hasValue(pet.important_conditions) ||
    hasValue(pet.special_instructions)
  );
}

// "7 mo" / "2y 3m" — vets read age at a glance, not a raw birthdate.
function formatAge(birthdate) {
  if (!hasValue(birthdate)) return null;
  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) return null;

  const months = (Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months < 0) return null;
  if (months < 12) return `${Math.floor(months)} mo`;

  const years = Math.floor(months / 12);
  const rest = Math.floor(months % 12);
  return rest ? `${years}y ${rest}m` : `${years}y`;
}

export default function PetRecords() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [barangay, setBarangay] = useState('');
  const [species, setSpecies] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [bookletData, setBookletData] = useState(null);
  const [bookletToken, setBookletToken] = useState(null);
  const [bookletPet, setBookletPet] = useState(null);
  const [healthPet, setHealthPet] = useState(null);

  function loadPets() {
    setLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (status) params.status = status;
    if (barangay) params.barangay = barangay;

    api
      .get('/pets', { params })
      .then((res) => setPets(res.data.pets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPets();
  }, [search, status, barangay]);

  // A narrowed result set can shrink below the current page — start over.
  useEffect(() => {
    setPage(1);
  }, [search, status, barangay, species]);

  const speciesOptions = useMemo(() => {
    const names = new Set();
    pets.forEach((p) => {
      if (hasValue(p.species_name)) names.add(p.species_name);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [pets]);

  const filteredPets = useMemo(() => {
    if (!species) return pets;
    return pets.filter((p) => p.species_name === species);
  }, [pets, species]);

  const totalPages = Math.max(1, Math.ceil(filteredPets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visiblePets = filteredPets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const flaggedCount = useMemo(
    () => filteredPets.filter((p) => hasHealthNotes(p)).length,
    [filteredPets],
  );

  const openBooklet = async (pet) => {
    setBookletData(null);
    setBookletToken(null);
    setBookletPet(pet);
    try {
      const qrRes = await api.get(`/qr/pet/${pet.id}`);
      if (!qrRes.data.success || !qrRes.data.qr) {
        toast.error(qrRes.data.message || 'No QR code found for this pet.');
        return;
      }
      const token = qrRes.data.qr.qr_token;
      setBookletToken(token);
      const res = await api.get(`/qr/scan/${token}`);
      if (!res.data.success) {
        toast.error(res.data.message || 'Could not load the pet booklet.');
        setBookletToken(null);
        return;
      }
      setBookletData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load the pet booklet.');
      setBookletToken(null);
    }
  };

  const closeBooklet = () => setBookletData(null);

  const refreshAfterSave = () => {
    loadPets();
    if (bookletPet) openBooklet(bookletPet);
  };

  const hasActiveFilters = Boolean(status || barangay || species);

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Pet Records</h1>
          <p className="page-intro">
            Browse registered pets and narrow results by owner, verification status, or barangay.
          </p>
        </div>
        <PrintReportButton category="pets" />
      </div>

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Registered Pets</h2>
            <p>Use the filters below to quickly locate records in a specific barangay.</p>
          </div>
          <div className="table-meta">
            {loading
              ? 'Loading...'
              : `${filteredPets.length} record${filteredPets.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <Search size={16} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by pet, owner, or breed..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search pet records"
            />
          </div>

          <div className="toolbar-select">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
            </select>
          </div>

          <div className="toolbar-select">
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              aria-label="Filter by species"
            >
              <option value="">All Species</option>
              {speciesOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-select toolbar-select--barangay input-with-icon">
            <MapPin size={18} aria-hidden="true" />
            <select
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              aria-label="Filter by barangay"
            >
              <option value="">All Barangays</option>
              <optgroup label="Cabuyao Barangays">
                {CABUYAO_BARANGAYS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Poblacion">
                {CABUYAO_POB_BARANGAYS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
              <option value={NO_BARANGAY_KEY}>No Barangay Assigned</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <p className="filter-hint">
            Showing filtered results
            {barangay && (
              <>
                {' '}
                in{' '}
                <strong>
                  {barangay === NO_BARANGAY_KEY ? 'unassigned barangays' : barangay}
                </strong>
              </>
            )}
            {status && (
              <>
                {barangay ? ' with' : ' with'} status <strong>{status}</strong>
              </>
            )}
            {species && (
              <>
                {' '}
                of species <strong>{species}</strong>
              </>
            )}
            .
          </p>
        )}

        {flaggedCount > 0 && !loading && (
          <p className="pr-flag-summary">
            <ShieldAlert size={15} aria-hidden="true" />
            <strong>{flaggedCount}</strong> of these records carry health notes — open{' '}
            <strong>View</strong> to read them before starting a consultation.
          </p>
        )}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Owner</th>
                <th>Sex / Age</th>
                <th>Status</th>
                <th className="pr-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state-cell">
                    <LoadingSpinner text="Loading pet records..." fullPage={false} />
                  </td>
                </tr>
              ) : visiblePets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state-cell">
                    {hasActiveFilters || search.trim()
                      ? 'No pet records match your filters.'
                      : 'No pet records found.'}
                  </td>
                </tr>
              ) : (
                visiblePets.map((p) => {
                  const age = formatAge(p.birthdate);

                  return (
                    <tr key={p.id}>
                      <td data-label="Pet" className="pr-pet-cell">
                        <div className="pr-pet">
                          {hasValue(p.photo) ? (
                            <img
                              className="pr-pet-thumb"
                              src={resolveMediaUrl(p.photo)}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className="pr-pet-thumb pr-pet-thumb--empty" aria-hidden="true">
                              <PawPrint size={15} />
                            </span>
                          )}
                          <div className="pr-pet-main">
                            <strong>{p.name}</strong>
                            <span
                              className="pr-pet-sub"
                              title={`${p.pet_code}${p.breed_name || p.species_name ? ` · ${p.breed_name || p.species_name}` : ''}`}
                            >
                              {p.pet_code}
                              {p.breed_name || p.species_name
                                ? ` · ${p.breed_name || p.species_name}`
                                : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td data-label="Owner">
                        <div className="pr-owner">
                          <span>{p.owner_name || '—'}</span>
                          <span className="pr-owner-meta">{p.barangay || 'No barangay'}</span>
                        </div>
                      </td>

                      <td data-label="Sex / Age">
                        <div className="pr-demographic">
                          <span>{p.sex || '—'}</span>
                          {age && <span className="pr-demographic-age">{age}</span>}
                        </div>
                      </td>

                      <td data-label="Status">
                        <div className="pr-status">
                          <StatusBadge status={p.status} />
                        </div>
                      </td>

<td data-label="Actions" className="pr-actions-col">
                         <div className="table-actions table-action-group">
                           <button
                             type="button"
                             className="btn-secondary btn-sm"
                             onClick={() => openBooklet(p)}
                           >
                             Booklet
                           </button>
                           <button
                             type="button"
                             className="btn-secondary btn-sm"
                             onClick={() => setHealthPet(p)}
                           >
                             View
                           </button>
                         </div>
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pr-pagination">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
            >
              Previous
            </button>
            <span className="pr-pagination-info">
              Page {safePage} of {totalPages} · {filteredPets.length} records
            </span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {bookletData && (
        <div onClick={closeBooklet} className="booklet-modal-overlay">
          <div onClick={(e) => e.stopPropagation()} className="booklet-modal-sheet">
            <DigitalPetBooklet
              data={bookletData}
              mode="owner"
              onClose={closeBooklet}
              onRefresh={refreshAfterSave}
            />
          </div>
        </div>
      )}

      {healthPet && <PetHealthNotesModal pet={healthPet} onClose={() => setHealthPet(null)} />}
    </div>
  );
}
