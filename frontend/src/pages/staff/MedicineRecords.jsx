import { useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Trash2, Eye } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import useMinLoading from '../../hooks/useMinLoading';
import toast from 'react-hot-toast';
import {
  getPrintFooter,
  getPrintHeader,
  getSectionHeader,
  openPrintDocument,
} from '../../utils/printReport';
import FieldError from '../../components/ui/FieldError';
import OwnerPetPicker from '../../components/OwnerPetPicker';
import PrintReportButton from '../../components/staff/PrintReportButton';

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Build entities via char codes so source files never rely on literal entity text.
const AMP = String.fromCharCode(38); // "&"
const ENT_AMP = `${AMP}amp;`;
const ENT_LT = `${AMP}lt;`;
const ENT_GT = `${AMP}gt;`;
const ENT_QUOT = `${AMP}quot;`;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, ENT_AMP)
    .replace(/</g, ENT_LT)
    .replace(/>/g, ENT_GT)
    .replace(/"/g, ENT_QUOT);
}

function displayValue(value) {
  const text = value?.toString().trim();
  return text ? escapeHtml(text) : '—';
}

/* ── Automation: smart defaults per medicine (reduce manual typing) ── */
const MEDICINE_DEFAULTS = {
  amoxicillin: {
    dosage: '1 tablet',
    frequency: 'Twice daily',
    duration: '7 days',
    instructions: 'Give after meals.',
  },
  doxycycline: {
    dosage: '1 tablet',
    frequency: 'Once daily',
    duration: '7 days',
    instructions: 'Give with plenty of water.',
  },
  metronidazole: {
    dosage: '1 tablet',
    frequency: 'Twice daily',
    duration: '5 days',
    instructions: 'Give after meals.',
  },
  ivermectin: {
    dosage: '0.2 mL',
    frequency: 'Once',
    duration: 'Single dose',
    instructions: 'May be repeated after 14 days if needed.',
  },
  'pyrantel pamoate': {
    dosage: '1 mL',
    frequency: 'Once',
    duration: 'Single dose',
    instructions: 'Repeat after 2 weeks for deworming completion.',
  },
  carprofen: {
    dosage: '1 tablet',
    frequency: 'Once daily',
    duration: '5 days',
    instructions: 'Give with food to avoid stomach upset.',
  },
  chlorpheniramine: {
    dosage: '1 tablet',
    frequency: 'Twice daily',
    duration: '5 days',
    instructions: 'May cause drowsiness.',
  },
  'vitamin b complex': {
    dosage: '1 mL',
    frequency: 'Once daily',
    duration: '7 days',
    instructions: '',
  },
  'enrofloxacin (baytril)': {
    dosage: '1 tablet',
    frequency: 'Once daily',
    duration: '7 days',
    instructions: 'Give with water.',
  },
  'frontline spray': {
    dosage: '2 sprays',
    frequency: 'Once',
    duration: 'Monthly',
    instructions: 'Apply against the direction of fur growth.',
  },
  prednisolone: {
    dosage: '1 tablet',
    frequency: 'Once daily',
    duration: '5 days',
    instructions: 'Taper dose as advised by the veterinarian.',
  },
  'oral rehydration salts': {
    dosage: '1 sachet',
    frequency: 'Every 8 hours',
    duration: '3 days',
    instructions: 'Mix with clean water before giving.',
  },
};

const DOSAGE_CHIPS = ['1 tablet', '1/2 tablet', '1 mL', '2 mL', '1 sachet', '2 sprays'];
const FREQUENCY_CHIPS = ['Once daily', 'Twice daily', 'Every 8 hours', 'Once'];
const DURATION_CHIPS = ['3 days', '5 days', '7 days', '14 days', 'Single dose'];

function emptyPrescriptionItem() {
  return {
    medicine_id: '',
    quantity: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  };
}

function getMedicineDefaults(medicineId, medicines) {
  const medicine = medicines.find((m) => String(m.id) === String(medicineId));
  if (!medicine) return null;

  const name = (medicine.medicine_name || '').toLowerCase();
  const key = Object.keys(MEDICINE_DEFAULTS).find((k) => name.includes(k));
  return key ? MEDICINE_DEFAULTS[key] : null;
}

