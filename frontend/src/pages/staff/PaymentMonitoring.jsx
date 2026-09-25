import { useEffect, useMemo, useState } from "react";
import { Eye, PawPrint, Search, Stethoscope, Syringe, Pill, UserRound } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import PrintReportButton from "../../components/staff/PrintReportButton";

const STATUS_OPTIONS = ["Unpaid", "Paid", "Cancelled"];
const TYPE_ICON = { Consultation: Stethoscope, Vaccination: Syringe, Medicine: Pill };

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
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ overall: { total_payments: 0, total_amount: 0 }, summary: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  function loadRecords(params = {}) {
    const query = { ...params };
    if (query.status === "All") delete query.status;
    return api.get("/payment-monitoring", { params: query }).then((response) => setRecords(response.data.records || []));
  }

  function loadSummary() {
    return api.get("/payment-monitoring/summary").then((response) => setSummary({
      overall: response.data.overall || { total_payments: 0, total_amount: 0 },
      summary: response.data.summary || {},
      byType: response.data.byType || [],
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
  }, [searchTerm, statusFilter, fromDate, toDate]);

  const visibleRecords = useMemo(() => records, [records]);
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
          <p className="page-intro">Monitor consultation charges created by the veterinarian and update payment status.</p>
        </div>
        <div className="page-header-actions"><PrintReportButton category="payments" /></div>
      </div>

      <div className="summary-grid">
        <div className="summary-card summary-card-info"><span className="summary-label">Total Transactions</span><strong>{summary.overall?.total_payments || 0}</strong></div>
        <div className="summary-card summary-card-success"><span className="summary-label">Total Amount</span><strong>{formatMoney(summary.overall?.total_amount)}</strong></div>
        {statusCards.map((card) => <div className={`summary-card ${card.className}`} key={card.label}><span className="summary-label">{card.label}</span><strong>{card.value}</strong><small>{formatMoney(card.amount)}</small></div>)}
      </div>

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div><h2>Consultation Payments</h2><p>One payment transaction is created for each completed consultation.</p></div>
          <div className="table-meta">{visibleRecords.length} records</div>
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
              {loading ? <tr><td colSpan="7" className="empty-state-cell">Loading payment records...</td></tr> : visibleRecords.length === 0 ? <tr><td colSpan="7" className="empty-state-cell">{searchTerm || statusFilter !== "All" || fromDate || toDate ? "No payment records match your filters." : "No consultation payments yet."}</td></tr> : visibleRecords.map((record) => {
                const charges = getCharges(record);
                const TypeIcon = TYPE_ICON[record.payment_type] || Stethoscope;
                return <tr key={record.id}>
                  <td data-label="Reference" className="cell-strong">{record.payment_reference || "—"}</td>
                  <td data-label="Date">{formatDate(record.consultation_date)}</td>
                  <td data-label="Patient"><div className="pm-patient-cell"><PawPrint size={14} /><div><strong>{record.pet_name || "—"}</strong><span>{record.pet_code || "—"}</span></div></div><div className="cell-muted">{record.owner_name || "—"}</div></td>
                  <td data-label="Services"><div className="pm-service-cell"><TypeIcon size={14} /><span>{charges.length ? `${charges.length} service${charges.length === 1 ? "" : "s"}` : record.payment_type || "Consultation"}</span></div></td>
                  <td data-label="Amount"><strong>{formatMoney(record.total_amount)}</strong></td>
                  <td data-label="Status"><span className={statusClass(record.payment_status)}>{record.payment_status || "Unpaid"}</span></td>
                  <td data-label="Action"><div className="table-actions"><select className="pm-status-select" value={record.payment_status || "Unpaid"} onChange={(event) => updateStatus(record.id, event.target.value)} disabled={updatingId === record.id} aria-label={`Update status for ${record.payment_reference || "payment"}`}><option value="Unpaid">Unpaid</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option></select><button type="button" className="btn-icon-action" onClick={() => setDetailRecord(record)} aria-label={`View ${record.payment_reference || "payment"}`} title="View details"><Eye size={15} /></button></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailRecord && <div className="logout-modal-overlay" onClick={() => setDetailRecord(null)}><div className="barangay-pets-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pm-detail-title"><div className="barangay-pets-modal-header"><div className="barangay-pets-modal-title"><div className="barangay-pets-modal-icon"><Stethoscope /></div><div><h3 id="pm-detail-title">Payment details</h3><p>{detailRecord.payment_reference || "Consultation payment"}</p></div></div><button type="button" className="barangay-modal-close" onClick={() => setDetailRecord(null)} aria-label="Close">×</button></div><div className="pm-detail-content"><div className="clinical-detail-grid"><div className="clinical-detail-item"><span>Status</span><strong><span className={statusClass(detailRecord.payment_status)}>{detailRecord.payment_status || "Unpaid"}</span></strong></div><div className="clinical-detail-item"><span>Amount</span><strong>{formatMoney(detailRecord.total_amount)}</strong></div><div className="clinical-detail-item"><span>Consultation Date</span><strong>{formatDate(detailRecord.consultation_date)}</strong></div><div className="clinical-detail-item"><span>Patient</span><strong>{detailRecord.pet_name || "—"} {detailRecord.pet_code ? `· ${detailRecord.pet_code}` : ""}</strong></div><div className="clinical-detail-item"><span>Pet Owner</span><strong>{detailRecord.owner_name || "—"}</strong></div><div className="clinical-detail-item"><span>Veterinarian</span><strong>{detailRecord.veterinarian_name || detailRecord.recorded_by_name || "—"}</strong></div></div><div className="field-group pm-status-editor"><label htmlFor="detail-payment-status">Update payment status</label><select id="detail-payment-status" value={detailRecord.payment_status || "Unpaid"} onChange={(event) => updateStatus(detailRecord.id, event.target.value)} disabled={updatingId === detailRecord.id}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div className="clinical-detail-section"><h4>Charges</h4><div className="pm-detail-items"><div className="pm-detail-items-row pm-detail-items-head"><span>Service</span><span>Qty</span><span>Amount</span></div>{getCharges(detailRecord).map((charge, index) => <div className="pm-detail-items-row" key={`${charge.catalog_product_id || charge.description || "charge"}-${index}`}><span>{charge.description || charge.name || "Service"}</span><span>{charge.quantity || 1}</span><span>{formatMoney(charge.line_total ?? charge.amount ?? (Number(charge.unit_price || charge.price || 0) * Number(charge.quantity || 1)))}</span></div>)}<div className="pm-detail-items-row pm-detail-items-total"><span>Total</span><span /><strong>{formatMoney(detailRecord.total_amount)}</strong></div></div></div><div className="pm-audit-note"><UserRound size={14} /> Clinical charges are created by the veterinarian. Staff can update payment status only.</div></div></div></div>}
    </div>
  );
}
