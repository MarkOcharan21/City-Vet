import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import SummaryCard from '../../components/SummaryCard';
import StatusBadge from '../../components/StatusBadge';
import { MapPin, PawPrint, Eye, X, Search } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BarangayDashboard() {
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoadingSummary(true);
    api.get('/users/barangay-summary')
      .then((res) => setSummary(res.data.summary || []))
      .catch((err) => console.error('Barangay summary error:', err))
      .finally(() => setLoadingSummary(false));
  }, []);

  function openPetsModal(barangay) {
    setSelectedBarangay(barangay);
    setSearch('');
    setPets([]);
    setLoadingPets(true);
    api.get('/pets', { params: { barangay: barangay.barangay } })
      .then((res) => setPets(res.data.pets || []))
      .catch((err) => console.error('Pets load error:', err))
      .finally(() => setLoadingPets(false));
  }

  function closeModal() {
    setSelectedBarangay(null);
    setPets([]);
    setSearch('');
  }

  const filteredPets = useMemo(() => {
    if (!search.trim()) return pets;
    const q = search.toLowerCase();
    return pets.filter((p) =>
      [p.name, p.pet_code, p.owner_name, p.species_name, p.breed_name]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [pets, search]);

  const totalPets = summary.reduce((sum, b) => sum + Number(b.total_pets), 0);
  const topBarangay = summary[0];

  return (
    <div className="page barangay-dashboard">
      <h1>Barangay Dashboard</h1>
      <p className="page-intro">
        Overview of registered pets across barangays in Cabuyao. Select a barangay to view its full pet registry.
      </p>

      <div className="summary-row">
        <SummaryCard label="Total Barangays" value={loadingSummary ? '—' : summary.length} />
        <SummaryCard label="Total Registered Pets" value={loadingSummary ? '—' : totalPets} />
        {topBarangay && (
          <SummaryCard
            label={`Top Barangay · ${topBarangay.barangay}`}
            value={topBarangay.total_pets}
            color="var(--color-accent)"
          />
        )}
      </div>

      <div className="form-card barangay-table-card">
        <div className="barangay-table-header">
          <div className="barangay-table-header-text">
            <MapPin size={22} className="barangay-table-icon" />
            <div>
              <h2>Barangay Overview</h2>
              <p>Registered pet counts per barangay, sorted by highest registration.</p>
            </div>
          </div>
        </div>

        <div className="table-scroll-wrap">
          <table className="data-table barangay-table">
            <thead>
              <tr>
                <th>Barangay</th>
                <th>Registered Pets</th>
                <th className="barangay-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingSummary && (
                <tr>
                  <td colSpan="3" className="barangay-empty-cell">
                    <div className="barangay-loading">
                      <span className="spinner barangay-spinner" />
                      Loading barangay data...
                    </div>
                  </td>
                </tr>
              )}
              {!loadingSummary && summary.map((b) => (
                <tr key={b.barangay}>
                  <td>
                    <div className="barangay-name-cell">
                      <span className="barangay-name-icon">
                        <MapPin size={16} />
                      </span>
                      <span className="cell-strong">{b.barangay}</span>
                    </div>
                  </td>
                  <td>
                    <span className="barangay-pet-count">
                      <PawPrint size={14} />
                      {b.total_pets}
                    </span>
                  </td>
                  <td className="barangay-actions-col">
                    <button
                      type="button"
                      className="btn-view-pets"
                      onClick={() => openPetsModal(b)}
                      disabled={Number(b.total_pets) === 0}
                    >
                      <Eye size={16} />
                      View Pets
                    </button>
                  </td>
                </tr>
              ))}
              {!loadingSummary && summary.length === 0 && (
                <tr>
                  <td colSpan="3" className="barangay-empty-cell">
                    No barangay data yet. Pets will appear here once owners register with a barangay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBarangay && (
        <div className="logout-modal-overlay" onClick={closeModal}>
          <div
            className="barangay-pets-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="barangay-pets-title"
          >
            <div className="barangay-pets-modal-header">
              <div className="barangay-pets-modal-title">
                <div className="barangay-pets-modal-icon">
                  <PawPrint size={24} />
                </div>
                <div>
                  <h3 id="barangay-pets-title">{selectedBarangay.barangay}</h3>
                  <p>
                    {selectedBarangay.total_pets} registered pet
                    {Number(selectedBarangay.total_pets) !== 1 ? 's' : ''} in this barangay
                  </p>
                </div>
              </div>
              <button type="button" className="barangay-modal-close" onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="barangay-pets-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by pet name, code, owner, or breed..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="barangay-pets-body">
              {loadingPets ? (
                <div className="barangay-loading barangay-loading--modal">
                  <span className="spinner barangay-spinner" />
                  Loading pets...
                </div>
              ) : filteredPets.length === 0 ? (
                <div className="barangay-pets-empty">
                  <PawPrint size={40} strokeWidth={1.5} />
                  <p>{search.trim() ? 'No pets match your search.' : 'No pets found in this barangay.'}</p>
                </div>
              ) : (
                <table className="data-table barangay-pets-table">
                  <thead>
                    <tr>
                      <th>Pet Code</th>
                      <th>Pet Name</th>
                      <th>Owner</th>
                      <th>Species / Breed</th>
                      <th>Status</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPets.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-strong">{p.pet_code || '—'}</td>
                        <td>{p.name}</td>
                        <td>{p.owner_name}</td>
                        <td className="cell-muted">
                          {p.species_name || '—'}
                          {p.breed_name ? ` · ${p.breed_name}` : ''}
                        </td>
                        <td><StatusBadge status={p.status} /></td>
                        <td className="cell-muted">{formatDate(p.registration_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="barangay-pets-footer">
              {!loadingPets && filteredPets.length > 0 && (
                <span className="barangay-pets-count-hint">
                  Showing {filteredPets.length} of {pets.length} pet{pets.length !== 1 ? 's' : ''}
                </span>
              )}
              <div className="barangay-pets-footer-actions">
                <Link
                  to="/admin/traceability"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Open Traceability
                </Link>
                <button type="button" className="btn-primary" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
