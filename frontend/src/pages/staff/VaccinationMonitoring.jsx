import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import FieldError from '../../components/ui/FieldError';
import PetSearchSelect from '../../components/PetSearchSelect';
import PetVaccinationCard from '../../components/staff/PetVaccinationCard';
import { validateVaccinationRecord } from '../../utils/validation';
import PrintReportButton from '../../components/staff/PrintReportButton';

const STATUS_PRIORITY = {
  Overdue: 1,
  'Due Soon': 2,
  Updated: 3,
  'Vaccinated Today': 4,
};

// REGISTRATION FEE (id 0) is a payment item, not a vaccine — never offer it
// in the "Add Vaccination Record" vaccine picker.
const NON_VACCINE_IDS = new Set([0]);

const findScheduleForDose = (schedules, doseNo) => {
  if (!schedules || schedules.length === 0) return null;
  const doseNum = parseInt(doseNo, 10);
  if (Number.isNaN(doseNum)) return null;
  const exact = schedules.find((s) => Number(s.dose_no) === doseNum);
  if (exact) return exact;
  return schedules.reduce((last, s) =>
    Number(s.dose_no) > Number(last.dose_no) ? s : last
  );
};

const toLocalISODate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysToISODate = (isoDate, days) => {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
};

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString();
};

