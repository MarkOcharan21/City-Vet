import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function RegistrationRecords() {
  const [pets, setPets] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');

  useEffect(() => {
    api.get('/pets').then((res) => setPets(res.data.pets));
  }, []);

  const statuses = useMemo(() => [...new Set(pets.map((p) => p.status).filter(Boolean))], [pets]);
  const barangays = useMemo(() => [...new Set(pets.map((p) => p.barangay).filter(Boolean))], [pets]);

  const shownPets = useMemo(() => {
    const term = q.trim().toLowerCase();
    return pets.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (barangayFilter && p.barangay !== barangayFilter) return false;
      if (!term) return true;
      return [p.name, p.owner_name, p.pet_code, p.breed_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [pets, q, statusFilter, barangayFilter]);

  return (
    <div className="page">
      <h1>Registration Records</h1>
      <p>Tracks all pets registered and their progress through verification and QR generation.</p>

      <div className="panel-card">
        <div className="table-header-row">
          <div>
            <h2>Registered Pets</h2>
            <p>Search by pet, owner, code, or breed and narrow down by status or barangay.</p>
          </div>
          <div className="table-meta">
            {pets.length === shownPets.length
              ? `${pets.length} pets`
              : `${shownPets.length} of ${pets.length} pets`}
          </div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pet, owner, code, breed..."
              aria-label="Search registration records"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by verification status"
            className="toolbar-select--wide"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={barangayFilter}
            onChange={(e) => setBarangayFilter(e.target.value)}
            aria-label="Filter by barangay"
            className="toolbar-select--barangay"
          >
            <option value="">All Barangays</option>
            {barangays.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Pet</th><th>Owner</th><th>Verification Status</th><th>QR Code</th></tr>
            </thead>
            <tbody>
              {shownPets.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.owner_name}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{p.status === 'Verified' ? 'Generated' : 'Not yet generated'}</td>
                </tr>
              ))}
              {shownPets.length === 0 && (
                <tr>
                  <td colSpan="4">
                    {pets.length === 0 ? 'No registration records yet.' : 'No records match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}