import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  QrCode,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarDays,
  MapPin,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../services/api";
import { ALL_CABUYAO_BARANGAYS } from "../../data/cabuyaoBarangays";
import PrintReportButton from "../../components/staff/PrintReportButton";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const STATUS_COLORS = {
  Submitted: "#2563eb",
  Verified: "#16a34a",
  Rejected: "#dc2626",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function StatusPill({ status }) {
  return (
    <span
      style={{
        background: `${STATUS_COLORS[status] || "#6b7280"}1a`,
        color: STATUS_COLORS[status] || "#6b7280",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function SummaryCard({ label, value, sub, tone = "" }) {
  return (
    <div className={`summary-card ${tone ? `summary-card-${tone}` : ""}`}>
      <span className="summary-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="summary-card-label">{sub}</span>}
    </div>
  );
}

const pesoSymbol = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const EMPTY_FORM = {
  program_name: "",
  event_date: "",
  end_date: "",
  barangay: "",
  venue: "",
  notes: "",
  services: [],
};

export default function OutreachMonitoring() {
  const [programs, setPrograms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [program, setProgram] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("");
  const [q, setQ] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [programStatusFilter, setProgramStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savingProgram, setSavingProgram] = useState(false);
  const [formError, setFormError] = useState("");

  const [qrOpen, setQrOpen] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [freshQr, setFreshQr] = useState(null);

  const [verifying, setVerifying] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const [viewTarget, setViewTarget] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingTx, setDeletingTx] = useState(false);

  async function loadPrograms() {
    try {
      const response = await api.get("/outreach");
      if (response.data.success) setPrograms(response.data.programs);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load outreach programs.");
    }
  }

  async function loadAllSummary() {
    try {
      const response = await api.get("/outreach/summary");
      if (response.data.success) setSummary(response.data.summary);
    } catch (_) {
      /* ignore */
    }
  }

  async function selectProgram(id) {
    setSelectedId(id);
    setProgram(null);
    setSummary(null);
    setTransactions([]);
    try {
      const [progRes, sumRes, txRes] = await Promise.all([
        api.get(`/outreach/${id}`),
        api.get(`/outreach/${id}/summary`),
        api.get(`/outreach/${id}/transactions`),
      ]);
      setProgram(progRes.data.program);
      setSummary(sumRes.data.summary);
      setTransactions(txRes.data.transactions);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load program.");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPrograms(), loadAllSummary()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadTransactions(), 250);
    return () => clearTimeout(timer);
  }, [statusFilter, q]);

  async function loadTransactions() {
    if (!selectedId) return;
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (q) params.q = q;
      const response = await api.get(`/outreach/${selectedId}/transactions`, { params });
      if (response.data.success) setTransactions(response.data.transactions);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load transactions.");
    }
  }

  async function refreshCurrent() {
    await loadPrograms();
    if (selectedId) await selectProgram(selectedId);
  }

  const totals = summary ? summary.totals : null;

  const byBarangay = useMemo(
    () =>
      (summary ? summary.byBarangay : []).filter((b) =>
        barangayFilter ? b.barangay === barangayFilter : true
      ),
    [summary, barangayFilter]
  );

  const shownPrograms = useMemo(() => {
    const term = programSearch.trim().toLowerCase();
    return programs.filter((p) => {
      if (programStatusFilter && p.status !== programStatusFilter) return false;
      if (!term) return true;
      return [p.program_name, p.venue, p.barangay, p.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [programs, programSearch, programStatusFilter]);

  const shownTransactions = useMemo(
    () => (barangayFilter ? transactions.filter((t) => t.barangay === barangayFilter) : transactions),
    [transactions, barangayFilter]
  );

  // ---------------- program create / edit ----------------

  function openCreateProgram() {
    setForm({ ...EMPTY_FORM, services: [] });
    setProgram(null);
    setCreateOpen(true);
  }

  function openEditProgram() {
    setForm({
      program_name: program.program_name,
      event_date: program.event_date ? String(program.event_date).slice(0, 10) : "",
      end_date: program.end_date ? String(program.end_date).slice(0, 10) : "",
      barangay: program.barangay || "",
      venue: program.venue || "",
      notes: program.notes || "",
      services: (program.services || []).map((s) => ({ service_name: s.service_name, amount: s.amount })),
    });
    setCreateOpen(true);
  }

  function addServiceRow() {
    setForm((prev) => ({ ...prev, services: [...prev.services, { service_name: "", amount: "0.00" }] }));
  }
  function updateService(index, field, value) {
    setForm((prev) => {
      const services = prev.services.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      return { ...prev, services };
    });
  }
  function removeService(index) {
    setForm((prev) => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }));
  }

  async function handleCreateProgram(event) {
    event.preventDefault();
    setFormError("");
    setSavingProgram(true);
    try {
      const payload = {
        program_name: form.program_name,
        event_date: form.event_date || null,
        end_date: form.end_date || null,
        barangay: form.barangay || null,
        venue: form.venue || null,
        notes: form.notes || null,
        services: form.services
          .filter((s) => s.service_name.trim())
          .map((s) => ({ service_name: s.service_name.trim(), amount: s.amount })),
      };
      const response = await api.post("/outreach", payload);
      if (!response.data.success) {
        setFormError(response.data.message || "Could not create the program.");
        return;
      }
      toast.success(response.data.message);
      setCreateOpen(false);
      await loadPrograms();
      await loadAllSummary();
      if (response.data.id) {
        setSelectedId(response.data.id);
        await selectProgram(response.data.id);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not create the program.");
    } finally {
      setSavingProgram(false);
    }
  }

  async function saveProgram(event) {
    event.preventDefault();
    setFormError("");
    setSavingProgram(true);
    try {
      const payload = {
        program_name: form.program_name || program.program_name,
        event_date: form.event_date || null,
        end_date: form.end_date || null,
        barangay: form.barangay || null,
        venue: form.venue || null,
        notes: form.notes || null,
        status: program.status,
        services: form.services
          .filter((s) => s.service_name.trim())
          .map((s) => ({ service_name: s.service_name.trim(), amount: s.amount })),
      };
      const response = await api.put(`/outreach/${selectedId}`, payload);
      if (!response.data.success) {
        setFormError(response.data.message || "Could not update the program.");
        return;
      }
      toast.success(response.data.message);
      setCreateOpen(false);
      await refreshCurrent();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not update the program.");
    } finally {
      setSavingProgram(false);
    }
  }

  async function changeProgramStatus(status) {
    try {
      const response = await api.put(`/outreach/${selectedId}`, { status });
      if (response.data.success) {
        toast.success(`Program marked as ${status}.`);
        await refreshCurrent();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the status.");
    }
  }

  async function deleteProgram() {
    if (!window.confirm("Delete this outreach program? This cannot be undone.")) return;
    try {
      const response = await api.delete(`/outreach/${selectedId}`);
      toast.success(response.data.message);
      setSelectedId(null);
      setProgram(null);
      setQrOpen(false);
      await loadPrograms();
      await loadAllSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete the program.");
    }
  }

  // ---------------- single program QR ----------------

  async function handleGenerateQr() {
    if (!selectedId) return;
    setGeneratingQr(true);
    try {
      const response = await api.post(`/outreach/${selectedId}/generate-qr`, {});
      if (!response.data.success) {
        toast.error(response.data.message || "Could not generate the QR.");
        return;
      }
      setFreshQr({ qrToken: response.data.qrToken, qrImagePath: response.data.qrImagePath });
      toast.success(response.data.message);
      await loadPrograms();
      if (selectedId) {
        const progRes = await api.get(`/outreach/${selectedId}`);
        if (progRes.data.program) setProgram(progRes.data.program);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate the QR.");
    } finally {
      setGeneratingQr(false);
    }
  }

  function printProgramQr(imagePath, title) {
    if (!imagePath) return;
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Program QR</title>
      <style>
        body{font-family:Arial,sans-serif;text-align:center;padding:24px}
        h2{margin:0 0 4px;font-size:16px}
        p.sub{color:#666;margin:0 0 14px;font-size:12px}
        .qr{display:inline-block;border:2px dashed #999;border-radius:12px;padding:18px}
        img{width:240px;height:240px}
        .lbl{font-size:11px;color:#555;margin-top:10px}
      </style></head><body>
      <h2>${title}</h2>
      <p class="sub">City Veterinary Office of Cabuyao · Outreach Program</p>
      <div class="qr"><img src="${imagePath}" />
        <div class="lbl">Scan with your phone camera to confirm<br/>your pet's service and payment.</div>
      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    win.document.close();
  }

  // ---------------- verify / reject ----------------

  async function verifyTransaction(id) {
    setVerifying(id);
    try {
      const response = await api.post(`/outreach/transactions/${id}/verify`, {});
      toast.success(response.data.message);
      await refreshCurrent();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not verify the transaction.");
    } finally {
      setVerifying(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    try {
      const response = await api.post(`/outreach/transactions/${rejectTarget.id}/reject`, {
        reason: rejectReason,
      });
      toast.success(response.data.message);
      setRejectOpen(false);
      setRejectTarget(null);
      await refreshCurrent();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reject the transaction.");
    }
  }

  // ---------------- view / edit / delete transactions ----------------

  function openEditTransaction(t) {
    setEditTarget(t);
    setEditForm({
      owner_name: t.owner_name || "",
      owner_contact: t.owner_contact || "",
      pet_name: t.pet_name || "",
      barangay: t.barangay || "",
      service_date: t.service_date ? String(t.service_date).slice(0, 10) : "",
      service_time: t.service_time ? String(t.service_time).slice(0, 5) : "",
      items: (t.items || []).map((i) => ({
        service_name: i.service_name,
        amount: String(i.amount),
      })),
    });
    setEditError("");
    setEditOpen(true);
  }

  function addEditItem() {
    setEditForm((prev) => ({
      ...prev,
      items: [...(prev?.items || []), { service_name: "", amount: "0.00" }],
    }));
  }

  function updateEditItem(index, field, value) {
    setEditForm((prev) => {
      const items = (prev?.items || []).map((it, i) => (i === index ? { ...it, [field]: value } : it));
      return { ...prev, items };
    });
  }

  function removeEditItem(index) {
    setEditForm((prev) => ({
      ...prev,
      items: (prev?.items || []).filter((_, i) => i !== index),
    }));
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editTarget || !editForm) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const payload = {
        owner_name: editForm.owner_name,
        owner_contact: editForm.owner_contact,
        pet_name: editForm.pet_name,
        barangay: editForm.barangay,
        service_date: editForm.service_date || null,
        service_time: editForm.service_time || null,
        items: (editForm.items || [])
          .filter((it) => String(it.service_name || "").trim())
          .map((it) => ({ service_name: String(it.service_name).trim(), amount: it.amount })),
      };
      const response = await api.put(`/outreach/transactions/${editTarget.id}`, payload);
      if (!response.data.success) {
        setEditError(response.data.message || "Could not update the transaction.");
        return;
      }
      toast.success(response.data.message);
      setEditOpen(false);
      setEditTarget(null);
      await refreshCurrent();
    } catch (err) {
      setEditError(err.response?.data?.message || "Could not update the transaction.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDeleteTx() {
    if (!deleteTarget) return;
    setDeletingTx(true);
    try {
      const response = await api.delete(`/outreach/transactions/${deleteTarget.id}`);
      toast.success(response.data.message);
      setDeleteTarget(null);
      await refreshCurrent();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete the transaction.");
    } finally {
      setDeletingTx(false);
    }
  }

  // ---------------- export ----------------

  function buildReportData() {
    const txs = shownTransactions;
    const ct = { submitted: 0, verified: 0, rejected: 0, amount: 0 };
    for (const t of txs) {
      ct[t.status.toLowerCase()] = (ct[t.status.toLowerCase()] || 0) + 1;
      if (t.status === "Verified") ct.amount += Number(t.total_amount || 0);
    }
    return {
      program: program?.program_name || "All Outreach Programs",
      date: program?.event_date ? formatDate(program.event_date) : "—",
      txs,
      ct,
      byBarangay: summary?.byBarangay || [],
    };
  }

  async function exportExcel() {
    const data = buildReportData();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "City Vet Cabuyao";

    const ws = workbook.addWorksheet("Summary");
    ws.addRows([
      ["Outreach Program", data.program],
      ["Event Date", data.date],
      [],
      ["Metric", "Value"],
      ["Total Transactions", data.txs.length],
      ["Pending Payment (Submitted)", data.ct.submitted],
      ["Paid (Verified)", data.ct.verified],
      ["Rejected", data.ct.rejected || 0],
      ["Paid Amount", data.ct.amount],
    ]);
    ws.getColumn(1).width = 30;
    ws.getColumn(2).width = 18;

    const bw = workbook.addWorksheet("By Barangay");
    bw.addRow(["Barangay", "Transactions", "Paid", "Amount"]);
    data.byBarangay.forEach((b) => bw.addRow([b.barangay, b.total, b.verified, b.amount]));
    bw.getRow(1).font = { bold: true };
    bw.columns = [{ width: 22 }, { width: 12 }, { width: 12 }, { width: 14 }];

    const txWs = workbook.addWorksheet("Transactions");
    txWs.addRow(["Owner", "Pet", "Date", "Time", "Barangay", "Services", "Payment", "Status", "Submitted"]);
    txWs.getRow(1).font = { bold: true };
    data.txs.forEach((t) => {
      txWs.addRow([
        t.owner_name,
        t.pet_name,
        formatDate(t.service_date),
        formatTime(t.service_time),
        t.barangay,
        (t.items || []).map((i) => `${i.service_name} (${pesoSymbol.format(i.amount)})`).join(", "),
        Number(t.total_amount || 0),
        t.status,
        formatDate(t.submitted_at),
      ]);
    });
    txWs.columns = [
      { width: 24 },
      { width: 14 },
      { width: 14 },
      { width: 10 },
      { width: 14 },
      { width: 46 },
      { width: 12 },
      { width: 12 },
      { width: 16 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Outreach-Payment-Report-${data.program.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Excel report downloaded.");
  }

  function exportPDF() {
    const data = buildReportData();
    const doc = new jsPDF();
    doc.setFontSize(15);
    doc.text("City Vet Outreach Payment Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Program: ${data.program}`, 14, 24);
    doc.text(`Event date: ${data.date}`, 14, 29);

    autoTable(doc, {
      startY: 36,
      head: [["Metric", "Value"]],
      body: [
        ["Total Transactions", data.txs.length],
        ["Pending Payment (Submitted)", data.ct.submitted],
        ["Paid (Verified)", data.ct.verified],
        ["Rejected", data.ct.rejected || 0],
        ["Paid Amount", pesoSymbol.format(data.ct.amount)],
      ],
    });

    if (data.byBarangay.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [["Barangay", "Transactions", "Paid", "Amount"]],
        body: data.byBarangay.map((b) => [b.barangay, b.total, b.verified, pesoSymbol.format(b.amount)]),
      });
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Owner", "Pet", "Date", "Time", "Status", "Payment"]],
      body: data.txs.map((t) => [
        t.owner_name,
        t.pet_name,
        formatDate(t.service_date),
        formatTime(t.service_time),
        t.status,
        pesoSymbol.format(t.total_amount || 0),
      ]),
    });

    doc.save(`Outreach-Payment-Report-${data.program.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF report downloaded.");
  }

  // ---------------- render ----------------

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0" }}>Loading...</div>;
  }

  const selectedRecord = selectedId ? programs.find((p) => String(p.id) === String(selectedId)) : null;
  const programQrPath = (freshQr && freshQr.qrImagePath) || program?.qr_image_path || selectedRecord?.qr_image_path || null;
  const resolvedProgramQrPath = programQrPath ? resolveMediaUrl(programQrPath) : null;
  const programQrToken = (freshQr && freshQr.qrToken) || program?.qr_token || selectedRecord?.qr_token || "";

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Outreach Program Payment Monitoring</h1>
          <p className="page-intro">
            Track outreach payments per barangay. Generate one QR per program and let pet owners
            confirm their services by scanning it with their phone.
          </p>
        </div>
        <div className="page-header-actions">
          <PrintReportButton category="outreach" />
          {selectedId && (
            <button
              className="btn-secondary"
              onClick={() => setQrOpen(true)}
            >
              <QrCode size={15} /> Program QR
            </button>
          )}
          <button
            className="btn-primary"
            onClick={openCreateProgram}
          >
            <Plus size={15} /> Create Program
          </button>
        </div>
      </div>

      {/* summary */}
      <div className="summary-grid">
        <SummaryCard label="Total Transactions" value={totals ? totals.total : "—"} sub="All confirmations received" />
        <SummaryCard label="Total Amount" value={totals ? pesoSymbol.format(totals.totalAmount) : "—"} sub="Expected collections" tone="info" />
        <SummaryCard label="Paid" value={totals ? `${totals.verified} · ${pesoSymbol.format(totals.verifiedAmount)}` : "—"} sub="Verified / paid at counter" tone="success" />
        <SummaryCard label="Pending Payment" value={totals ? totals.submitted : "—"} sub="Awaiting counter payment" tone="warning" />
        <SummaryCard label="Rejected" value={totals ? totals.rejected : "—"} sub="Cancelled entries" tone="danger" />
      </div>

      {/* programs list */}
      <div className="panel-card" style={{ marginTop: 18 }}>
        <div className="table-header-row">
          <div>
            <h2>{selectedId ? "Selected Program" : "Outreach Programs"}</h2>
            <p>
              {selectedId
                ? "Click a different program below to switch."
                : "Select a program to open its monitoring panel."}
            </p>
          </div>
          <div className="table-meta">
            {programs.length === shownPrograms.length
              ? `${programs.length} programs`
              : `${shownPrograms.length} of ${programs.length} programs`}
          </div>
        </div>

        <div className="toolbar-row" style={{ marginBottom: 12 }}>
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              value={programSearch}
              onChange={(e) => setProgramSearch(e.target.value)}
              placeholder="Search program, venue, barangay..."
              aria-label="Search outreach programs"
            />
          </div>
          <select
            value={programStatusFilter}
            onChange={(e) => setProgramStatusFilter(e.target.value)}
            aria-label="Filter programs by status"
            className="toolbar-select--wide"
          >
            <option value="">All Statuses</option>
            <option value="Setup">Setup</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {selectedRecord &&
          (() => {
            const p = selectedRecord;
            return (
              <div className="panel-card" style={{ background: "#f8fafc", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    {p.qr_image_path && (
                      <img
                        src={resolveMediaUrl(p.qr_image_path)}
                        alt="Program QR"
                        style={{
                          width: 74,
                          height: 74,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          padding: 4,
                          background: "#fff",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        onClick={() => setQrOpen(true)}
                        title="Open Program QR"
                      />
                    )}
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <h3 style={{ margin: 0 }}>{p.program_name}</h3>
                      <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>
                        <CalendarDays size={13} style={{ verticalAlign: -2 }} /> {formatDate(p.event_date)}
                        {p.end_date ? ` – ${formatDate(p.end_date)}` : ""}
                        {p.venue && (
                          <>
                            {"  "}· <MapPin size={13} style={{ verticalAlign: -2 }} /> {p.venue}
                          </>
                        )}
                        {p.barangay ? ` · ${p.barangay}` : " · Citywide"}
                      </p>
                      {p.notes && <p style={{ color: "#6B7280", fontSize: 13, margin: "6px 0 0" }}>{p.notes}</p>}
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {p.services.map((s) => (
                          <span key={s.id} className="status-pill" style={{ background: "#0b3d2e", color: "#fff" }}>
                            {s.service_name} · {pesoSymbol.format(s.amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <StatusPill status={p.status} />
                    {p.status === "Setup" && (
                      <button
                        className="btn-secondary"
                        onClick={() => changeProgramStatus("Ongoing")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.4rem 0.85rem", fontSize: 13, margin: 0, height: "32px" }}
                      >
                        Start Event
                      </button>
                    )}
                    {p.status === "Ongoing" && (
                      <button
                        className="btn-secondary"
                        onClick={() => changeProgramStatus("Completed")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.4rem 0.85rem", fontSize: 13, margin: 0, height: "32px" }}
                      >
                        Complete
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={openEditProgram}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.4rem 0.85rem", fontSize: 13, margin: 0, height: "32px" }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete-text"
                      onClick={deleteProgram}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.4rem 0.85rem", fontSize: 13, height: "32px" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {!p.qr_image_path && (
                  <button className="btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => setQrOpen(true)}>
                    <QrCode size={14} /> Generate Program QR
                  </button>
                )}
              </div>
            );
          })()}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Date</th>
                <th>Barangay</th>
                <th>Status</th>
                <th>Transactions</th>
                <th>Paid</th>
                <th>Collected</th>
              </tr>
            </thead>
            <tbody>
              {shownPrograms.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state-cell">
                    {programs.length === 0
                      ? 'No outreach programs yet. Click "Create Program" to get started.'
                      : "No programs match your filters."}
                  </td>
                </tr>
              ) : (
                shownPrograms.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => selectProgram(p.id)}
                    style={{ cursor: "pointer", background: String(selectedId) === String(p.id) ? "#eef7f0" : undefined }}
                    title="Open program"
                  >
                    <td data-label="Program" style={{ fontWeight: 600 }}>
                      {p.program_name}
                      {p.qr_image_path && (
                        <QrCode size={13} style={{ verticalAlign: -2, marginLeft: 6, color: "#0b3d2e" }} />
                      )}
                    </td>
                    <td data-label="Date">{formatDate(p.event_date)}</td>
                    <td data-label="Barangay">{p.barangay || "Citywide"}</td>
                    <td data-label="Status">
                      <StatusPill status={p.status} />
                    </td>
                    <td data-label="Transactions">{p.total_transactions}</td>
                    <td data-label="Paid">{p.verified_transactions}</td>
                    <td data-label="Collected">{pesoSymbol.format(p.verified_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && program && (
        <>
          {/* per barangay */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="table-header-row">
              <div>
                <h2>Per Barangay</h2>
                <p>Breakdown of transactions and payments per barangay.</p>
              </div>
              <div className="table-meta">{byBarangay.length} barangay</div>
            </div>
            <div className="toolbar-row">
              <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)} aria-label="Filter by barangay">
                <option value="">All Barangays</option>
                {ALL_CABUYAO_BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Barangay</th>
                    <th>Transactions</th>
                    <th>Paid</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {byBarangay.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state-cell">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    byBarangay.map((b) => (
                      <tr key={b.barangay}>
                        <td data-label="Barangay" style={{ fontWeight: 600 }}>{b.barangay}</td>
                        <td data-label="Transactions">{b.total}</td>
                        <td data-label="Paid">{b.verified}</td>
                        <td data-label="Amount">{pesoSymbol.format(b.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* transactions */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="table-header-row">
              <div>
                <h2>Transactions</h2>
                <p>Mark confirmations as paid (verified) or reject when found invalid.</p>
              </div>
              <div className="table-meta" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="btn-secondary"
                  onClick={exportExcel}
                  title="Excel export"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.45rem 0.85rem", fontSize: 13, margin: 0 }}
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button
                  className="btn-secondary"
                  onClick={exportPDF}
                  title="PDF export"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.45rem 0.85rem", fontSize: 13, margin: 0 }}
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>
            <div className="toolbar-row">
              <div className="search-wrap" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search owner, pet, barangay..."
                  aria-label="Search outreach transactions"
                  style={{ paddingLeft: "2.2rem", paddingRight: "0.8rem" }}
                />
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                <option value="">All Status</option>
                <option value="Submitted">Pending Payment</option>
                <option value="Verified">Paid</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={barangayFilter}
                onChange={(e) => setBarangayFilter(e.target.value)}
                aria-label="Filter transactions by barangay"
                className="toolbar-select--barangay"
              >
                <option value="">All Barangays</option>
                {ALL_CABUYAO_BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Pet</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Barangay</th>
                    <th>Services</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th style={{ whiteSpace: "nowrap", width: 230 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shownTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="empty-state-cell">
                        No transactions match your filters.
                      </td>
                    </tr>
                  ) : (
                    shownTransactions.map((t) => (
                      <tr key={t.id}>
                        <td data-label="Owner" style={{ fontWeight: 600 }}>{t.owner_name || "—"}</td>
                        <td data-label="Pet">{t.pet_name || "—"}</td>
                        <td data-label="Date">{formatDate(t.service_date)}</td>
                        <td data-label="Time">{formatTime(t.service_time)}</td>
                        <td data-label="Barangay">{t.barangay || "—"}</td>
                        <td data-label="Services" style={{ fontSize: 13 }}>
                          {(t.items || []).map((i) => `${i.service_name} (₱${Number(i.amount).toFixed(0)})`).join(", ") || "—"}
                        </td>
                        <td data-label="Payment" style={{ fontWeight: 700 }}>{pesoSymbol.format(t.total_amount || 0)}</td>
                        <td data-label="Status">
                          <StatusPill status={t.status} />
                        </td>
                        <td data-label="Submitted">{formatDate(t.submitted_at)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              className="btn-icon"
                              onClick={() => setViewTarget(t)}
                              title="View details"
                              aria-label={`View transaction for ${t.owner_name || "owner"}`}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => openEditTransaction(t)}
                              title="Edit transaction"
                              aria-label={`Edit transaction for ${t.owner_name || "owner"}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="btn-icon btn-icon--danger"
                              onClick={() => setDeleteTarget(t)}
                              title="Delete transaction"
                              aria-label={`Delete transaction for ${t.owner_name || "owner"}`}
                            >
                              <Trash2 size={15} />
                            </button>
                            <span style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 4px", flexShrink: 0 }} />
                            {t.status === "Submitted" && (
                              <>
                                <button
                                  className="btn-primary btn-sm"
                                  onClick={() => verifyTransaction(t.id)}
                                  disabled={verifying === t.id}
                                  title="Mark as paid"
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 85, justifyContent: "center", height: "30px" }}
                                >
                                  {verifying === t.id ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                                  Verify
                                </button>
                                <button
                                  className="btn-secondary btn-sm"
                                  onClick={() => {
                                    setRejectTarget(t);
                                    setRejectReason("");
                                    setRejectOpen(true);
                                  }}
                                  title="Reject / cancel"
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 85, justifyContent: "center", height: "30px" }}
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </>
                            )}
                            {t.status === "Verified" && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                                <CheckCircle2 size={14} /> Paid
                              </span>
                            )}
                            {t.status === "Rejected" && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                                <XCircle size={14} /> Rejected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ---------- CREATE / EDIT PROGRAM MODAL ---------- */}
      {createOpen && (
        <Overlay onClose={() => setCreateOpen(false)}>
          <div style={{ maxWidth: 620, width: "100%", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>{program ? "Edit Program" : "Create Outreach Program"}</h2>
            <form onSubmit={program ? saveProgram : handleCreateProgram}>
              <div className="field-group">
                <label>Program Name *</label>
                <input
                  className="form-control"
                  required
                  value={form.program_name || program?.program_name || ""}
                  onChange={(e) => setForm({ ...form, program_name: e.target.value })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field-group">
                  <label>Event Date</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.event_date || program?.event_date?.slice(0, 10) || ""}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  />
                </div>
                <div className="field-group">
                  <label>End Date</label>
                  <input className="form-control" type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field-group">
                  <label>Barangay</label>
                  <input
                    className="form-control"
                    list="program-barangay-list"
                    value={form.barangay || program?.barangay || ""}
                    onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                    placeholder="(blank = citywide)"
                  />
                  <datalist id="program-barangay-list">
                    {ALL_CABUYAO_BARANGAYS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div className="field-group">
                  <label>Venue</label>
                  <input className="form-control" value={form.venue || program?.venue || ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                </div>
              </div>

              <div className="field-group">
                <label>Services & Prices</label>
                {form.services.map((s, index) => (
                  <div key={index} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input
                      className="form-control"
                      style={{ flex: 1 }}
                      placeholder="Service (e.g. Anti-Rabies)"
                      value={s.service_name}
                      onChange={(e) => updateService(index, "service_name", e.target.value)}
                    />
                    <input
                      className="form-control"
                      style={{ width: 110 }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={s.amount}
                      onChange={(e) => updateService(index, "amount", e.target.value)}
                    />
                    <button type="button" className="btn-delete-text" onClick={() => removeService(index)}>
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="btn-secondary btn-sm" onClick={addServiceRow}>
                  + Add service
                </button>
              </div>

              <div className="field-group">
                <label>Notes</label>
                <textarea className="form-control" rows={2} value={form.notes || program?.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              {formError && <div className="form-error">{formError}</div>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingProgram}>
                  {savingProgram ? "Saving..." : program ? "Save Changes" : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {/* ---------- PROGRAM QR MODAL ---------- */}
      {qrOpen && (program || selectedRecord) && (
        <Overlay onClose={() => setQrOpen(false)}>
          <div style={{ maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: 22, textAlign: "center" }}>
            <h2 style={{ marginTop: 0 }}>Program QR</h2>
            <p style={{ color: "#6B7280", marginTop: 0 }}>
              One QR for the entire program — every pet owner scans the same code to confirm their details,
              pet, service and payment. Print the QR and post it at the venue.
            </p>

            {programQrPath ? (
              <>
                <img
                  src={resolvedProgramQrPath}
                  alt="Program QR"
                  style={{ width: 220, height: 220, border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}
                />
                <p style={{ fontSize: 12, color: "#9CA3AF", wordBreak: "break-all", margin: "8px 0 14px" }}>
                  {programQrToken}
                </p>
                <div className="form-actions" style={{ justifyContent: "center" }}>
                  <a href={resolvedProgramQrPath} download className="btn-secondary btn-sm">
                    <Download size={14} /> Download
                  </a>
                  <button className="btn-primary btn-sm" onClick={() => printProgramQr(resolvedProgramQrPath, (program || selectedRecord)?.program_name || "Outreach Program")}>
                    <Printer size={14} /> Print Sticker
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: "#9CA3AF" }}>This program does not have a QR yet.</p>
            )}

            <div style={{ marginTop: 18, borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <button className="btn-secondary btn-sm" onClick={handleGenerateQr} disabled={generatingQr}>
                {generatingQr ? (
                  <>
                    <Loader2 size={14} /> Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} /> {programQrPath ? "Regenerate QR" : "Generate QR"}
                  </>
                )}
              </button>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>
                Regenerating replaces the current QR. Print new copies right after.
              </p>
            </div>
          </div>
        </Overlay>
      )}

      {/* ---------- REJECT MODAL ---------- */}
      {rejectOpen && rejectTarget && (
        <Overlay onClose={() => setRejectOpen(false)}>
          <div style={{ maxWidth: 460, width: "100%", background: "#fff", borderRadius: 14, padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>Reject / Cancel</h2>
            <p>
              {rejectTarget.owner_name || "Unnamed"} · {pesoSymbol.format(rejectTarget.total_amount || 0)}
            </p>
            <div className="field-group">
              <label>Reason (optional)</label>
              <input
                className="form-control"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Wrong entry, duplicate, owner did not proceed..."
              />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setRejectOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: "#dc2626" }} onClick={confirmReject}>
                Reject
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ---------- VIEW TRANSACTION MODAL ---------- */}
      {viewTarget && (
        <Overlay onClose={() => setViewTarget(null)}>
          <div style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 4 }}>Transaction Details</h2>
                <p style={{ margin: 0, color: "#6B7280", fontSize: 13 }}>
                  {viewTarget.program_name || "Outreach program"} · {formatDate(viewTarget.service_date)}
                </p>
              </div>
              <StatusPill status={viewTarget.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 18px", marginTop: 18 }}>
              <div>
                <label className="tx-detail-label">Owner Name</label>
                <p className="tx-detail-value">{viewTarget.owner_name || "—"}</p>
              </div>
              <div>
                <label className="tx-detail-label">Contact Number</label>
                <p className="tx-detail-value">{viewTarget.owner_contact || "—"}</p>
              </div>
              <div>
                <label className="tx-detail-label">Pet Name</label>
                <p className="tx-detail-value">{viewTarget.pet_name || "—"}</p>
              </div>
              <div>
                <label className="tx-detail-label">Barangay</label>
                <p className="tx-detail-value">{viewTarget.barangay || "—"}</p>
              </div>
              <div>
                <label className="tx-detail-label">Service Date</label>
                <p className="tx-detail-value">{formatDate(viewTarget.service_date)}</p>
              </div>
              <div>
                <label className="tx-detail-label">Service Time</label>
                <p className="tx-detail-value">{formatTime(viewTarget.service_time)}</p>
              </div>
              <div>
                <label className="tx-detail-label">Total Amount</label>
                <p className="tx-detail-value" style={{ color: "#0b3d2e", fontWeight: 700 }}>
                  {pesoSymbol.format(viewTarget.total_amount || 0)}
                </p>
              </div>
              <div>
                <label className="tx-detail-label">Submitted At</label>
                <p className="tx-detail-value">
                  {viewTarget.submitted_at ? formatDate(viewTarget.submitted_at) : "—"}
                </p>
              </div>
              {viewTarget.verified_at && (
                <div>
                  <label className="tx-detail-label">Verified At</label>
                  <p className="tx-detail-value">{formatDate(viewTarget.verified_at)}</p>
                </div>
              )}
              {viewTarget.rejection_reason && (
                <div>
                  <label className="tx-detail-label">Rejection Reason</label>
                  <p className="tx-detail-value" style={{ color: "#dc2626" }}>{viewTarget.rejection_reason}</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <label className="tx-detail-label">Services</label>
              <table className="data-table" style={{ marginTop: 6 }}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewTarget.items || []).length === 0 ? (
                    <tr>
                      <td colSpan="2" className="empty-state-cell">No services recorded.</td>
                    </tr>
                  ) : (
                    viewTarget.items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.service_name}</td>
                        <td>{pesoSymbol.format(it.amount || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="form-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setViewTarget(null)}>
                Close
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ---------- EDIT TRANSACTION MODAL ---------- */}
      {editOpen && editTarget && editForm && (
        <Overlay onClose={() => setEditOpen(false)}>
          <div style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: 22 }}>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Edit Transaction</h2>
            <p style={{ margin: 0, color: "#6B7280", fontSize: 13 }}>
              Update the recorded details. The total is recomputed from the services below.
            </p>

            <form onSubmit={saveEdit} style={{ marginTop: 16 }}>
              <div className="field-group">
                <label>Owner Name *</label>
                <input
                  className="form-control"
                  required
                  value={editForm.owner_name}
                  onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field-group">
                  <label>Contact Number</label>
                  <input
                    className="form-control"
                    type="tel"
                    value={editForm.owner_contact}
                    onChange={(e) => setEditForm({ ...editForm, owner_contact: e.target.value })}
                    placeholder="e.g. 0917 123 4567"
                  />
                </div>
                <div className="field-group">
                  <label>Pet Name</label>
                  <input
                    className="form-control"
                    value={editForm.pet_name}
                    onChange={(e) => setEditForm({ ...editForm, pet_name: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field-group">
                  <label>Barangay</label>
                  <input
                    className="form-control"
                    list="tx-barangay-list"
                    value={editForm.barangay}
                    onChange={(e) => setEditForm({ ...editForm, barangay: e.target.value })}
                    placeholder="(blank = citywide)"
                  />
                  <datalist id="tx-barangay-list">
                    {ALL_CABUYAO_BARANGAYS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div className="field-group">
                  <label>Service Date</label>
                  <input
                    className="form-control"
                    type="date"
                    value={editForm.service_date}
                    onChange={(e) => setEditForm({ ...editForm, service_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="field-group">
                <label>Service Time</label>
                <input
                  className="form-control"
                  type="time"
                  value={editForm.service_time}
                  onChange={(e) => setEditForm({ ...editForm, service_time: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label>Services & Amounts</label>
                {(editForm.items || []).map((it, index) => (
                  <div key={index} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input
                      className="form-control"
                      style={{ flex: 1 }}
                      placeholder="Service (e.g. Anti-Rabies)"
                      value={it.service_name}
                      onChange={(e) => updateEditItem(index, "service_name", e.target.value)}
                    />
                    <input
                      className="form-control"
                      style={{ width: 110 }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.amount}
                      onChange={(e) => updateEditItem(index, "amount", e.target.value)}
                    />
                    <button type="button" className="btn-delete-text" onClick={() => removeEditItem(index)} aria-label="Remove service">
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="btn-secondary btn-sm" onClick={addEditItem}>
                  + Add service
                </button>
              </div>

              {editError && <div className="form-error">{editError}</div>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {/* ---------- DELETE TRANSACTION MODAL ---------- */}
      {deleteTarget && (
        <Overlay onClose={() => setDeleteTarget(null)}>
          <div style={{ maxWidth: 420, width: "100%", background: "#fff", borderRadius: 14, padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>Delete Transaction</h2>
            <p>
              Delete the recorded transaction of{" "}
              <strong>{deleteTarget.owner_name || "unknown owner"}</strong> ({pesoSymbol.format(deleteTarget.total_amount || 0)})?
              This cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deletingTx}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: "#dc2626" }} onClick={confirmDeleteTx} disabled={deletingTx}>
                {deletingTx ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        padding: "40px 16px",
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}