/* ── Automation: derive a quantity suggestion from dosage × frequency × duration ── */
function parseFrequencyPerDay(frequency) {
  const text = (frequency || '').toLowerCase();
  if (!text) return null;
  if (text.includes('every 4 hours')) return 6;
  if (text.includes('every 6 hours')) return 4;
  if (text.includes('every 8 hours')) return 3;
  if (text.includes('every 12 hours')) return 2;
  if (text.includes('thrice') || text.includes('3x')) return 3;
  if (text.includes('twice') || text.includes('2x')) return 2;
  if (text.includes('once') || text.includes('daily')) return 1;
  return null;
}

function parseDurationDays(duration) {
  const text = (duration || '').toLowerCase();
  if (!text) return null;
  if (text.includes('single') || text.includes('monthly') || text.includes('once only')) return 1;

  const dayMatch = text.match(/(\d+)\s*day/);
  if (dayMatch) return Number(dayMatch[1]);

  const weekMatch = text.match(/(\d+)\s*week/);
  if (weekMatch) return Number(weekMatch[1]) * 7;

  return null;
}

function getQuantitySuggestion(item) {
  const dosage = (item.dosage || '').trim();

  // Skip weight-based dosages (e.g. "1 mL per 5 kg") — cannot compute without pet weight.
  if (/per\s*(kg|lb|body)/i.test(dosage)) return null;

  const unitMatch = dosage.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\b/);
  if (!unitMatch) return null;

  const units = Number(unitMatch[1]);
  const unit = unitMatch[2].toLowerCase();
  const perDay = parseFrequencyPerDay(item.frequency);
  const days = parseDurationDays(item.duration);

  if (!units || !perDay || !days) return null;

  const total = Math.ceil(units * perDay * days);
  if (!total || total <= 0) return null;

  const plural = total > 1 && !unit.endsWith('s') ? `${unit}s` : unit;
  return `${total} ${plural}`;
}

function buildMedicineCardHtml(item) {
  return `
    <div class="rx-medicine-card">
      <div class="rx-medicine-card-header">${displayValue(item.medicine_name)}</div>
      <div class="rx-medicine-grid">
        <div class="rx-medicine-field">
          <span>Quantity</span>
          <strong>${displayValue(item.quantity)}</strong>
        </div>
        <div class="rx-medicine-field">
          <span>Dosage</span>
          <strong>${displayValue(item.dosage)}</strong>
        </div>
        <div class="rx-medicine-field">
          <span>Frequency</span>
          <strong>${displayValue(item.frequency)}</strong>
        </div>
        <div class="rx-medicine-field">
          <span>Duration</span>
          <strong>${displayValue(item.duration)}</strong>
        </div>
      </div>
      ${
        item.instructions?.trim()
          ? `
        <div class="rx-instructions">
          <span>Special Instructions</span>
          <p>${displayValue(item.instructions)}</p>
        </div>
      `
          : ''
      }
    </div>
  `;
}

