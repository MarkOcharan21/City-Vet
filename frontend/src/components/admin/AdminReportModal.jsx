import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, CalendarRange, Printer, X } from 'lucide-react';
import api from '../../services/api';
import { printAdminReport } from '../../utils/adminReportPrint';

const PRESETS = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

const MONTHS = [
  { value: '', label: 'Any month' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: new Date(2026, i, 1).toLocaleString('en-US', { month: 'long' }),
  })),
];

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO() {
  return toISO(new Date());
}

function presetRange(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  switch (preset) {
    case 'thisMonth':
      return { from: `${year}-${month}-01`, to: todayISO() };
    case 'lastMonth': {
      const first = new Date(year, now.getMonth() - 1, 1);
      const last = new Date(year, now.getMonth(), 0);
      return { from: toISO(first), to: toISO(last) };
    }
    case 'thisYear':
      return { from: `${year}-01-01`, to: todayISO() };
    case 'lastYear':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default:
      return { from: '', to: '' };
  }
}

export default function AdminReportModal({ open, onClose }) {
  const [preset, setPreset] = useState('thisYear');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2023 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (open) {
      setPreset('thisYear');
      setMonth('');
      setYear('');
      const range = presetRange('thisYear');
      setFrom(range.from);
      setTo(range.to);
    }
  }, [open]);

  if (!open) return null;

  const applyPreset = (key) => {
    setPreset(key);
    setMonth('');
    setYear('');
    const range = presetRange(key);
    setFrom(range.from);
    setTo(range.to);
  };

  const applyMonthYear = (m, y) => {
    setMonth(m);
    setYear(y);
    setPreset('');
    if (!y) return;
    if (m) {
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      setFrom(`${y}-${m}-01`);
      setTo(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else {
      setFrom(`${y}-01-01`);
      setTo(`${y}-12-31`);
    }
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get('/analytics/dashboard', { params });
      if (!res.data.success) {
        toast.error(res.data.message || 'Could not generate the report.');
        return;
      }
      printAdminReport(res.data, {
        title: 'Analytics Report',
        period: res.data.filterLabel || 'All Time',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate the report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div
        className="staff-report-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-report-modal-title"
      >
        <div className="barangay-pets-modal-header">
          <div className="barangay-pets-modal-title">
            <div className="barangay-pets-modal-icon">
              <BarChart3 />
            </div>
            <div>
              <h3 id="admin-report-modal-title">Print Analytics Report</h3>
              <p className="staff-report-modal-sub">
                Choose a period to print — by exact date, month, or year.
              </p>
            </div>
          </div>
          <button type="button" className="barangay-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="staff-report-modal-body">
          <div className="staff-report-field">
            <label>Quick period</label>
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
          </div>

          <div className="staff-report-field">
            <label>Or pick a specific month or year</label>
            <div className="staff-report-range staff-report-range--quick">
              <div className="staff-report-range-field">
                <span>Month</span>
                <select value={month} onChange={(e) => applyMonthYear(e.target.value, year)}>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="staff-report-range-field">
                <span>Year</span>
                <select value={year} onChange={(e) => applyMonthYear(month, e.target.value)}>
                  <option value="">Any year</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="staff-report-field">
            <label>Exact date range</label>
            <div className="staff-report-range">
              <div className="staff-report-range-field">
                <span>From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setPreset(''); }}
                />
              </div>
              <div className="staff-report-range-field">
                <span>To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setPreset(''); }}
                />
              </div>
            </div>
            <p className="staff-report-hint">
              <CalendarRange size={14} /> Pick an exact date range, a single month, or a whole
              year — the printed report follows the period you choose.
            </p>
          </div>
        </div>

        <div className="pm-modal-footer">
          <button type="button" className="btn-primary" onClick={handlePrint} disabled={loading}>
            {loading ? (
              'Generating report…'
            ) : (
              <>
                <Printer size={16} /> Print Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}