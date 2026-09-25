import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ClipboardList, Plus, Trash2 } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import useMinLoading from "../../hooks/useMinLoading";
import FieldError from "../../components/ui/FieldError";
import { validateClinicalRecord } from "../../utils/validation";
import PrintReportButton from "../../components/staff/PrintReportButton";

function todayValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function formatMoney(value) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClinicalRecords() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queueId = searchParams.get("queue_id");
  const [records, setRecords] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [queueEntry, setQueueEntry] = useState(null);
  const [catalogGroups, setCatalogGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoading(loading);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    complaint: "",
    diagnosis: "",
    treatment_plan: "",
    consultation_date: todayValue(),
    follow_up_date: "",
  });
  const [charges, setCharges] = useState([]);
  const [recordSearch, setRecordSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const templates = [
    { label: "Anti-Rabies Vaccination", diagnosis: "Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.", treatment: "Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day." },
    { label: "Deworming", diagnosis: "Routine deworming visit. Pet in generally good condition.", treatment: "Administered broad-spectrum dewormer. Advise repeat deworming after 3 months." },
    { label: "Skin Infection", diagnosis: "Presence of itching, redness, and hair loss on affected skin area.", treatment: "Prescribed medicated shampoo and antihistamines as needed. Follow-up check after 2 weeks." },
    { label: "Respiratory Infection", diagnosis: "Coughing and nasal discharge observed; possible upper respiratory tract infection.", treatment: "Prescribed antibiotics for 7 days. Isolate pet from other animals until cleared." },
    { label: "Wound Care", diagnosis: "Open wound noted on body; cleaned and assessed during consultation.", treatment: "Cleaned and dressed wound. Prescribed antibiotics and pain relief as needed." },
  ];

  function loadRecords() {
    return api.get("/clinical").then((res) => setRecords(res.data.records || [])).catch(() => setRecords([]));
  }

  function loadQueue() {
    return api.get("/clinic-queue").then((res) => {
      const nextEntries = res.data.entries || [];
      setQueueEntries(nextEntries);
      if (queueId) {
        const next = nextEntries.find((entry) => String(entry.id) === String(queueId)) || null;
        setQueueEntry(next);
      } else {
        setQueueEntry(null);
      }
      return nextEntries;
    }).catch(() => {
      setQueueEntries([]);
      setQueueEntry(null);
    });
  }

  function loadCatalog() {
    return api.get("/catalog").then((res) => setCatalogGroups(res.data.categories || [])).catch(() => setCatalogGroups([]));
  }

  useEffect(() => {
    Promise.all([loadRecords(), loadQueue(), loadCatalog()]).finally(() => setLoading(false));
  }, [queueId]);

  const availableYears = useMemo(() => {
    const years = new Set();
    records.forEach((record) => {
      if (!record.consultation_date) return;
      const year = String(record.consultation_date).slice(0, 4);
      if (/^\d{4}$/.test(year)) years.add(Number(year));
    });
    return [...years].sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    const term = recordSearch.trim().toLowerCase();
    return records.filter((record) => {
      const iso = String(record.consultation_date || "").slice(0, 10);
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      if (yearFilter && iso.slice(0, 4) !== yearFilter) return false;
      if (!term) return true;
      return [record.pet_name, record.pet_code, record.owner_name, record.diagnosis, record.treatment_plan, record.vet_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [records, recordSearch, dateFrom, dateTo, yearFilter]);

  const catalogProducts = useMemo(() => catalogGroups.flatMap((group) => group.products || []), [catalogGroups]);
  const productMap = useMemo(() => new Map(catalogProducts.map((product) => [Number(product.id), product])), [catalogProducts]);
  const total = useMemo(() => charges.reduce((sum, charge) => {
    const price = Number(productMap.get(Number(charge.catalog_product_id))?.price || 0);
    return sum + price * Number(charge.quantity || 0);
  }, 0), [charges, productMap]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  }

  function applyTemplate(template) {
    setForm((current) => ({ ...current, diagnosis: template.diagnosis, treatment_plan: template.treatment }));
    setFieldErrors((current) => ({ ...current, diagnosis: "", treatment_plan: "" }));
  }

  function setFollowUpInDays(days) {
    if (!form.consultation_date) return;
    const date = new Date(`${form.consultation_date}T00:00:00`);
    date.setDate(date.getDate() + days);
    setForm((current) => ({ ...current, follow_up_date: date.toISOString().slice(0, 10) }));
  }

  function addCharge(product) {
    setCharges((current) => {
      const existing = current.find((charge) => Number(charge.catalog_product_id) === Number(product.id));
      if (existing) return current.map((charge) => Number(charge.catalog_product_id) === Number(product.id) ? { ...charge, quantity: charge.quantity + 1 } : charge);
      return [...current, { catalog_product_id: Number(product.id), quantity: 1 }];
    });
    setFieldErrors((current) => ({ ...current, charges: "" }));
  }

  function changeQuantity(productId, value) {
    const quantity = Math.max(1, Number.parseInt(value, 10) || 1);
    setCharges((current) => current.map((charge) => Number(charge.catalog_product_id) === Number(productId) ? { ...charge, quantity } : charge));
  }

  function removeCharge(productId) {
    setCharges((current) => current.filter((charge) => Number(charge.catalog_product_id) !== Number(productId)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({});
    if (!queueEntry) {
      setFieldErrors({ queue_id: "Select a patient from the clinic queue first." });
      toast.error("Select a patient from the clinic queue first.");
      return;
    }
    if (!charges.length) {
      setFieldErrors({ charges: "Add at least one consultation charge." });
      toast.error("Add at least one consultation charge.");
      return;
    }
    const validation = validateClinicalRecord({
      pet_id: queueEntry.pet_id,
      diagnosis: form.diagnosis,
      treatment_plan: form.treatment_plan,
      consultation_date: form.consultation_date,
      follow_up_date: form.follow_up_date,
    });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(validation.message);
      return;
    }

    setSaving(true);
    try {
      await api.post("/clinical", {
        queue_id: queueEntry.id,
        pet_id: queueEntry.pet_id,
        complaint: form.complaint,
        diagnosis: form.diagnosis,
        treatment_plan: form.treatment_plan,
        consultation_date: form.consultation_date,
        follow_up_date: form.follow_up_date || null,
        charges: charges.map((charge) => ({ catalog_product_id: charge.catalog_product_id, quantity: charge.quantity })),
      });
      toast.success("Consultation saved. Payment monitoring has been notified.");
      setForm({ complaint: "", diagnosis: "", treatment_plan: "", consultation_date: todayValue(), follow_up_date: "" });
      setCharges([]);
      setSearchParams({});
      await Promise.all([loadRecords(), loadQueue()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save consultation record.");
    } finally {
      setSaving(false);
    }
  }

  if (showLoading) return <LoadingSpinner text="Loading consultation workspace..." />;

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <Link to="/veterinarian/queue" className="back-link"><ArrowLeft size={15} /> Back to queue</Link>
          <h1>Consultation Workspace</h1>
          <p className="page-intro">Document the visit and add the services charged to this patient.</p>
        </div>
        <PrintReportButton category="clinical" />
      </div>

      {!queueEntry ? (
        <div className="panel-card queue-required-card">
          <div className="panel-header">
            <div>
              <h2>Select a queue patient</h2>
              <p>Start from the clinic queue so the consultation and payment stay linked to one visit.</p>
            </div>
            <Link to="/veterinarian/queue" className="btn-primary btn-sm">Open queue</Link>
          </div>
          {queueEntries.filter((entry) => ["Waiting", "In Consultation"].includes(entry.status)).length === 0 ? (
            <div className="empty-state-cell">No active patients are waiting for consultation.</div>
          ) : (
            <div className="queue-picker-list">
              {queueEntries.filter((entry) => ["Waiting", "In Consultation"].includes(entry.status)).map((entry) => (
                <button type="button" className="queue-picker-item" key={entry.id} onClick={() => setSearchParams({ queue_id: String(entry.id) })}>
                  <span><strong>{entry.pet_name}</strong><small>{entry.pet_code} · {entry.owner_name}</small></span>
                  <span>{entry.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="panel-card clinical-panel-card consultation-workspace-card">
          <div className="panel-header">
            <div>
              <h2>New Consultation</h2>
              <p>{queueEntry.pet_name} · {queueEntry.pet_code} · {queueEntry.owner_name}</p>
            </div>
            <span className="queue-patient-chip">Queue #{queueEntry.id}</span>
          </div>
          <form onSubmit={handleSubmit} className="clinical-form">
            <section className="clinical-form-section">
              <div className="clinical-form-section-header">
                <h3>Visit Notes</h3>
                <p>Record the presenting complaint, findings, and treatment plan.</p>
              </div>
              <div className="clinical-form-stack">
                <div className="field-group">
                  <label>Quick Templates</label>
                  <div className="quick-template-row">
                    {templates.map((template) => <button type="button" className="quick-template-chip" key={template.label} onClick={() => applyTemplate(template)}>{template.label}</button>)}
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="complaint">Presenting Complaint</label>
                  <textarea id="complaint" name="complaint" value={form.complaint} onChange={handleChange} rows="2" placeholder="What brought the pet in today?" />
                </div>
                <div className="field-group">
                  <label htmlFor="diagnosis">Diagnosis / Notes</label>
                  <textarea id="diagnosis" name="diagnosis" value={form.diagnosis} onChange={handleChange} rows="4" placeholder="Describe symptoms, findings, or diagnosis..." />
                  <FieldError message={fieldErrors.diagnosis} />
                </div>
                <div className="field-group">
                  <label htmlFor="treatment_plan">Treatment Plan</label>
                  <textarea id="treatment_plan" name="treatment_plan" value={form.treatment_plan} onChange={handleChange} rows="3" placeholder="Medication, care instructions, or next steps..." />
                  <FieldError message={fieldErrors.treatment_plan} />
                </div>
              </div>
            </section>

            <section className="clinical-form-section">
              <div className="clinical-form-section-header">
                <h3>Consultation Charges</h3>
                <p>Select services from the active catalog. Prices are verified by the server when saving.</p>
              </div>
              <div className="charge-editor">
                {catalogGroups.map((group) => (
                  <div className="charge-category" key={group.name}>
                    <div className="charge-category-title"><span>{group.name}</span><ChevronDown size={15} /></div>
                    <div className="charge-product-grid">
                      {group.products.map((product) => (
                        <button type="button" className="charge-product" key={product.id} onClick={() => addCharge(product)}>
                          <span>{product.name}</span><strong>{formatMoney(product.price)}</strong><Plus size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {catalogGroups.length === 0 && <div className="empty-state-cell">No active catalog services are available.</div>}
                <FieldError message={fieldErrors.charges} />
                {charges.length > 0 && (
                  <div className="charge-lines">
                    {charges.map((charge) => {
                      const product = productMap.get(Number(charge.catalog_product_id));
                      return <div className="charge-line" key={charge.catalog_product_id}><div><strong>{product?.name || "Catalog service"}</strong><span>{formatMoney(product?.price || 0)} each</span></div><input type="number" min="1" value={charge.quantity} onChange={(event) => changeQuantity(charge.catalog_product_id, event.target.value)} aria-label={`Quantity for ${product?.name || "service"}`} /><strong>{formatMoney((Number(product?.price) || 0) * charge.quantity)}</strong><button type="button" className="btn-icon-action" onClick={() => removeCharge(charge.catalog_product_id)} aria-label={`Remove ${product?.name || "service"}`}><Trash2 size={14} /></button></div>;
                    })}
                    <div className="charge-total"><span>Consultation total</span><strong>{formatMoney(total)}</strong></div>
                  </div>
                )}
              </div>
            </section>

            <section className="clinical-form-section">
              <div className="clinical-form-section-header"><h3>Schedule</h3><p>Set the consultation date and optional follow-up visit.</p></div>
              <div className="clinical-form-grid clinical-form-grid--2">
                <div className="field-group"><label htmlFor="consultation_date">Consultation Date</label><input id="consultation_date" type="date" name="consultation_date" value={form.consultation_date} onChange={handleChange} required max={todayValue()} /><FieldError message={fieldErrors.consultation_date} /></div>
                <div className="field-group"><label htmlFor="follow_up_date">Follow-up Date</label><input id="follow_up_date" type="date" name="follow_up_date" value={form.follow_up_date} onChange={handleChange} min={form.consultation_date || undefined} /><div className="quick-template-row"><button type="button" className="quick-template-chip" onClick={() => setFollowUpInDays(14)} disabled={!form.consultation_date}>+2 weeks</button><button type="button" className="quick-template-chip" onClick={() => setFollowUpInDays(30)} disabled={!form.consultation_date}>+1 month</button></div><FieldError message={fieldErrors.follow_up_date} /></div>
              </div>
            </section>

            <div className="clinical-form-actions"><button type="submit" className="btn-primary" disabled={saving || charges.length === 0}>{saving ? "Saving consultation..." : "Save Consultation & Create Payment"}</button></div>
          </form>
        </div>
      )}

      <div className="panel-card table-panel-card">
        <div className="table-header-row"><div><h2>Consultation Log</h2><p>View saved clinical notes for each pet.</p></div><div className="table-meta">{filteredRecords.length} records</div></div>
        <div className="toolbar-row"><div className="search-wrap"><input type="text" value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="Search pets, owners, diagnosis, or treatment..." aria-label="Search consultation records" /></div></div>
        <div className="toolbar-row toolbar-row--dates"><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Consultation date from" /><span className="toolbar-range-sep">to</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Consultation date to" /><select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} aria-label="Filter by year"><option value="">All Years</option>{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select>{(dateFrom || dateTo || yearFilter) && <button type="button" className="btn-secondary btn-sm" onClick={() => { setDateFrom(""); setDateTo(""); setYearFilter(""); }}>Clear date filter</button>}</div>
        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Pet</th><th>Owner</th><th>Consultation Date</th><th>Notes</th><th>Recorded By</th><th>Action</th></tr></thead><tbody>{filteredRecords.length === 0 ? <tr><td colSpan="6" className="empty-state-cell">{recordSearch ? "No consultation records match your search." : "No consultation records yet."}</td></tr> : filteredRecords.map((record) => <tr key={record.id}><td data-label="Pet" className="pet-name-cell"><strong>{record.pet_name}</strong>{record.pet_code && <div className="cell-muted">{record.pet_code}</div>}</td><td data-label="Owner">{record.owner_name}</td><td data-label="Consultation Date">{formatDate(record.consultation_date)}</td><td data-label="Notes">{record.diagnosis || "No notes yet"}</td><td data-label="Recorded By">{record.vet_name || "—"}</td><td><button type="button" className="btn-secondary btn-sm" onClick={() => setSelectedRecord(record)}>View Consultation</button></td></tr>)}</tbody></table></div>
      </div>

      {selectedRecord && <div className="logout-modal-overlay" onClick={() => setSelectedRecord(null)}><div className="barangay-pets-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="clinical-detail-title"><div className="barangay-pets-modal-header"><div className="barangay-pets-modal-title"><div className="barangay-pets-modal-icon"><ClipboardList /></div><div><h3 id="clinical-detail-title">Consultation Details</h3><p>{selectedRecord.pet_name} · {selectedRecord.owner_name}</p></div></div><button type="button" className="barangay-modal-close" onClick={() => setSelectedRecord(null)} aria-label="Close">×</button></div><div className="clinical-detail-grid"><div className="clinical-detail-item"><span>Consultation Date</span><strong>{formatDate(selectedRecord.consultation_date)}</strong></div><div className="clinical-detail-item"><span>Follow-up Date</span><strong>{formatDate(selectedRecord.follow_up_date)}</strong></div><div className="clinical-detail-item"><span>Recorded By</span><strong>{selectedRecord.vet_name || "—"}</strong></div><div className="clinical-detail-item"><span>Saved On</span><strong>{formatDate(selectedRecord.created_at)}</strong></div></div><div className="clinical-detail-section"><h4>Presenting Complaint</h4><p>{selectedRecord.complaint || "No complaint recorded."}</p></div><div className="clinical-detail-section"><h4>Diagnosis / Notes</h4><p>{selectedRecord.diagnosis || "No consultation notes recorded."}</p></div><div className="clinical-detail-section"><h4>Treatment Plan</h4><p>{selectedRecord.treatment_plan || "No treatment plan recorded."}</p></div></div></div>}
    </div>
  );
}