export default function VaccinationMonitoring() {
  const [records, setRecords] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [petDetails, setPetDetails] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    pet_id: '',
    vaccine_id: '',
    dose_no: '',
    date_administered: toLocalISODate(),
    next_due_date: '',
    comments: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const totalVaccinated = records.filter((r) => r.status === 'Updated').length;
  const dueSoon = records.filter((r) => r.status === 'Due Soon').length;
  const overdue = records.filter((r) => r.status === 'Overdue').length;
  const vaccinatedToday = records.filter((r) => {
    if (!r.date_administered) return false;
    const today = new Date().toDateString();
    return new Date(r.date_administered).toDateString() === today;
  }).length;

  const availableYears = useMemo(() => {
    const years = new Set();
    records.forEach((r) => {
      const raw = r.date_administered || r.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [records]);

  const speciesId = selectedPet?.species_id;

  // Only offer vaccines that apply to the selected pet's species.
  const availableVaccines = useMemo(
    () =>
      vaccines.filter(
        (v) =>
          !NON_VACCINE_IDS.has(v.id) &&
          (!v.species_id || v.species_id === speciesId)
      ),
    [vaccines, speciesId]
  );

  const selectedVaccine = useMemo(
    () => vaccines.find((v) => v.id === parseInt(form.vaccine_id, 10)),
    [vaccines, form.vaccine_id]
  );

  const previousDoseCount = useMemo(() => {
    if (!form.vaccine_id || !petDetails?.history) return 0;
    return petDetails.history.filter(
      (r) => Number(r.vaccine_id) === Number(form.vaccine_id)
    ).length;
  }, [petDetails, form.vaccine_id]);

  const suggestedDoseNo = previousDoseCount + 1;

  const selectedScheduleRow = useMemo(() => {
    if (!selectedVaccine) return null;
    return findScheduleForDose(
      selectedVaccine.schedules || [],
      form.dose_no || suggestedDoseNo
    );
  }, [selectedVaccine, form.dose_no, suggestedDoseNo]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 13);
    const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const matchesPeriod = (record) => {
      if (periodFilter === 'all') return true;
      const raw = record.date_administered || record.created_at;
      if (!raw) return false;

      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      const t = d.getTime();

      switch (periodFilter) {
        case 'today': return t === today.getTime();
        case 'yesterday': return t === yesterday.getTime();
        case 'thisWeek': return t >= weekStart.getTime() && t < yesterday.getTime();
        case 'lastWeek': return t >= lastWeekStart.getTime() && t < weekStart.getTime();
        case 'lastMonth': return t >= monthStart.getTime() && t < currentMonthStart.getTime();
        case 'thisYear': return t >= yearStart.getTime() && t < monthStart.getTime();
        default: return true;
      }
    };

    const matchesDateRange = (record) => {
      if (!dateFrom && !dateTo && !yearFilter) return true;
      const raw = record.date_administered || record.created_at;
      if (!raw) return false;
      const iso = String(raw).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;

      if (yearFilter && Number(iso.slice(0, 4)) !== Number(yearFilter)) return false;
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    };

    return [...records]
      .filter((record) => {
        const matchesStatus = statusFilter === 'All' ? true : record.status === statusFilter;
        const matchesSearch = !normalizedSearch
          ? true
          : [record.pet_name, record.owner_name, record.vaccine_name, record.status]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(normalizedSearch);

        return matchesStatus && matchesPeriod(record) && matchesDateRange(record) && matchesSearch;
      })
      .sort((a, b) => {
        const aPriority = STATUS_PRIORITY[a.status] ?? 99;
        const bPriority = STATUS_PRIORITY[b.status] ?? 99;

        if (aPriority !== bPriority) return aPriority - bPriority;

        const aDate = new Date(a.next_due_date || a.date_administered || 0).getTime();
        const bDate = new Date(b.next_due_date || b.date_administered || 0).getTime();

        return aDate - bDate;
      });
  }, [records, searchTerm, statusFilter, periodFilter, dateFrom, dateTo, yearFilter]);

  function loadRecords() {
    api.get('/vaccinations').then((res) => setRecords(res.data.records));
  }

  async function fetchPetVaccinationDetails(petId) {
    try {
      const res = await api.get(`/vaccinations/pet/${petId}`);
      setPetDetails(res.data);
    } catch (err) {
      toast.error('Could not load pet vaccination details.');
    }
  }

  useEffect(() => {
    loadRecords();
    api.get('/vaccinations/vaccines').then((res) => setVaccines(res.data.vaccines));
  }, []);

  function handlePetSelect(pet) {
    setSelectedPet(pet);
    if (pet) {
      setPetDetails(null);
      setForm((prev) => ({
        ...prev,
        pet_id: pet.id,
        vaccine_id: '',
        dose_no: '',
        next_due_date: '',
      }));
      fetchPetVaccinationDetails(pet.id);
    } else {
      setSelectedPet(null);
      setPetDetails(null);
      setForm((prev) => ({ ...prev, pet_id: '', vaccine_id: '', dose_no: '', next_due_date: '' }));
    }
  }

  function openAddModal() {
    setForm((prev) => ({
      pet_id: selectedPet ? selectedPet.id : '',
      vaccine_id: '',
      dose_no: '',
      date_administered: toLocalISODate(),
      next_due_date: '',
      comments: '',
    }));
    setFieldErrors({});
    setIsModalOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === 'vaccine_id') {
      const vaccine = vaccines.find((v) => v.id === parseInt(value, 10));
      const base = form.date_administered || toLocalISODate();
      const count = petDetails?.history?.filter(
        (r) => Number(r.vaccine_id) === Number(value)
      ).length ?? 0;
      const doseNum = count + 1;
      const row = vaccine
        ? findScheduleForDose(vaccine.schedules || [], doseNum)
        : null;

      setForm((prev) => ({
        ...prev,
        [name]: value,
        dose_no:
          vaccine && (vaccine.schedules || []).length > 0
            ? String(doseNum)
            : '',
        next_due_date:
          vaccine && row ? addDaysToISODate(base, row.interval_days) : '',
      }));
    } else if (name === 'dose_no') {
      const row = selectedVaccine
        ? findScheduleForDose(selectedVaccine.schedules || [], value)
        : null;
      setForm((prev) => ({
        ...prev,
        [name]: value,
        next_due_date:
          value && row
            ? addDaysToISODate(prev.date_administered || toLocalISODate(), row.interval_days)
            : '',
      }));
    } else if (name === 'date_administered') {
      const row = selectedVaccine
        ? findScheduleForDose(
            selectedVaccine.schedules || [],
            form.dose_no || suggestedDoseNo
          )
        : null;
      setForm((prev) => ({
        ...prev,
        [name]: value,
        next_due_date:
          value && selectedVaccine && row
            ? addDaysToISODate(value, row.interval_days)
            : '',
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});

    const validation = validateVaccinationRecord(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/vaccinations', form);
      toast.success('Vaccination record saved.');
      setIsModalOpen(false);
      setForm((prev) => ({
        pet_id: prev.pet_id,
        vaccine_id: '',
        dose_no: '',
        date_administered: toLocalISODate(),
        next_due_date: '',
        comments: '',
      }));
      if (selectedPet) {
        fetchPetVaccinationDetails(selectedPet.id);
      }
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save vaccination record.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Vaccination Monitoring</h1>
          <p className="page-intro">Track vaccine updates, pending due dates, and urgent follow-ups for each pet.</p>
        </div>
        <div className="page-header-actions">
          <PrintReportButton category="vaccinations" />
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={openAddModal}
          >
            Add Vaccination Record
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card summary-card-success">
          <span className="summary-label">Total Updated</span>
          <strong>{totalVaccinated}</strong>
        </div>
        <div className="summary-card summary-card-warning">
          <span className="summary-label">Due Soon</span>
          <strong>{dueSoon}</strong>
        </div>
        <div className="summary-card summary-card-danger">
          <span className="summary-label">Overdue</span>
          <strong>{overdue}</strong>
        </div>
        <div className="summary-card summary-card-info">
          <span className="summary-label">Vaccinated Today</span>
          <strong>{vaccinatedToday}</strong>
        </div>
      </div>

      <div className="panel-card search-panel">
        <div className="panel-header">
          <div>
            <h2>Find Pet Vaccination Record</h2>
            <p>Search for a pet or owner, then select a pet to view its vaccination status.</p>
          </div>
        </div>
        <div className="search-group">
          <PetSearchSelect
            value={selectedPet}
            onChange={handlePetSelect}
            placeholder="Search pet by name, code, or owner..."
            required
          />
        </div>
      </div>

      {petDetails && (
        <PetVaccinationCard
          pet={petDetails.pet}
          latest={petDetails.latest}
          history={petDetails.history}
          onAddRecord={openAddModal}
        />
      )}

      {isModalOpen && (
        <div className="logout-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="barangay-pets-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vaccination-add-title"
          >
            <div className="barangay-pets-modal-header">
              <div className="barangay-pets-modal-title">
                <div className="barangay-pets-modal-icon">💉</div>
                <div>
                  <h3 id="vaccination-add-title">Add Vaccination Record</h3>
                  <p>
                    {selectedPet?.name || 'Selected pet'}
                    {selectedPet?.pet_code ? ` (${selectedPet.pet_code})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="barangay-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="vaccination-modal-form">
              <div className="vaccination-modal-body">
                <div className="field-group">
                  <label htmlFor="vaccination-pet-input">Pet</label>
                  <PetSearchSelect
                    id="vaccination-pet-input"
                    value={selectedPet}
                    onChange={handlePetSelect}
                    placeholder="Search pet by name, code, or owner..."
                    required
                  />
                  <FieldError message={fieldErrors.pet_id} />
                </div>

                <div className="vaccination-form-row">
                  <div className="field-group">
                    <label htmlFor="vaccine_id">Vaccine</label>
                    <select id="vaccine_id" name="vaccine_id" value={form.vaccine_id} onChange={handleChange} required>
                      <option value="">
                        {selectedPet?.species_name
                          ? `Select vaccine for ${selectedPet.species_name.toLowerCase()}`
                          : 'Select Vaccine'}
                      </option>
                      {availableVaccines.map((v) => (
                        <option key={v.id} value={v.id}>{v.vaccine_name}</option>
                      ))}
                    </select>
                    <FieldError message={fieldErrors.vaccine_id} />
                  </div>

                  <div className="field-group">
                    <label htmlFor="date_administered">Date Vaccinated</label>
                    <input
                      id="date_administered"
                      type="date"
                      name="date_administered"
                      value={form.date_administered}
                      onChange={handleChange}
                      max={toLocalISODate()}
                      required
                    />
                    <FieldError message={fieldErrors.date_administered} />
                  </div>
                </div>

                {selectedVaccine && selectedVaccine.schedules.length > 0 && (
                  <div className="field-group">
                    <label htmlFor="dose_no">Dose / Series</label>
                    <select id="dose_no" name="dose_no" value={form.dose_no} onChange={handleChange}>
                      {selectedVaccine.schedules.map((s) => (
                        <option key={s.id} value={s.dose_no}>
                          Dose {s.dose_no} — {s.dose_label}
                          {s.min_age_days ? ` (min ${s.min_age_days}d)` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="vaccination-calc-helper">
                      Suggested: Dose {suggestedDoseNo} based on {previousDoseCount}{' '}
                      previous {selectedVaccine.vaccine_name} record(s).
                    </p>
                  </div>
                )}

                <div className="field-group">
                  <label htmlFor="next_due_date">Next Due Date</label>
                  <input
                    id="next_due_date"
                    type="date"
                    name="next_due_date"
                    value={form.next_due_date}
                    onChange={handleChange}
                  />
                  <p className="vaccination-calc-helper">
                    {selectedVaccine
                      ? selectedVaccine.schedules.length > 0
                        ? `Auto-calculated: Date Vaccinated + ${selectedScheduleRow?.interval_days ?? '—'} day(s) (${selectedScheduleRow?.dose_label ?? ''}).`
                        : 'No automatic schedule is configured for this vaccine — set the Next Due date manually if needed.'
                      : 'Auto-calculated from the selected vaccine\u2019s schedule once a vaccine is chosen.'}
                  </p>
                  <FieldError message={fieldErrors.next_due_date} />
                </div>

                <div className="field-group">
                  <label htmlFor="comments">Notes</label>
                  <textarea
                    id="comments"
                    name="comments"
                    value={form.comments}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Optional notes about this vaccination..."
                  />
                </div>
              </div>

              <div className="barangay-pets-footer">
                <span className="barangay-pets-count-hint">
                  Saves as a new record — previous vaccinations stay in history.
                </span>
                <div className="barangay-pets-footer-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Vaccination'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Vaccination Schedule</h2>
            <p>Most urgent pets are shown first for quick follow-up.</p>
          </div>
          <div className="table-meta">{filteredRecords.length} records</div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pet, owner, vaccine..."
              aria-label="Search vaccination records"
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by vaccination status">
            <option value="All">All Status</option>
            <option value="Overdue">Overdue</option>
            <option value="Due Soon">Due Soon</option>
            <option value="Updated">Updated</option>
          </select>

          <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} aria-label="Filter by update period">
            <option value="all">All periods</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisWeek">This week</option>
            <option value="lastWeek">Last week</option>
            <option value="lastMonth">Last month</option>
            <option value="thisYear">This year</option>
          </select>
        </div>

        <div className="toolbar-row toolbar-row--dates">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Vaccination date from"
            title="From date"
          />
          <span className="toolbar-range-sep">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Vaccination date to"
            title="To date"
          />
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} aria-label="Filter by year">
            <option value="">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {(dateFrom || dateTo || yearFilter) && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setYearFilter('');
              }}
            >
              Clear date filter
            </button>
          )}
          <span className="toolbar-range-hint">
            Filters last vaccination by any date or year.
          </span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Owner</th>
                <th>Vaccine</th>
                <th>Status</th>
                <th>Last Vaccination</th>
                <th>Next Due</th>
              </tr>
            </thead>
            <tbody key={`${statusFilter}|${periodFilter}|${searchTerm}|${dateFrom}|${dateTo}|${yearFilter}`}>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state-cell">No vaccination records match your search.</td>
                </tr>
              ) : (
                filteredRecords.map((record, idx) => (
                  <tr key={`${record.id}-${record.pet_id}-${record.date_administered}-${idx}`}>
                    <td data-label="Pet" className="pet-name-cell">{record.pet_name}</td>
                    <td data-label="Owner">{record.owner_name}</td>
                    <td data-label="Vaccine">{record.vaccine_name}</td>
                    <td data-label="Status"><StatusBadge status={record.status} /></td>
                    <td data-label="Last Vaccination">{formatDate(record.date_administered)}</td>
                    <td data-label="Next Due">{formatDate(record.next_due_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}