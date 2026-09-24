import { useEffect, useState, useMemo } from 'react';
import useMinLoading from '../../hooks/useMinLoading';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Image as ImageIcon,
  Receipt,
  RotateCcw,
  Search,
  Shield,
  Truck,
  X,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';

// ─── helpers ────────────────────────────────────────────────

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(value) {
  if (!value) return '';
  const parts = String(value).split(':');
  if (parts.length < 2) return '';
  let h = Number(parts[0]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${parts[1]} ${ampm}`;
}

function fmtMoney(value) {
  const num = Number(value) || 0;
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parsePaymentItems(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function itemLabel(item) {
  const combined = [item.name, item.description].filter(Boolean).join(' ');
  return combined || 'Payment item';
}

// ─── source + status metadata ───────────────────────────────

const SOURCE_META = {
  clinic: { icon: Receipt, label: 'Clinic', color: 'var(--color-primary)', tint: 'var(--color-primary-tint)' },
  outreach: { icon: Truck, label: 'Outreach', color: 'var(--color-accent)', tint: 'var(--color-accent-tint)' },
};

const STATUS_META = {
  Paid: { color: 'var(--color-success)', tint: 'var(--color-success-tint)' },
  Verified: { color: 'var(--color-success)', tint: 'var(--color-success-tint)' },
  Submitted: { color: 'var(--color-warning)', tint: 'var(--color-warning-tint)' },
  Rejected: { color: '#DC2626', tint: '#FEF2F2' },
};

function SourceChip({ source }) {
  const meta = SOURCE_META[source] || SOURCE_META.clinic;
  const Icon = meta.icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.18rem 0.55rem',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: meta.color,
        background: meta.tint,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function StatusChip({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Submitted;
  const icon = status === 'Paid' || status === 'Verified' ? CheckCircle2 : status === 'Rejected' ? AlertTriangle : Clock;
  const Icon = icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.18rem 0.55rem',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: meta.color,
        background: meta.tint,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={12} aria-hidden="true" />
      {status === 'Verified' ? 'Paid' : status}
    </span>
  );
}

// ─── details modal ──────────────────────────────────────────

function DetailModal({ record, onClose }) {
  if (!record) return null;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const isClinic = record.source === 'clinic';
  const items = isClinic ? parsePaymentItems(record.payment_items) : record.items || [];

  return (
    <div className="pet-modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Payment details">
      <div className="pet-modal" style={{ maxWidth: 620 }}>
        <div className="pet-modal-header">
          <h3>{isClinic ? 'Payment Receipt' : 'Outreach Payment'}</h3>
          <button type="button" className="pet-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <SourceChip source={record.source} />
          <StatusChip status={record.status} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.9rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <p className="field-hint" style={{ margin: 0 }}>Reference</p>
            <strong>{isClinic ? `OR ${record.ref}` : record.ref}</strong>
          </div>
          <div>
            <p className="field-hint" style={{ margin: 0 }}>Date</p>
            <strong>{fmtDate(record.date)}{record.time ? ` · ${fmtTime(record.time)}` : ''}</strong>
          </div>
          {!isClinic && (
            <div>
              <p className="field-hint" style={{ margin: 0 }}>Pet / Barangay</p>
              <strong>{[record.pet_name, record.barangay].filter(Boolean).join(' · ') || '—'}</strong>
            </div>
          )}
        </div>

        {isClinic && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.9rem 1rem',
              borderRadius: 10,
              background: 'var(--color-accent-tint)',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <p className="field-hint" style={{ margin: 0 }}>Type</p>
              <strong>{record.title}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="field-hint" style={{ margin: 0 }}>Total Paid</p>
              <strong style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>{fmtMoney(record.amount)}</strong>
            </div>
          </div>
        )}

        <p className="field-hint" style={{ margin: '0 0 0.4rem' }}>Breakdown</p>
        {items.length > 0 ? (
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: '1.25rem',
            }}
          >
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.55rem 0.9rem',
                  borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--color-border)',
                  fontSize: '0.9rem',
                }}
              >
                <span>{isClinic ? itemLabel(item) : item.service_name}</span>
                <strong style={{ whiteSpace: 'nowrap' }}>{fmtMoney(Number(item.amount) || 0)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {isClinic ? (record.description || 'No itemized breakdown available.') : 'No itemized breakdown available.'}
          </p>
        )}

        {isClinic && record.medicine_name && (
          <div
            style={{
              padding: '0.7rem 0.9rem',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <span>
              <strong>Medicine:</strong> {record.medicine_name}
              {record.medicine_quantity ? ` (${record.medicine_quantity})` : ''}
            </span>
            {record.medicine_total != null && <strong>{fmtMoney(record.medicine_total)}</strong>}
          </div>
        )}

        {(record.description || record.remarks) && (
          <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            {record.description && <p style={{ margin: '0 0 0.2rem' }}>{record.description}</p>}
            {record.remarks && <p style={{ margin: 0 }}>Remarks: {record.remarks}</p>}
          </div>
        )}

        {!isClinic && record.rejection_reason && (
          <div
            style={{
              padding: '0.7rem 0.9rem',
              borderRadius: 10,
              background: '#FEF2F2',
              color: '#991B1B',
              fontSize: '0.88rem',
              marginBottom: '1.25rem',
            }}
          >
            <strong>Not approved:</strong> {record.rejection_reason}
          </div>
        )}

        {!isClinic && (
          <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {record.submitted_at && <p style={{ margin: '0 0 0.2rem' }}>Submitted: {fmtDate(record.submitted_at)} {fmtTime(record.submitted_at)}</p>}
            {record.verified_at && <p style={{ margin: 0 }}>Paid/Verified: {fmtDate(record.verified_at)} {fmtTime(record.verified_at)}</p>}
          </div>
        )}

        {isClinic && (
          <div>
            <p className="field-hint" style={{ margin: '0 0 0.4rem' }}>Official Receipt</p>
            {record.or_photo_path ? (
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={record.or_photo_path}
                  alt={`Official receipt ${record.ref}`}
                  style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                <ImageIcon size={14} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />
                No receipt photo on file.
              </p>
            )}
          </div>
        )}

        {isClinic && record.recorded_by_name && (
          <p className="field-hint" style={{ margin: '1rem 0 0' }}>
            Recorded by {record.recorded_by_name}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── page ───────────────────────────────────────────────────

export default function PaymentHistory() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoading(loading);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [detailRecord, setDetailRecord] = useState(null);

  const loadHistory = () => {
    setLoading(true);
    setError('');
    api
      .get('/payment-history/my-history')
      .then((res) => {
        setRecords(res.data.records || []);
        setSummary(res.data.summary || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load payment history.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const isFiltering = Boolean(search || sourceFilter !== 'all' || fromDate || toDate);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((r) => {
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (fromDate && r.date && String(r.date) < fromDate) return false;
      if (toDate && r.date && String(r.date) > toDate) return false;
      if (term) {
        const haystack = [r.ref, r.title, r.description || '', r.pet_name || '', (r.items || []).map((i) => i.service_name).join(' ')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [records, search, sourceFilter, fromDate, toDate]);

  function resetFilters() {
    setSearch('');
    setSourceFilter('all');
    setFromDate('');
    setToDate('');
  }

  if (showLoading) return <LoadingSpinner text="Loading payment history..." />;

  if (error) {
    return <ErrorState title="Unable to load payment history" message={error} onRetry={loadHistory} />;
  }

  const mostRecent = records[0] ? fmtDate(records[0].date) : '—';

  return (
    <div className="page">
      <header className="draft-page-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 0.9rem',
            borderRadius: 8,
            background: 'var(--color-accent-tint)',
            border: '1px solid rgba(198,161,91,0.3)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#5c4a28',
            flexShrink: 0,
            marginBottom: '0.85rem',
            width: 'fit-content',
          }}
        >
          <Shield size={14} />
          Read-only view
        </div>
        <h1>Payment History</h1>
        <p className="page-intro">
          Track your clinic payments and outreach activity fees in one place. Download-proof record of your official receipts.
        </p>
      </header>

      {/* Summary cards */}
      <div className="summary-row" style={{ marginBottom: '1.75rem' }}>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-primary)' }}>
          <p className="summary-card-value">{fmtMoney(summary?.overallTotal || 0)}</p>
          <p className="summary-card-label">Total Paid · {summary?.overallCount ?? 0} payment{summary?.overallCount === 1 ? '' : 's'}</p>
        </div>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-success)' }}>
          <p className="summary-card-value">{fmtMoney(summary?.clinicTotal || 0)}</p>
          <p className="summary-card-label">Clinic Payments · {summary?.clinicCount ?? 0}</p>
        </div>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-accent)' }}>
          <p className="summary-card-value">{fmtMoney(summary?.outreachTotal || 0)}</p>
          <p className="summary-card-label">Outreach Payments · {summary?.outreachCount ?? 0}</p>
        </div>
        <div className="summary-card" style={{ borderTopColor: '#6B7280' }}>
          <p className="summary-card-value" style={{ fontSize: '1rem' }}>{mostRecent}</p>
          <p className="summary-card-label">Most Recent Payment</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-row draft-toolbar">
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Search OR number, program, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search payment history"
          />
        </div>

        <div className="toolbar-select">
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Filter by source">
            <option value="all">All Sources</option>
            <option value="clinic">Clinic</option>
            <option value="outreach">Outreach</option>
          </select>
        </div>

        <div className="toolbar-date">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="Filter from date" />
          <span>to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="Filter to date" />
        </div>

        {isFiltering && (
          <button type="button" className="btn-secondary draft-toolbar-reset" onClick={resetFilters}>
            <RotateCcw size={16} />
            Reset
          </button>
        )}
      </div>

      {/* Record count */}
      <p
        style={{
          margin: '0 0 1rem',
          fontSize: '0.88rem',
          color: 'var(--color-text-muted)',
          fontWeight: 600,
        }}
      >
        {filteredRecords.length === records.length
          ? `${records.length} record${records.length !== 1 ? 's' : ''}`
          : `Showing ${filteredRecords.length} of ${records.length} records`}
      </p>

      {/* Table */}
      {filteredRecords.length > 0 ? (
        <div className="table-wrapper ph-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="ph-th-date">Date</th>
                <th>Source</th>
                <th className="ph-th-ref">Reference</th>
                <th>Details</th>
                <th className="ph-th-amount">Amount</th>
                <th className="ph-th-status">Status</th>
                <th className="ph-th-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={`${record.source}-${record.id}`}>
                  <td className="ph-cell-date">
                    {fmtDate(record.date)}
                    {record.time && <div className="cell-muted">{fmtTime(record.time)}</div>}
                  </td>
                  <td className="ph-cell-source"><SourceChip source={record.source} /></td>
                  <td className="ph-cell-ref">
                    {record.source === 'clinic' ? `OR ${record.ref}` : record.ref}
                  </td>
                  <td className="ph-cell-details">
                    {record.source === 'clinic' ? (
                      record.description ? (
                        <>
                          <span className="ph-details-main">{record.description}</span>
                          <span className="ph-details-sub">{(parsePaymentItems(record.payment_items) || []).length} item(s)</span>
                        </>
                      ) : (
                        <span className="ph-details-main">{(parsePaymentItems(record.payment_items) || []).length} item(s)</span>
                      )
                    ) : (
                      <>
                        <span className="ph-details-main">{(record.items || []).length} service(s)</span>
                        {record.pet_name && <span className="ph-details-sub">{record.pet_name}</span>}
                      </>
                    )}
                  </td>
                  <td className="ph-cell-amount">{fmtMoney(record.amount)}</td>
                  <td className="ph-cell-status"><StatusChip status={record.status} /></td>
                  <td className="ph-cell-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setDetailRecord(record)}>
                      <Eye size={14} aria-hidden="true" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="draft-empty-filter">
          <div className="draft-empty-icon">
            {isFiltering ? <Search size={22} /> : <Receipt size={22} />}
          </div>
          <h3>{isFiltering ? 'No matching payments' : 'No Payments Yet'}</h3>
          <p>
            {isFiltering
              ? 'Nothing matches your search or filter. Try adjusting your criteria.'
              : 'Your clinic and outreach payments will appear here once recorded.'}
          </p>
          {isFiltering && (
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
    </div>
  );
}