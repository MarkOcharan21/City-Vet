import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, X, CalendarRange, FileBarChart } from 'lucide-react';
import api from '../../services/api';
import { printStaffReport } from '../../utils/staffReportPrint';

const CATEGORIES = [
  { key: 'pets', label: 'Pet Registrations', icon: '🐾', desc: 'All registered pets by registration date' },
  { key: 'vaccinations', label: 'Vaccination Report', icon: '💉', desc: 'Vaccination records administered to pets' },
  { key: 'clinical', label: 'Clinical Consultations', icon: '🩺', desc: 'Consultations, diagnoses and treatment plans' },
  { key: 'medicine', label: 'Medicine / Prescriptions', icon: '💊', desc: 'Prescriptions and medicines dispensed' },
  { key: 'payments', label: 'Payment Monitoring', icon: '🧾', desc: 'Official receipt payment records' },
  { key: 'outreach', label: 'Outreach Transactions', icon: '🚌', desc: 'Barangay outreach transactions' },
  { key: 'requests', label: 'Record Requests', icon: '📄', desc: 'Requested pet records and issue status' },
];

const PRESETS = [
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function presetRange(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, 0); // Jan 1 this year
  switch (preset) {
    case 'thisYear':
      return { from: `${year}-01-01`, to: todayISO() };
    case 'lastYear':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case 'thisMonth':
      return { from: `${year}-${month}-01`, to: todayISO() };
    default:
      return { from: '', to: '' };
  }
}

export default function StaffReportModal({ open, onClose, category = null }) {
  const [selected, setSelected] = useState(category);
  const [preset, setPreset] = useState('thisYear');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(category);
      setPreset('thisYear');
      const range = presetRange('thisYear');
      setFrom(range.from);
      setTo(range.to);
    }
  }, [open, category]);

  if (!open) return null;

  const showPicker = !selected;

  const applyPreset = (key) => {
    setPreset(key);
    const range = presetRange(key);
    setFrom(range.from);
    setTo(range.to);
  };

  const handlePrint = async () => {
    if (!selected) {
      toast.error('Please choose a report category first.');
      return;
    }
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get(`/reports/${selected}`, { params });
      if (!res.data.success) {
        toast.error(res.data.message || 'Could not generate the report.');
        return;
      }
      printStaffReport(res.data.report);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate the report.');
    } finally {
      setLoading(false);
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.key === selected);

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div
        className="staff-report-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-report-modal-title"
      >
        <div className="barangay-pets-modal-header">
          <div className="barangay-pets-modal-title">
            <div className="barangay-pets-modal-icon">
              <FileBarChart />
            </div>
            <div>
              <h3 id="staff-report-modal-title">Print Reports</h3>
              <p className="staff-report-modal-sub">Choose a report and date period to print.</p>
            </div>
          </div>
          <button type="button" className="barangay-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="staff-report-modal-body">
          {showPicker ? (
            <div className="staff-report-category-grid">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.key}
                  className="staff-report-category-card"
                  onClick={() => {
                    setSelected(cat.key);
                    setPreset('thisYear');
                    const range = presetRange('thisYear');
                    setFrom(range.from);
                    setTo(range.to);
                  }}
                >
                  <span className="staff-report-category-icon">{cat.icon}</span>
                  <span className="staff-report-category-label">{cat.label}</span>
                  <span className="staff-report-category-desc">{cat.desc}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="staff-report-selected-row">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setSelected(null)}>
                  ← Change category
                </button>
                <span className="staff-report-selected-label">
                  {activeCategory?.icon} {activeCategory?.label}
                </span>
              </div>

              <div className="staff-report-field">
                <label>Date range to print</label>
                <div className="staff-report-presets">
                  {PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.key}
                      className={`staff-report-preset ${preset === p.key ? 'active' : ''}`}
                      onClick={() => applyPreset(p.key)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="staff-report-range">
                  <div className="staff-report-range-field">
                    <span>From</span>
                    <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset(''); }} />
                  </div>
                  <div className="staff-report-range-field">
                    <span>To</span>
                    <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset(''); }} />
                  </div>
                </div>

                <p className="staff-report-hint">
                  <CalendarRange size={14} /> Reports include complete records between these dates —
                  this year and last year records are available.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="pm-modal-footer">
          {showPicker ? (
            <span className="staff-report-footer-note">Select a category to continue.</span>
          ) : (
            <button type="button" className="btn-primary" onClick={handlePrint} disabled={loading}>
              {loading ? (activeCategory ? 'Printing…' : 'Loading…') : (
                <>
                  <Printer size={16} /> Print {activeCategory?.label}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}