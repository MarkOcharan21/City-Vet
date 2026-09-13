import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import FieldError from '../../components/ui/FieldError';
import PetSearchSelect from '../../components/PetSearchSelect';
import { validateClinicalRecord } from '../../utils/validation';

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString();
};

export default function ClinicalRecords() {
  const [records, setRecords] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    pet_id: '',
    diagnosis: '',
    treatment_plan: '',
    consultation_date: '',
    follow_up_date: '',
  });
  const [recordSearch, setRecordSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // One-tap templates to reduce manual typing when documenting visits
  const DIAGNOSIS_TEMPLATES = [
    {
      label: 'Anti-Rabies Vaccination',
      diagnosis: 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.',
      treatment: 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.',
    },
    {
      label: 'Deworming',
      diagnosis: 'Routine deworming visit. Pet in generally good condition.',
      treatment: 'Administered broad-spectrum dewormer. Advise repeat deworming after 3 months.',
    },
    {
      label: 'Skin Infection',
      diagnosis: 'Presence of itching, redness, and hair loss on affected skin area.',
      treatment: 'Prescribed medicated shampoo and antihistamines as needed. Follow-up check after 2 weeks.',
    },
    {
      label: 'Respiratory Infection',
      diagnosis: 'Coughing and nasal discharge observed; possible upper respiratory tract infection.',
      treatment: 'Prescribed antibiotics for 7 days. Isolate pet from other animals until cleared.',
    },
    {
      label: 'Wound Care',
      diagnosis: 'Open wound noted on body; cleaned and assessed during consultation.',
      treatment: 'Cleaned and dressed wound. Prescribed antibiotics and pain relief as needed.',
    },
  ];

  function applyTemplate(template) {
    const today = new Date().toISOString().slice(0, 10);
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 14);
    setForm((prev) => ({
      ...prev,
      diagnosis: template.diagnosis,
      treatment_plan: template.treatment,
      consultation_date: prev.consultation_date || today,
    }));
    setFieldErrors((prev) => ({ ...prev, diagnosis: '', treatment_plan: '' }));
  }

  function setFollowUpInDays(days) {
    if (!form.consultation_date) return;
    const d = new Date(form.consultation_date);
    d.setDate(d.getDate() + days);
    setForm((prev) => ({ ...prev, follow_up_date: d.toISOString().slice(0, 10) }));
    setFieldErrors((prev) => ({ ...prev, follow_up_date: '' }));
  }

  function loadRecords() {
    return api
      .get('/clinical')
      .then((res) => setRecords(res.data.records || []))
      .catch(() => {
        toast.error('Could not load consultation records.');
        setRecords([]);
      });
  }

  useEffect(() => {
    loadRecords()
      .catch(() => toast.error('Could not load consultation records page data.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredRecords = useMemo(() => {
    const term = recordSearch.trim().toLowerCase();

    if (!term) return records;

    return records.filter((record) =>
      [
        record.pet_name,
        record.pet_code,
        record.owner_name,
        record.diagnosis,
        record.treatment_plan,
        record.vet_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [records, recordSearch]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const validation = validateClinicalRecord(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(validation.message);
      setSaving(false);
      return;
    }

    try {
      await api.post('/clinical', form);
      toast.success('Consultation record saved.');
      setForm({
        pet_id: '',
        diagnosis: '',
        treatment_plan: '',
        consultation_date: '',
        follow_up_date: '',
      });
      setSelectedPet(null);
      await loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save consultation record.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading consultation records...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Consultation Records</h1>
          <p className="page-intro">
            Document consultations and review the consultation log for each pet.
          </p>
        </div>
      </div>

      <div className="panel-card clinical-panel-card">
        <div className="panel-header">
          <div>
            <h2>New Consultation</h2>
            <p>Record the diagnosis, treatment plan, and follow-up schedule of the visit.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="clinical-form">
          <section className="clinical-form-section">
            <div className="clinical-form-section-header">
              <h3>Pet Information</h3>
              <p>Search and select the pet for this consultation.</p>
            </div>

            <div className="clinical-form-grid clinical-form-grid--2">
              <div className="field-group">
                <label htmlFor="pet_id">Search & Select Pet</label>
                <PetSearchSelect
                  id="pet_id"
                  value={selectedPet}
                  onChange={(pet) => {
                    setSelectedPet(pet);
                    setForm((prev) => ({ ...prev, pet_id: pet ? pet.id : '' }));
                  }}
                  placeholder="Search by pet name, code, or owner..."
                  required
                />
                <FieldError message={fieldErrors.pet_id} />
              </div>
            </div>
          </section>

          <section className="clinical-form-section">
            <div className="clinical-form-section-header">
              <h3>Consultation Details</h3>
              <p>Document findings and the recommended treatment plan.</p>
            </div>

            <div className="clinical-form-stack">
              <div className="field-group">
                <label>Quick Templates (one tap to fill)</label>
                <div className="quick-template-row">
                  {DIAGNOSIS_TEMPLATES.map((t) => (
                    <button
                      type="button"
                      key={t.label}
                      className="quick-template-chip"
                      onClick={() => applyTemplate(t)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="diagnosis">Diagnosis / Notes</label>
                <textarea
                  id="diagnosis"
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Describe symptoms, findings, or diagnosis..."
                />
              </div>

              <div className="field-group">
                <label htmlFor="treatment_plan">Treatment Plan</label>
                <textarea
                  id="treatment_plan"
                  name="treatment_plan"
                  value={form.treatment_plan}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Medication, care instructions, or next steps..."
                />
              </div>
            </div>
          </section>

          <section className="clinical-form-section">
            <div className="clinical-form-section-header">
              <h3>Schedule</h3>
              <p>Set the consultation date and optional follow-up visit.</p>
            </div>

            <div className="clinical-form-grid clinical-form-grid--2">
              <div className="field-group">
                <label htmlFor="consultation_date">Consultation Date</label>
                <input
                  id="consultation_date"
                  type="date"
                  name="consultation_date"
                  value={form.consultation_date}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().slice(0, 10)}
                />
                <FieldError message={fieldErrors.consultation_date} />
              </div>

              <div className="field-group">
                <label htmlFor="follow_up_date">Follow-up Date</label>
                <input
                  id="follow_up_date"
                  type="date"
                  name="follow_up_date"
                  value={form.follow_up_date}
                  onChange={handleChange}
                  min={form.consultation_date || undefined}
                />
                <div className="quick-template-row">
                  <button
                    type="button"
                    className="quick-template-chip"
                    onClick={() => setFollowUpInDays(14)}
                    disabled={!form.consultation_date}
                  >
                    +2 weeks
                  </button>
                  <button
                    type="button"
                    className="quick-template-chip"
                    onClick={() => setFollowUpInDays(30)}
                    disabled={!form.consultation_date}
                  >
                    +1 month
                  </button>
                </div>
                <FieldError message={fieldErrors.follow_up_date} />
              </div>
            </div>
          </section>

          <div className="clinical-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Consultation'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Consultation Log</h2>
            <p>View saved consultations and what was done for each pet.</p>
          </div>
          <div className="table-meta">{filteredRecords.length} records</div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <input
              type="text"
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder="Search pets, owners, diagnosis, or treatment..."
              aria-label="Search consultation records"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Owner</th>
                <th>Consultation Date</th>
                <th>Notes</th>
                <th>Recorded By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state-cell">
                    {recordSearch
                      ? 'No consultation records match your search.'
                      : 'No consultation records yet.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td data-label="Pet" className="pet-name-cell">
                      <strong>{record.pet_name}</strong>
                      {record.pet_code && (
                        <div className="cell-muted">{record.pet_code}</div>
                      )}
                    </td>
                    <td data-label="Owner">{record.owner_name}</td>
                    <td data-label="Consultation Date">{formatDate(record.consultation_date)}</td>
                    <td data-label="Notes">{record.diagnosis || 'No notes yet'}</td>
                    <td data-label="Recorded By">{record.vet_name || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setSelectedRecord(record)}
                      >
                        View Consultation
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && (
        <div className="logout-modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div
            className="barangay-pets-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinical-detail-title"
          >
          <div className="barangay-pets-modal-header">
            <div className="barangay-pets-modal-title">
              <div className="barangay-pets-modal-icon">🩺</div>
              <div>
                <h3 id="clinical-detail-title">Consultation Details</h3>
                <p>
                  {selectedRecord.pet_name}
                  {selectedRecord.pet_code ? ` (${selectedRecord.pet_code})` : ''} —{' '}
                  {selectedRecord.owner_name}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="barangay-modal-close"
              onClick={() => setSelectedRecord(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="clinical-detail-grid">
            <div className="clinical-detail-item">
              <span>Consultation Date</span>
              <strong>{formatDate(selectedRecord.consultation_date)}</strong>
            </div>
            <div className="clinical-detail-item">
              <span>Follow-up Date</span>
              <strong>{formatDate(selectedRecord.follow_up_date)}</strong>
            </div>
            <div className="clinical-detail-item">
              <span>Recorded By</span>
              <strong>{selectedRecord.vet_name || '—'}</strong>
            </div>
            <div className="clinical-detail-item">
              <span>Saved On</span>
              <strong>{formatDate(selectedRecord.created_at)}</strong>
            </div>
          </div>

          <div className="clinical-detail-section">
            <h4>Diagnosis / Notes</h4>
            <p>{selectedRecord.diagnosis || 'No consultation notes recorded.'}</p>
          </div>

          <div className="clinical-detail-section">
            <h4>Treatment Plan</h4>
            <p>{selectedRecord.treatment_plan || 'No treatment plan recorded.'}</p>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
