import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import useMinLoading from '../../hooks/useMinLoading';
import StatusBadge from '../../components/StatusBadge';
import DigitalPetBooklet from '../../components/booklet/DigitalPetBooklet';
import {
  CABUYAO_BARANGAYS,
  CABUYAO_POB_BARANGAYS,
} from '../../data/cabuyaoBarangays';
import PrintReportButton from '../../components/staff/PrintReportButton';

const NO_BARANGAY_KEY = '__none__';

export default function PetRecords() {
  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [barangay, setBarangay] = useState('');
  const [loading, setLoading] = useState(true);

  const [bookletData, setBookletData] = useState(null);
  const [bookletToken, setBookletToken] = useState(null);
  const [bookletPet, setBookletPet] = useState(null);

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

  const hasActiveFilters = Boolean(status || barangay);

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
            {loading ? 'Loading...' : `${pets.length} record${pets.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
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
            .
          </p>
        )}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pet ID</th>
                <th>Pet Name</th>
                <th>Owner</th>
                <th>Barangay</th>
                <th>Breed</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-state-cell">
                    <LoadingSpinner text="Loading pet records..." fullPage={false} />
                  </td>
                </tr>
              ) : pets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state-cell">
                    {hasActiveFilters || search.trim()
                      ? 'No pet records match your filters.'
                      : 'No pet records found.'}
                  </td>
                </tr>
              ) : (
                pets.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Pet ID">{p.pet_code}</td>
                    <td data-label="Pet Name" className="pet-name-cell">{p.name}</td>
                    <td data-label="Owner">{p.owner_name}</td>
                    <td data-label="Barangay">{p.barangay || '—'}</td>
                    <td data-label="Breed">{p.breed_name || '—'}</td>
                    <td data-label="Status">
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => openBooklet(p)}
                      >
                        Open Booklet
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}