import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Stethoscope, XCircle, ScanLine, Plus, Trash2, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import PetSearchSelect from "../../components/PetSearchSelect";
import StatusBadge from "../../components/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const ACTIVE_STATUSES = ["Waiting", "In Consultation"];

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function extractQrToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const ownerIndex = parts.lastIndexOf("owner");
    if (ownerIndex >= 0 && parts[ownerIndex + 1]) return decodeURIComponent(parts[ownerIndex + 1]);
    if (parts.length) return decodeURIComponent(parts[parts.length - 1]);
  } catch (_) {
    const match = raw.match(/(?:owner|scan|qr)\/([^\s/?#]+)/i);
    if (match) return decodeURIComponent(match[1]);
  }
  return raw;
}

export default function ClinicQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const scannerRef = useRef(null);
  const scanLockRef = useRef(false);
  const activeBatchRef = useRef(null);

  const staffMode = user?.role === "Staff" || user?.role === "Admin";
  const canManageConsultation = user?.role === "Veterinarian";

  function loadQueue() {
    return api
      .get("/clinic-queue")
      .then((res) => setEntries(res.data.entries || []))
      .catch((error) => {
        toast.error(error.response?.data?.message || "Could not load the clinic queue.");
        setEntries([]);
      });
  }

  async function loadBatches() {
    try {
      const response = await api.get("/clinic-queue/batches", { params: { status: "Active" } });
      const nextBatches = response.data.batches || [];
      const currentId = activeBatchRef.current?.id;
      const nextSummary = nextBatches.find((batch) => String(batch.id) === String(currentId)) || nextBatches[0] || null;
      setBatches(nextBatches);
      if (nextSummary) {
        const detail = await api.get(`/clinic-queue/batches/${nextSummary.id}`);
        activeBatchRef.current = detail.data.batch || null;
        setActiveBatch(activeBatchRef.current);
      } else {
        activeBatchRef.current = null;
        setActiveBatch(null);
      }
    } catch (_) {
      setBatches([]);
      activeBatchRef.current = null;
      setActiveBatch(null);
    }
  }

  useEffect(() => {
    Promise.all([loadQueue(), loadBatches()]).finally(() => setLoading(false));
    const timer = window.setInterval(() => {
      loadQueue();
      loadBatches();
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleCheckIn(event) {
    event.preventDefault();
    if (!selectedPet) {
      toast.error("Select a pet first.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/clinic-queue", { pet_id: selectedPet.id, notes });
      toast.success(response.data.message || "Patient added to the queue.");
      setSelectedPet(null);
      setNotes("");
      await loadQueue();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add the patient to the queue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createBatch() {
    setBatchBusy(true);
    try {
      const response = await api.post("/clinic-queue/batches");
       setBatches((current) => [response.data.batch, ...current]);
       activeBatchRef.current = response.data.batch || null;
       setActiveBatch(activeBatchRef.current);
      toast.success("Consultation batch created.");
      return response.data.batch;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create a consultation batch.");
      return null;
    } finally {
      setBatchBusy(false);
    }
  }

  async function selectBatch(batchId) {
    if (!batchId) return;
    try {
       const response = await api.get(`/clinic-queue/batches/${batchId}`);
       activeBatchRef.current = response.data.batch || null;
       setActiveBatch(activeBatchRef.current);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the batch.");
    }
  }

  async function getBatchForPatient() {
    if (activeBatchRef.current) return activeBatchRef.current;
    return createBatch();
  }

  async function addPetToBatch(pet) {
    const batch = await getBatchForPatient();
    if (!batch) return false;
    setBatchBusy(true);
    try {
      const response = await api.post(`/clinic-queue/batches/${batch.id}/items`, {
        items: [{ pet_id: Number(pet.id) }],
      });
       activeBatchRef.current = response.data.batch || batch;
       setActiveBatch(activeBatchRef.current);
       setBatches((current) => {
        const without = current.filter((item) => item.id !== batch.id);
        return [response.data.batch || batch, ...without];
      });
      toast.success(`${pet.name || pet.pet_name || "Pet"} added to the batch.`);
      await loadQueue();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add the pet to the batch.");
      return false;
    } finally {
      setBatchBusy(false);
    }
  }

  async function resolveAndAddToken(rawValue) {
    const token = extractQrToken(rawValue);
    if (!token) return;
    try {
      const response = await api.get(`/qr/owner/${encodeURIComponent(token)}`);
      const owner = response.data.owner;
      if (!owner?.pet_id) throw new Error("This QR code is not linked to a registered pet.");
      await addPetToBatch({
        id: owner.pet_id,
        name: owner.pet_name,
        pet_code: owner.pet_code,
        owner_name: owner.full_name,
      });
      setManualToken("");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not read the pet QR code.");
    }
  }

  useEffect(() => {
    if (!scannerOpen) return undefined;
    let disposed = false;
    const scanner = new Html5Qrcode("clinic-qr-reader");
    scannerRef.current = scanner;
    setScannerError("");

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (disposed || scanLockRef.current) return;
          scanLockRef.current = true;
          await resolveAndAddToken(decodedText);
          window.setTimeout(() => {
            scanLockRef.current = false;
          }, 1500);
        },
      )
      .catch(() => {
        if (!disposed) setScannerError("Camera access is unavailable. Enter the QR token below instead.");
      });

    return () => {
      disposed = true;
      scannerRef.current = null;
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [scannerOpen]);

  async function removeBatchItem(item) {
    if (!activeBatch) return;
    setBatchBusy(true);
    try {
      const response = await api.delete(`/clinic-queue/batches/${activeBatch.id}/items/${item.id}`);
       activeBatchRef.current = response.data.batch || null;
       setActiveBatch(activeBatchRef.current);
       setBatches((current) => current.map((batch) => (batch.id === activeBatch.id ? response.data.batch : batch)));
      await loadQueue();
      toast.success("Patient removed from the batch.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove the patient.");
    } finally {
      setBatchBusy(false);
    }
  }

  async function openConsultation(entry) {
    setUpdatingId(entry.id);
    try {
      if (entry.status === "Waiting") {
        await api.patch(`/clinic-queue/${entry.id}/status`, { status: "In Consultation" });
      }
      await loadQueue();
      await loadBatches();
      navigate(`/veterinarian/clinical-records?queue_id=${entry.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start the consultation.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      const response = await api.patch(`/clinic-queue/${id}/status`, { status });
      toast.success(response.data.message || "Queue status updated.");
      await loadQueue();
      await loadBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update the queue entry.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesStatus = statusFilter === "All" || entry.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return [entry.pet_name, entry.pet_code, entry.owner_name, entry.status, entry.batch_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [entries, search, statusFilter]);

  if (loading) return <LoadingSpinner text="Loading clinic queue..." />;

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Clinic Queue</h1>
          <p className="page-intro">Scan registered pets into a batch before starting each consultation.</p>
        </div>
      </div>

      <div className="panel-card batch-panel-card">
        <div className="panel-header">
          <div>
            <h2>Scan by Batch</h2>
            <p>Each pet keeps its own consultation and payment transaction.</p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={createBatch} disabled={batchBusy}>
            <Plus size={14} /> New Batch
          </button>
        </div>
        <div className="batch-toolbar">
          <select value={activeBatch?.id || ""} onChange={(event) => selectBatch(event.target.value)} aria-label="Select consultation batch">
            <option value="">Select active batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>{batch.batch_token} · {batch.waiting_count || 0} waiting</option>
            ))}
          </select>
          <button type="button" className="btn-primary btn-sm" onClick={() => setScannerOpen(true)} disabled={batchBusy}>
            <ScanLine size={14} /> Scan Pet QR
          </button>
        </div>
        {activeBatch ? (
          <div className="batch-content">
            <div className="batch-summary">
              <div><strong>{activeBatch.batch_token}</strong><span>{activeBatch.item_count || activeBatch.items?.length || 0} patients</span></div>
              <span>{activeBatch.waiting_count || 0} waiting</span>
            </div>
            <div className="batch-item-list">
              {(activeBatch.items || []).length === 0 ? (
                <div className="empty-state-cell">Scan a pet QR or use the existing-pet fallback below.</div>
              ) : (
                activeBatch.items.map((item) => (
                  <div className="batch-item" key={item.id}>
                    <div>
                      <strong>{item.pet_name}</strong>
                      <span>{item.pet_code} · {item.owner_name || "Owner not listed"}</span>
                    </div>
                    <div className="batch-item-actions">
                      <StatusBadge status={item.status} />
                      {canManageConsultation && ACTIVE_STATUSES.includes(item.status) && (
                        <button type="button" className="btn-primary btn-sm" onClick={() => openConsultation(item)} disabled={updatingId === item.id}>
                          <Stethoscope size={13} /> {item.status === "In Consultation" ? "Record" : "Start"}
                        </button>
                      )}
                      {item.status === "Waiting" && (
                        <button type="button" className="btn-icon-action" onClick={() => removeBatchItem(item)} disabled={batchBusy} aria-label={`Remove ${item.pet_name}`} title="Remove patient">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state-cell">Create a batch to begin scanning patients.</div>
        )}
      </div>

      {staffMode && (
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2>Walk-in Fallback</h2>
              <p>Use this only when a registered pet has no usable QR code.</p>
            </div>
          </div>
          <form onSubmit={handleCheckIn} className="clinical-form">
            <div className="clinical-form-grid clinical-form-grid--2">
              <div className="field-group">
                <label htmlFor="queue-pet">Search and select pet</label>
                <PetSearchSelect id="queue-pet" value={selectedPet} onChange={setSelectedPet} placeholder="Search by pet name, code, or owner..." required />
              </div>
              <div className="field-group">
                <label htmlFor="queue-notes">Optional note</label>
                <input id="queue-notes" type="text" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason for visit or counter note" maxLength={500} />
              </div>
            </div>
            <div className="clinical-form-actions">
              <button type="submit" className="btn-primary" disabled={submitting || !selectedPet}>{submitting ? "Adding patient..." : "Add to Queue"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Queue Overview</h2>
            <p>Waiting, in-consultation, and recently completed patients.</p>
          </div>
          <div className="table-meta">{filteredEntries.length} entries</div>
        </div>
        <div className="toolbar-row">
          <div className="search-wrap">
            <Search size={16} aria-hidden="true" />
            <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, owner, or batch..." aria-label="Search clinic queue" />
          </div>
          <div className="toolbar-select">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter queue status">
              <option value="All">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Queue</th><th>Patient</th><th>Owner</th><th>Checked In</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr><td colSpan="6" className="empty-state-cell">No queue entries match this view.</td></tr>
              ) : filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="Queue">#{entry.id}{entry.batch_id ? <div className="cell-muted">Batch #{entry.batch_id}</div> : null}</td>
                  <td data-label="Patient"><strong>{entry.pet_name}</strong><br /><small>{entry.pet_code}</small></td>
                  <td data-label="Owner">{entry.owner_name || "—"}</td>
                  <td data-label="Checked In">{formatTime(entry.checked_in_at)}</td>
                  <td data-label="Status"><StatusBadge status={entry.status} /></td>
                  <td data-label="Action">
                    <div className="table-actions">
                      {canManageConsultation && entry.status === "Waiting" && (
                        <button type="button" className="btn-primary btn-sm" onClick={() => openConsultation(entry)} disabled={updatingId === entry.id}><Stethoscope size={14} /> Start</button>
                      )}
                      {ACTIVE_STATUSES.includes(entry.status) && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => updateStatus(entry.id, "Cancelled")} disabled={updatingId === entry.id}><XCircle size={14} /> Cancel</button>
                      )}
                      {canManageConsultation && entry.status === "In Consultation" && (
                        <Link to={`/veterinarian/clinical-records?queue_id=${entry.id}`} className="btn-secondary btn-sm">Record</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {scannerOpen && (
        <div className="logout-modal-overlay" onClick={() => setScannerOpen(false)}>
          <div className="barangay-pets-modal clinic-scanner-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="clinic-scanner-title">
            <div className="barangay-pets-modal-header">
              <div className="barangay-pets-modal-title">
                <div className="barangay-pets-modal-icon"><ScanLine /></div>
                <div><h3 id="clinic-scanner-title">Scan Pet QR</h3><p>Scan the registered pet code to add it to the active batch.</p></div>
              </div>
              <button type="button" className="barangay-modal-close" onClick={() => setScannerOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="clinic-scanner-body">
              <div id="clinic-qr-reader" className="clinic-qr-reader" />
              {scannerError && <p className="field-error">{scannerError}</p>}
              <div className="field-group">
                <label htmlFor="manual-pet-token">QR token fallback</label>
                <div className="scanner-fallback-row">
                  <input id="manual-pet-token" value={manualToken} onChange={(event) => setManualToken(event.target.value)} placeholder="Paste the pet QR token" />
                  <button type="button" className="btn-secondary" onClick={() => resolveAndAddToken(manualToken)} disabled={!manualToken.trim() || batchBusy}>{batchBusy ? <Loader2 size={14} className="pet-search-spin" /> : "Add"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