function PrintIconButton({
  onClick,
  label = 'Print prescription',
  className = '',
  disabled = false,
  size = 18,
}) {
  return (
    <button
      type="button"
      className={`btn-icon-action btn-icon-action--print ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Printer size={size} aria-hidden="true" />
    </button>
  );
}

function printPrescriptionSlip(prescriptionId, records, fallbackItems = []) {
  const items = records.filter((record) => Number(record.prescription_id) === Number(prescriptionId));
  const printableItems = items.length > 0 ? items : fallbackItems;
  if (printableItems.length === 0) {
    toast.error('Could not prepare the prescription slip for printing.');
    return false;
  }

  const first = printableItems[0];
  const isDraft = String(prescriptionId).toLowerCase() === 'draft';
  const prescriptionLabel = isDraft ? 'Draft Preview' : `#${prescriptionId}`;

  const opened = openPrintDocument({
    title: `Prescription - ${first.pet_name}`,
    bodyHtml: `
      ${getPrintHeader('Prescription Slip')}

      <div class="rx-status-row">
        <p class="report-meta" style="margin:0;">Generated ${escapeHtml(new Date().toLocaleString('en-PH'))}</p>
        <span class="rx-status-badge ${isDraft ? 'rx-status-badge--draft' : ''}">
          ${isDraft ? 'Draft Copy' : 'Official Copy'}
        </span>
      </div>

      ${getSectionHeader(1, 'Patient Information')}
      <div class="rx-summary-grid">
        <div class="rx-summary-item">
          <span>Pet</span>
          <strong>${displayValue(first.pet_name)}${first.pet_code ? ` (${displayValue(first.pet_code)})` : ''}</strong>
        </div>
        <div class="rx-summary-item">
          <span>Owner</span>
          <strong>${displayValue(first.owner_name)}</strong>
        </div>
        <div class="rx-summary-item">
          <span>Consultation Date</span>
          <strong>${displayValue(formatDate(first.consultation_date))}</strong>
        </div>
        <div class="rx-summary-item">
          <span>Prescribed Date</span>
          <strong>${displayValue(formatDate(first.prescribed_date))}</strong>
        </div>
        <div class="rx-summary-item">
          <span>Prescribed By</span>
          <strong>${displayValue(first.vet_name)}</strong>
        </div>
        <div class="rx-summary-item">
          <span>Prescription No.</span>
          <strong>${escapeHtml(prescriptionLabel)}</strong>
        </div>
      </div>

      ${
        first.diagnosis
          ? `${getSectionHeader(2, 'Clinical Notes')}<div class="notes">${displayValue(first.diagnosis)}</div>`
          : ''
      }

      ${getSectionHeader(first.diagnosis ? 3 : 2, 'Medicines Prescribed')}
      ${printableItems.map((item) => buildMedicineCardHtml(item)).join('')}

      ${getPrintFooter('Veterinarian / Clinic Staff')}
    `,
  });

  if (!opened) {
    toast.error('Allow pop-ups to print the prescription slip.');
    return false;
  }

  return true;
}

function buildPrintFallbackItems(form, selectedPet, selectedPetConsultation, medicines) {
  return form.items.map((item) => {
    const medicine = medicines.find((m) => String(m.id) === String(item.medicine_id));

    return {
      prescription_id: 'Draft',
      pet_name: selectedPet?.name,
      pet_code: selectedPet?.pet_code,
      owner_name: selectedPet?.owner_name,
      consultation_date: selectedPetConsultation?.consultation_date,
      prescribed_date: new Date().toISOString().slice(0, 10),
      vet_name: null,
      diagnosis: selectedPetConsultation?.diagnosis,
      medicine_name: medicine?.medicine_name,
      quantity: item.quantity,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    };
  });
}

export default function MedicineRecords() {
  const [records, setRecords] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [form, setForm] = useState({
    pet_id: '',
    items: [emptyPrescriptionItem()],
  });
  const [recordSearch, setRecordSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  function loadRecords() {
    return api
      .get('/medicines')
      .then((res) => {
        const nextRecords = res.data.records || [];
        setRecords(nextRecords);
        return nextRecords;
      })
      .catch(() => {
        toast.error('Could not load medicine records.');
        setRecords([]);
        return [];
      });
  }

  useEffect(() => {
    Promise.all([
      loadRecords(),
      api.get('/clinical').then((res) => setConsultations(res.data.records || [])),
      api.get('/medicines/list').then((res) => setMedicines(res.data.medicines || [])),
    ])
      .catch(() => toast.error('Could not load medicine records page data.'))
      .finally(() => setLoading(false));
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set();
    records.forEach((r) => {
      const raw = r.prescribed_date;
      if (!raw) return;
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    const term = recordSearch.trim().toLowerCase();
    const dateFiltered = records.filter((record) => {
      if (!dateFrom && !dateTo && !yearFilter) return true;
      const iso = String(record.prescribed_date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;

      if (yearFilter && Number(iso.slice(0, 4)) !== Number(yearFilter)) return false;
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    });

    if (!term) return dateFiltered;

    return dateFiltered.filter((record) =>
      [
        record.pet_name,
        record.pet_code,
        record.owner_name,
        record.medicine_name,
        record.dosage,
        record.frequency,
        record.duration,
        record.instructions,
        record.vet_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [records, recordSearch, dateFrom, dateTo, yearFilter]);

  const selectedPetConsultation = useMemo(() => {
    if (!form.pet_id) return null;

    return consultations
      .filter((item) => String(item.pet_id) === String(form.pet_id))
      .sort((a, b) => new Date(b.consultation_date) - new Date(a.consultation_date))[0] || null;
  }, [consultations, form.pet_id]);

  function clearItemError(index, field) {
    setFieldErrors((prev) => {
      const key = `items.${index}.${field}`;
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /* Automation: selecting a medicine auto-fills dosage, frequency, duration, and instructions. */
  function handleMedicineChange(index, value) {
    const defaults = getMedicineDefaults(value, medicines);

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              medicine_id: value,
              ...(defaults
                ? {
                    dosage: defaults.dosage,
                    frequency: defaults.frequency,
                    duration: defaults.duration,
                    instructions: defaults.instructions || '',
                  }
                : {}),
            }
          : item,
      ),
    }));
    clearItemError(index, 'medicine_id');
  }

  function handleItemChange(index, name, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [name]: value } : item)),
    }));
    clearItemError(index, name);
  }

  function applyItemChip(index, name, value) {
    handleItemChange(index, name, value);
  }

  function applyQuantitySuggestion(index, suggestion) {
    handleItemChange(index, 'quantity', suggestion);
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyPrescriptionItem()] }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));
  }

  function validateForm() {
    const errors = {};
    if (!form.pet_id) errors.pet_id = 'Select a pet.';

    form.items.forEach((item, index) => {
      if (!item.medicine_id) {
        errors[`items.${index}.medicine_id`] = 'Select a medicine.';
      }
    });

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      setSaving(false);
      return;
    }

    try {
      const payload = {
        pet_id: Number(form.pet_id),
        items: form.items.map((item) => ({
          medicine_id: Number(item.medicine_id),
          quantity: item.quantity.trim() || null,
          dosage: item.dosage.trim() || null,
          frequency: item.frequency.trim() || null,
          duration: item.duration.trim() || null,
          instructions: item.instructions.trim() || null,
        })),
      };

      await api.post('/medicines/prescriptions', payload);

      toast.success('Prescription saved.');

      setForm({ pet_id: '', items: [emptyPrescriptionItem()] });
      setSelectedPet(null);

      await Promise.all([
        loadRecords(),
        api.get('/clinical').then((res) => setConsultations(res.data.records || [])),
      ]);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        setFieldErrors(apiErrors);
      }
      toast.error(err.response?.data?.message || 'Could not save prescription.');
    } finally {
      setSaving(false);
    }
  }

  function handlePrintForm() {
    setFieldErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    const previewItems = buildPrintFallbackItems(form, selectedPet, selectedPetConsultation, medicines);
    printPrescriptionSlip('Draft', [], previewItems);
  }

  if (loading) {
    return <LoadingSpinner text="Loading medicine records..." />;
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Medicine Records</h1>
          <p className="page-intro">
            Prescribe medicines with smart defaults — dosage, frequency, and duration auto-fill
            based on the selected medicine, and quantity is suggested automatically.
          </p>
        </div>
        <PrintReportButton category="medicine" />
      </div>

      <div className="panel-card clinical-panel-card">
        <div className="panel-header">
          <div>
            <h2>Save Prescription</h2>
            <p>Link one or more medicines to an existing consultation record.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="clinical-form">
          <section className="clinical-form-section">
            <div className="clinical-form-section-header">
              <h3>Consultation</h3>
              <p>
                Search the pet owner, then pick the pet from their registered pets. A consultation
                record will be linked automatically.
              </p>
            </div>

            <OwnerPetPicker
              value={selectedPet}
              onChange={(pet) => {
                setSelectedPet(pet);
                setForm((prev) => ({ ...prev, pet_id: pet ? pet.id : '' }));
                setFieldErrors((prev) => ({ ...prev, pet_id: '' }));
              }}
            />
            <FieldError message={fieldErrors.pet_id} />

            {selectedPet && (
              <div className="medicine-consultation-preview">
                <strong>{selectedPet.name}</strong>
                <span>Owner: {selectedPet.owner_name || '—'}</span>
                <span>
                  Consultation:{' '}
                  {selectedPetConsultation
                    ? formatDate(selectedPetConsultation.consultation_date)
                    : 'Will be created automatically'}
                </span>
                {selectedPetConsultation?.diagnosis && (
                  <span>Notes: {selectedPetConsultation.diagnosis}</span>
                )}
              </div>
            )}
          </section>

          <section className="clinical-form-section">
            <div className="clinical-form-section-header">
              <h3>Medicine Details</h3>
              <p>
                Selecting a medicine auto-fills the recommended dosage, frequency, duration, and
                instructions. Adjust anything as needed.
              </p>
            </div>

            {form.items.map((item, index) => {
              const quantitySuggestion = getQuantitySuggestion(item);

              return (
                <div className="prescription-item-card" key={index}>
                  <div className="prescription-item-header">
                    <span className="prescription-item-title">
                      💊 Medicine {index + 1}
                    </span>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        className="prescription-item-remove"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 size={14} aria-hidden="true" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="clinical-form-grid clinical-form-grid--2">
                    <div className="field-group">
                      <label htmlFor={`medicine_id-${index}`}>Medicine</label>
                      <select
                        id={`medicine_id-${index}`}
                        value={item.medicine_id}
                        onChange={(e) => handleMedicineChange(index, e.target.value)}
                        required
                      >
                        <option value="">Select Medicine</option>
                        {medicines.map((medicine) => (
                          <option key={medicine.id} value={medicine.id}>
                            {medicine.medicine_name}
                            {medicine.description ? ` — ${medicine.description}` : ''}
                          </option>
                        ))}
                      </select>
                      <FieldError message={fieldErrors[`items.${index}.medicine_id`]} />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`quantity-${index}`}>Quantity</label>
                      <input
                        id={`quantity-${index}`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="e.g. 1 bottle, 10 tablets"
                      />
                      {quantitySuggestion && item.quantity !== quantitySuggestion && (
                        <div className="quantity-suggestion-row">
                          <span className="quantity-suggestion-label">
                            Suggested for this schedule:
                          </span>
                          <button
                            type="button"
                            className="quick-template-chip"
                            onClick={() => applyQuantitySuggestion(index, quantitySuggestion)}
                          >
                            {quantitySuggestion}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="field-group">
                      <label htmlFor={`dosage-${index}`}>Dosage</label>
                      <input
                        id={`dosage-${index}`}
                        value={item.dosage}
                        onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                        placeholder="e.g. 1 tablet"
                      />
                      <div className="quick-template-row">
                        {DOSAGE_CHIPS.map((chip) => (
                          <button
                            type="button"
                            key={chip}
                            className="quick-template-chip"
                            onClick={() => applyItemChip(index, 'dosage', chip)}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`frequency-${index}`}>Frequency</label>
                      <input
                        id={`frequency-${index}`}
                        value={item.frequency}
                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                        placeholder="e.g. Twice daily"
                      />
                      <div className="quick-template-row">
                        {FREQUENCY_CHIPS.map((chip) => (
                          <button
                            type="button"
                            key={chip}
                            className="quick-template-chip"
                            onClick={() => applyItemChip(index, 'frequency', chip)}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`duration-${index}`}>Duration</label>
                      <input
                        id={`duration-${index}`}
                        value={item.duration}
                        onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                        placeholder="e.g. 7 days"
                      />
                      <div className="quick-template-row">
                        {DURATION_CHIPS.map((chip) => (
                          <button
                            type="button"
                            key={chip}
                            className="quick-template-chip"
                            onClick={() => applyItemChip(index, 'duration', chip)}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="clinical-form-stack" style={{ marginTop: '1.25rem' }}>
                    <div className="field-group">
                      <label htmlFor={`instructions-${index}`}>Special Instructions</label>
                      <textarea
                        id={`instructions-${index}`}
                        value={item.instructions}
                        onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                        rows="2"
                        placeholder="Take after meals, keep refrigerated, etc."
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button type="button" className="btn-secondary prescription-add-item-btn" onClick={addItem}>
              <Plus size={16} aria-hidden="true" /> Add Another Medicine
            </button>
          </section>

          <div className="clinical-form-actions">
            <PrintIconButton
              onClick={handlePrintForm}
              disabled={saving}
              className="clinical-form-print-btn"
              size={20}
            />
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Prescription'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Prescription Log</h2>
            <p>Review saved prescriptions and print a copy when needed.</p>
          </div>
          <div className="table-meta">{filteredRecords.length} records</div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <input
              type="search"
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder="Search pets, medicines, dosage, or instructions..."
              aria-label="Search medicine records"
            />
          </div>
        </div>

        <div className="toolbar-row toolbar-row--dates">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Prescription date from"
            title="From date"
          />
          <span className="toolbar-range-sep">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Prescription date to"
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
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Owner</th>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Prescribed Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state-cell">
                    {recordSearch
                      ? 'No prescriptions match your search.'
                      : 'No medicine prescribed yet.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td data-label="Pet" className="pet-name-cell">
                      <strong>{record.pet_name}</strong>
                      {record.pet_code && <div className="cell-muted">{record.pet_code}</div>}
                    </td>
                    <td data-label="Owner">{record.owner_name}</td>
                    <td data-label="Medicine">{record.medicine_name}</td>
                    <td data-label="Dosage">{record.dosage || '—'}</td>
                    <td data-label="Frequency">{record.frequency || '—'}</td>
                    <td data-label="Duration">{record.duration || '—'}</td>
                    <td data-label="Prescribed Date">{formatDate(record.prescribed_date)}</td>
                    <td>
                      <div className="table-action-group">
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => setSelectedRecord(record)}
                          title="View prescription details"
                          aria-label={`View prescription for ${record.pet_name}`}
                        >
                          <Eye size={15} />
                        </button>
                        <PrintIconButton
                          onClick={() => printPrescriptionSlip(record.prescription_id, records)}
                          className="table-print-btn"
                        />
                      </div>
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
            aria-labelledby="prescription-detail-title"
          >
            <div className="barangay-pets-modal-header">
              <div className="barangay-pets-modal-title">
                <div className="barangay-pets-modal-icon">💊</div>
                <div>
                  <h3 id="prescription-detail-title">Prescription Details</h3>
                  <p>
                    {selectedRecord.pet_name}
                    {selectedRecord.pet_code ? ` (${selectedRecord.pet_code})` : ''} —{' '}
                    {selectedRecord.owner_name}
                  </p>
                </div>
              </div>
              <div className="barangay-pets-modal-actions">
                <PrintIconButton
                  onClick={() => printPrescriptionSlip(selectedRecord.prescription_id, records)}
                  className="modal-print-btn"
                />
                <button
                  type="button"
                  className="barangay-modal-close"
                  onClick={() => setSelectedRecord(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="clinical-detail-grid">
              <div className="clinical-detail-item">
                <span>Medicine</span>
                <strong>{selectedRecord.medicine_name}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Prescribed Date</span>
                <strong>{formatDate(selectedRecord.prescribed_date)}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Consultation Date</span>
                <strong>{formatDate(selectedRecord.consultation_date)}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Prescribed By</span>
                <strong>{selectedRecord.vet_name || '—'}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Quantity</span>
                <strong>{selectedRecord.quantity || '—'}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Dosage</span>
                <strong>{selectedRecord.dosage || '—'}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Frequency</span>
                <strong>{selectedRecord.frequency || '—'}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Duration</span>
                <strong>{selectedRecord.duration || '—'}</strong>
              </div>
            </div>

            {selectedRecord.diagnosis && (
              <div className="clinical-detail-section">
                <h4>Related Clinical Notes</h4>
                <p>{selectedRecord.diagnosis}</p>
              </div>
            )}

            <div className="clinical-detail-section">
              <h4>Special Instructions</h4>
              <p>{selectedRecord.instructions || 'No special instructions recorded.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}