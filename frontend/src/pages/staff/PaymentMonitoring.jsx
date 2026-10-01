import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, PawPrint, Printer, Search, Stethoscope, Syringe, Pill } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import PrintReportButton from "../../components/staff/PrintReportButton";
import { LOGO_URL } from "../../utils/printReport";
import { useAuth } from "../../context/AuthContext";

const STATUS_OPTIONS = ["Unpaid", "Paid", "Cancelled"];
const TYPE_ICON = { Consultation: Stethoscope, Vaccination: Syringe, Medicine: Pill };
const PAGE_SIZE = 25;

function formatMoney(value) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function getCharges(record) {
  if (Array.isArray(record?.charges)) return record.charges;
  if (!record?.payment_items) return [];
  try {
    const parsed = JSON.parse(record.payment_items);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function statusClass(status) {
  if (status === "Paid") return "pm-status-pill pm-status-pill--paid";
  if (status === "Cancelled") return "pm-status-pill pm-status-pill--cancelled";
  return "pm-status-pill pm-status-pill--unpaid";
}

export default function PaymentMonitoring() {
  const { user } = useAuth();
  const staffName = (user?.full_name || "").trim();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ overall: { total_payments: 0, total_amount: 0 }, summary: {}, byType: [], todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  function loadRecords(params = {}) {
    const query = { ...params, page, limit: PAGE_SIZE };
    if (query.status === "All") delete query.status;
    return api.get("/payment-monitoring", { params: query }).then((response) => {
      setRecords(response.data.records || []);
      setTotalRecords(Number(response.data.total || 0));
    });
  }

  function loadSummary() {
    return api.get("/payment-monitoring/summary").then((response) => setSummary({
      overall: response.data.overall || { total_payments: 0, total_amount: 0 },
      summary: response.data.summary || {},
      byType: response.data.byType || [],
      todayCount: Number(response.data.todayCount || 0),
    }));
  }

  useEffect(() => {
    Promise.all([loadRecords(), loadSummary()]).catch(() => toast.error("Could not load payment monitoring data.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRecords({ search: searchTerm || undefined, status: statusFilter, from: fromDate || undefined, to: toDate || undefined }).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm, statusFilter, fromDate, toDate, page]);

  // A narrowed result set can shrink below the current page — start over.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, fromDate, toDate]);

  const visibleRecords = useMemo(() => records, [records]);
  const detailCharges = detailRecord ? getCharges(detailRecord) : [];
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const activeTypeRows = (summary.byType || []).filter((row) => Number(row.total_count || 0) > 0);
  const statusCards = [
    { label: "Unpaid", value: summary.summary?.Unpaid?.count || 0, amount: summary.summary?.Unpaid?.total_amount || 0, className: "summary-card-warning" },
    { label: "Paid", value: summary.summary?.Paid?.count || 0, amount: summary.summary?.Paid?.total_amount || 0, className: "summary-card-success" },
    { label: "Cancelled", value: summary.summary?.Cancelled?.count || 0, amount: summary.summary?.Cancelled?.total_amount || 0, className: "summary-card-danger" },
  ];

  async function updateStatus(id, status) {
    if (!STATUS_OPTIONS.includes(status)) return;
    setUpdatingId(id);
    try {
      const response = await api.patch(`/payment-monitoring/${id}/status`, { status });
      const updated = response.data.payment || response.data.record;
      setRecords((current) => current.map((record) => (Number(record.id) === Number(id) ? { ...record, ...(updated || { payment_status: status }) } : record)));
      setDetailRecord((current) => (current && Number(current.id) === Number(id) ? { ...current, ...(updated || { payment_status: status }) } : current));
      await loadSummary();
      toast.success(`Payment marked ${status.toLowerCase()}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update payment status.");
    } finally {
      setUpdatingId(null);
    }
  }

  function openDetail(record) {
    setDetailRecord(record);
  }

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("All");
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Payment Monitoring</h1>
          <p className="page-intro">Monitor all clinic charges (consultations, vaccinations, medicines, outreach) and update payment status.</p>
        </div>
        <div className="page-header-actions"><PrintReportButton category="payments" /></div>
      </div>

        <div className="summary-grid">
          <div className="summary-card summary-card-info"><span className="summary-label">Total Transactions</span><strong>{summary.overall?.total_payments || 0}</strong><small>All recorded payments</small></div>
          <div className="summary-card summary-card-success"><span className="summary-label">Total Collected</span><strong>{formatMoney(summary.overall?.total_amount)}</strong><small>Paid payments only</small></div>
        {statusCards.map((card) => <div className={`summary-card ${card.className}`} key={card.label}><span className="summary-label">{card.label}</span><strong>{card.value}</strong><small>{formatMoney(card.amount)}</small></div>)}
      </div>

      {(activeTypeRows.length > 0 || Number(summary.todayCount || 0) > 0) && (
        <div className="pm-insight-row">
          {Number(summary.todayCount || 0) > 0 && (
            <p className="pr-flag-summary pr-flag-summary--info">
              <Stethoscope size={15} aria-hidden="true" />
              <strong>{summary.todayCount}</strong> payment{summary.todayCount !== 1 ? 's' : ''} created today.
            </p>
          )}
          {activeTypeRows.map((row) => {
            const Icon = TYPE_ICON[row.payment_type] || Stethoscope;
            return (
              <p className="pr-flag-summary" key={row.payment_type}>
                <Icon size={15} aria-hidden="true" />
                <strong>{row.total_count}</strong> {row.payment_type} · {formatMoney(row.type_amount)}
              </p>
            );
          })}
        </div>
      )}

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div><h2>Payments</h2><p>All clinic charges — consultations, vaccinations, medicines, and outreach programs.</p></div>
          <div className="table-meta">{totalRecords} record{totalRecords !== 1 ? 's' : ''}</div>
        </div>
        <div className="toolbar-row pm-toolbar">
          <div className="search-wrap"><Search size={16} aria-hidden="true" /><input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search reference, pet, or owner..." aria-label="Search payment records" /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter payment status"><option value="All">All Statuses</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <div className="toolbar-date"><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Filter from date" /><span>to</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Filter to date" /></div>
          <button type="button" className="btn-secondary draft-toolbar-reset" onClick={resetFilters}>Reset</button>
        </div>

        <div className="table-wrapper">
          <table className="data-table pm-table">
            <thead><tr><th>Reference</th><th>Date</th><th>Patient</th><th>Services</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="empty-state-cell">Loading payment records...</td></tr> : visibleRecords.length === 0 ? <tr><td colSpan="7" className="empty-state-cell">{searchTerm || statusFilter !== "All" || fromDate || toDate ? "No payment records match your filters." : "No payments recorded yet."}</td></tr> : visibleRecords.map((record) => {
                const charges = getCharges(record);
                const TypeIcon = TYPE_ICON[record.payment_type] || Stethoscope;
                return <tr key={record.id}>
                  <td data-label="Reference" className="cell-strong">{record.payment_reference || "—"}</td>
                  <td data-label="Date">{formatDate(record.consultation_date)}</td>
                  <td data-label="Patient"><div className="pm-patient-cell"><PawPrint size={14} /><div><strong>{record.pet_name || "—"}</strong><span>{record.pet_code || "—"}</span></div></div><div className="cell-muted">{record.owner_name || "—"}</div></td>
                  <td data-label="Services"><div className="pm-service-cell"><TypeIcon size={14} /><span>{charges.length ? `${charges.length} service${charges.length === 1 ? "" : "s"}` : record.payment_type || "Consultation"}</span></div></td>
                  <td data-label="Amount"><strong>{formatMoney(record.total_amount)}</strong></td>
                  <td data-label="Status"><span className={statusClass(record.payment_status)}>{record.payment_status || "Unpaid"}</span></td>
                  <td data-label="Action"><div className="pm-action-cell"><button type="button" className="pm-view-btn" onClick={() => openDetail(record)} aria-label={`View ${record.payment_reference || "payment"}`} title="View payment details"><Eye size={14} aria-hidden="true" /> View</button><select className="pm-status-select" value={record.payment_status || "Unpaid"} onChange={(event) => updateStatus(record.id, event.target.value)} disabled={updatingId === record.id} aria-label={`Update status for ${record.payment_reference || "payment"}`}><option value="Unpaid">Unpaid</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option></select></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pr-pagination">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
            >
              Previous
            </button>
            <span className="pr-pagination-info">
              Page {safePage} of {totalPages} · {totalRecords} records
            </span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {detailRecord && createPortal(
        <div className="pm-receipt-overlay" onClick={() => setDetailRecord(null)}>
          <div className="pm-receipt-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pm-detail-title">
            <div className="pm-receipt-actions">
              <div>
                <h3 id="pm-detail-title">Payment Receipt</h3>
                <p>{detailRecord.payment_reference || "Consultation payment"}</p>
              </div>
              <div className="pm-receipt-actions-buttons">
                <select className="pm-status-select" value={detailRecord.payment_status || "Unpaid"} onChange={(event) => updateStatus(detailRecord.id, event.target.value)} disabled={updatingId === detailRecord.id} aria-label="Update payment status">{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}><Printer size={14} aria-hidden="true" /> Print</button>
                <button type="button" className="btn-primary btn-sm" onClick={() => setDetailRecord(null)}>Close</button>
              </div>
            </div>

            <div className="pm-receipt-sheet">
              <div className="pm-receipt-head">
                <div className="pm-receipt-head-brand">
                  <img className="pm-receipt-head-logo" src={LOGO_URL} alt="City of Cabuyao logo" />
                  <div className="pm-receipt-head-title">
                    <span className="pm-receipt-head-city">City of Cabuyao</span>
                    <span className="pm-receipt-head-office">Veterinary Office</span>
                    <span className="pm-receipt-head-sub">Official Payment Receipt</span>
                  </div>
                </div>
                <div className="pm-receipt-orbox">
                  <span>Amount Due</span>
                  <strong>{formatMoney(detailRecord.total_amount)}</strong>
                </div>
              </div>

              <div className="pm-receipt-meta">
                <div className="pm-receipt-meta-row"><span className="pm-receipt-meta-label">Status</span><strong><span className={statusClass(detailRecord.payment_status)}>{detailRecord.payment_status || "Unpaid"}</span></strong></div>
                <div className="pm-receipt-meta-row"><span className="pm-receipt-meta-label">Reference No.</span><strong>{detailRecord.payment_reference || "—"}</strong></div>
                <div className="pm-receipt-meta-row"><span className="pm-receipt-meta-label">Consultation Date</span><strong>{formatDate(detailRecord.consultation_date)}</strong></div>
                <div className="pm-receipt-meta-row"><span className="pm-receipt-meta-label">Payment Type</span><strong>{detailRecord.payment_type || "Consultation"}</strong></div>
                <div className="pm-receipt-meta-row"><span className="pm-receipt-meta-label">Patient</span><strong>{detailRecord.pet_name || "—"}{detailRecord.pet_code ? ` · ${detailRecord.pet_code}` : ""}</strong></div>
                <div className="pm-receipt-meta-row"><span className="pm-receipt-meta-label">Pet Owner</span><strong>{detailRecord.owner_name || "—"}</strong></div>
                <div className="pm-receipt-meta-row pm-receipt-meta-row--full"><span className="pm-receipt-meta-label">Veterinarian</span><strong>{detailRecord.veterinarian_name || detailRecord.recorded_by_name || "—"}</strong></div>
              </div>

              <div className="pm-receipt-items">
                <div className="pm-receipt-items-head"><span>Service</span><span>Qty</span><span>Unit Price</span><span>Amount</span></div>
                {detailCharges.map((charge, index) => (
                  <div className="pm-receipt-items-row" key={`${charge.catalog_product_id || charge.description || "charge"}-${index}`}>
                    <span>{charge.description || charge.name || "Service"}</span>
                    <span>{charge.quantity || 1}</span>
                    <span>{formatMoney(charge.unit_price ?? charge.price ?? 0)}</span>
                    <span>{formatMoney(charge.line_total ?? charge.amount ?? 0)}</span>
                  </div>
                ))}
                {detailCharges.length === 0 && (
                  <div className="pm-receipt-items-row">
                    <span>{detailRecord.payment_type || "Consultation"}</span>
                    <span>1</span>
                    <span>{formatMoney(detailRecord.total_amount)}</span>
                    <span>{formatMoney(detailRecord.total_amount)}</span>
                  </div>
                )}
                <div className="pm-receipt-items-total"><span className="pm-receipt-items-total-label">Total</span><strong>{formatMoney(detailRecord.total_amount)}</strong></div>
              </div>

              <p className="pm-receipt-desc">
                <strong>Payment status:</strong> {detailRecord.payment_status || "Unpaid"} — clinic charges recorded by the veterinarian; Staff updates the payment status.
              </p>

              <div className="pm-receipt-sign">
                <div className="pm-receipt-sign-label">Received by</div>
                <div className="pm-receipt-sign-token">{staffName || "_______________________"}</div>
                <div className="pm-receipt-sign-role">Staff / Cashier{staffName ? " · e-signed" : ""}</div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
