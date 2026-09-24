import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import useMinLoading from '../../hooks/useMinLoading';
import SummaryCard from '../../components/SummaryCard';
import StatusBadge from '../../components/StatusBadge';
import { MapPin, PawPrint, Eye, X, Search, Dog, Cat, Calendar } from 'lucide-react';

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
  const [totalRegisteredPets, setTotalRegisteredPets] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [search, setSearch] = useState('');
  const [petFilter, setPetFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoadingSummary(true);
    api.get('/users/barangay-summary')
      .then((res) => {
        setSummary(res.data.summary || []);
        setTotalRegisteredPets(res.data.total_registered_pets ?? 0);
      })
      .catch((err) => console.error('Barangay summary error:', err))
      .finally(() => setLoadingSummary(false));
  }, []);

  function openPetsModal(barangay) {
    setSelectedBarangay(barangay);
    setSearch('');
    setPetFilter('all');
    setDateFrom('');
    setDateTo('');
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
    setPetFilter('all');
    setDateFrom('');
    setDateTo('');
  }

  const filteredPets = useMemo(() => {
    let result = pets;
    if (petFilter !== 'all') {
      const species = petFilter === 'dog' ? 'Dog' : 'Cat';
      result = result.filter((p) => p.species_name === species);
    }
    if (dateFrom || dateTo) {
      result = result.filter((p) => {
        if (!p.registration_date) return false;
        const registered = new Date(p.registration_date);
        if (dateFrom && registered < new Date(dateFrom)) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (registered > end) return false;
        }
        return true;
      });
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter((p) =>
      [p.name, p.pet_code, p.owner_name, p.species_name, p.breed_name]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [pets, search, petFilter, dateFrom, dateTo]);

  const totalDogs = summary.reduce((sum, b) => sum + Number(b.dogs), 0);
  const totalDogMale = summary.reduce((sum, b) => sum + Number(b.dog_male), 0);
  const totalDogFemale = summary.reduce((sum, b) => sum + Number(b.dog_female), 0);
  const totalCats = summary.reduce((sum, b) => sum + Number(b.cats), 0);
  const totalCatMale = summary.reduce((sum, b) => sum + Number(b.cat_male), 0);
  const totalCatFemale = summary.reduce((sum, b) => sum + Number(b.cat_female), 0);

  return (
    <div className="page barangay-dashboard">
      <h1>Barangay Dashboard</h1>
      <p className="page-intro">
        Overview of registered pets across barangays in Cabuyao. Select a barangay to view its pet registry.
      </p>

      <div className="summary-row summary-row--center">
        <SummaryCard
          label="Total Barangays"
          value={loadingSummary ? '—' : summary.length}
          color="var(--color-accent)"
        />
        <SummaryCard label="Total Registered Pets" value={loadingSummary ? '—' : totalRegisteredPets} />
        <SummaryCard
          label="Registered Dogs"
          value={loadingSummary ? '—' : totalDogs}
          color="#1e7a46"
          sub={[
            { label: 'Male', value: loadingSummary ? '—' : totalDogMale },
            { label: 'Female', value: loadingSummary ? '—' : totalDogFemale },
          ]}
        />
        <SummaryCard
          label="Registered Cats"
          value={loadingSummary ? '—' : totalCats}
          color="#c8102e"
          sub={[
            { label: 'Male', value: loadingSummary ? '—' : totalCatMale },
            { label: 'Female', value: loadingSummary ? '—' : totalCatFemale },
          ]}
        />
      </div>

      <div className="form-card barangay-table-card">
        <div className="barangay-table-header">
          <div className="barangay-table-header-text">
            <MapPin size={22} className="barangay-table-icon" />
            <div>
              <h2>Barangay Overview</h2>
              <p>Pet counts per barangay, sorted by highest registration.</p>
            </div>
          </div>
        </div>

        <div className="table-scroll-wrap">
          <table className="data-table barangay-table">
            <thead>
              <tr>
                <th className="barangay-name-col">Barangay</th>
                <th className="barangay-num-col">Dogs</th>
                <th className="barangay-num-col">M</th>
                <th className="barangay-num-col">F</th>
                <th className="barangay-num-col">Cats</th>
                <th className="barangay-num-col">M</th>
                <th className="barangay-num-col">F</th>
                <th className="barangay-actions-col">View</th>
              </tr>
            </thead>
            <tbody>
              {loadingSummary && (
                <tr>
                  <td colSpan="8" className="barangay-empty-cell">
                    <LoadingSpinner text="Loading barangay data..." fullPage={false} />
                  </td>
                </tr>
              )}
              {!loadingSummary && summary.map((b) => (
                <tr key={b.barangay}>
                  <td className="barangay-name-col">
                    <div className="barangay-name-cell">
                      <span className="barangay-name-icon">
                        <MapPin size={16} />
                      </span>
                      <span className="cell-strong">{b.barangay}</span>
                    </div>
                  </td>
                  <td className="barangay-num-col">
                    <span className="barangay-pet-count barangay-dog-count">
                      <Dog size={14} />
                      {b.dogs || 0}
                    </span>
                  </td>
                  <td className="barangay-num-col cell-muted">{b.dog_male || 0}</td>
                  <td className="barangay-num-col cell-muted">{b.dog_female || 0}</td>
                  <td className="barangay-num-col">
                    <span className="barangay-pet-count barangay-cat-count">
                      <Cat size={14} />
                      {b.cats || 0}
                    </span>
                  </td>
                  <td className="barangay-num-col cell-muted">{b.cat_male || 0}</td>
                  <td className="barangay-num-col cell-muted">{b.cat_female || 0}</td>
                  <td className="barangay-actions-col">
                    <button
                      type="button"
                      className="btn-view-pets-icon"
                      onClick={() => openPetsModal(b)}
                      disabled={Number(b.total_pets) === 0}
                      title="View Pets"
                      aria-label={`View pets in ${b.barangay}`}
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loadingSummary && summary.length === 0 && (
                <tr>
                  <td colSpan="8" className="barangay-empty-cell">
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

            <div className="barangay-pets-filterbar">
              <div className="barangay-pets-filter">
                <button
                  type="button"
                  className={`filter-btn ${petFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPetFilter('all')}
                >
                  <PawPrint size={14} /> All
                </button>
                <button
                  type="button"
                  className={`filter-btn ${petFilter === 'dog' ? 'active' : ''}`}
                  onClick={() => setPetFilter('dog')}
                >
                  <Dog size={14} /> Dogs
                </button>
                <button
                  type="button"
                  className={`filter-btn ${petFilter === 'cat' ? 'active' : ''}`}
                  onClick={() => setPetFilter('cat')}
                >
                  <Cat size={14} /> Cats
                </button>
              </div>

              <div className="barangay-pets-datefilter">
                <Calendar size={16} />
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Registered from date"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Registered to date"
                />
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    className="datefilter-clear"
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="barangay-pets-body">
              {loadingPets ? (
                <div style={{ padding: '2rem 0' }}>
                  <LoadingSpinner text="Loading pets..." fullPage={false} />
                </div>
              ) : filteredPets.length === 0 ? (
                <div className="barangay-pets-empty">
                  <PawPrint size={40} strokeWidth={1.5} />
                  <p>
                    {search.trim() || dateFrom || dateTo
                      ? 'No pets match your filters.'
                      : 'No pets found in this barangay.'}
                  </p>
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
                  {petFilter !== 'all' ? ` (${petFilter === 'dog' ? 'Dogs' : 'Cats'})` : ''}
                  {dateFrom || dateTo ? ' · filtered by date' : ''}
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