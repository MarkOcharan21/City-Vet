import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  Loader2,
  PawPrint,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import api from "../../services/api";
import { ALL_CABUYAO_BARANGAYS } from "../../data/cabuyaoBarangays";

// ─── helpers ────────────────────────────────────────────────────

function todayInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// ─── colour palette ──────────────────────────────────────────────
const GREEN = "#0b3d2e";
const GREEN_LIGHT = "#e6f4ee";
const GREEN_BORDER = "#a7d4bc";

// ─── ReceiptPanel (shown after successful submit) ────────────────
function ReceiptPanel({ ownerName, petName, serviceDate, serviceTime, items, total, linkedPet, programName }) {
  const receiptRef = useRef(null);
  const [saving, setSaving] = useState(false);

  async function saveAsPng() {
    setSaving(true);
    try {
      // Dynamically import html2canvas only when needed
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `outreach-receipt-${ownerName.replace(/\s+/g, "-")}-${serviceDate || "record"}.png`;
      a.click();
    } catch (err) {
      console.error("Save PNG failed:", err);
      alert("Could not save the image. Please take a screenshot instead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "28px 24px" }}>
      {/* Receipt card — this div is captured as PNG */}
      <div
        ref={receiptRef}
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        {/* Receipt header */}
        <div style={{ background: GREEN, color: "#fff", padding: "16px 20px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
            <CheckCircle2 size={22} color="#86efac" />
            <span style={{ fontWeight: 700, fontSize: 17 }}>Submission Confirmed</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{programName}</div>
        </div>

        {/* Owner / pet details */}
        <div style={{ padding: "16px 20px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {[
                ["Pet Owner", ownerName],
                ["Pet Name", petName || "—"],
                ["Date", fmtDate(serviceDate) || "—"],
                ["Time", serviceTime || "—"],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "7px 0", color: "#6B7280", width: "42%" }}>{label}</td>
                  <td style={{ padding: "7px 0", fontWeight: 600, textAlign: "right" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Services */}
        <div style={{ padding: "12px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 8 }}>
            Services Performed
          </div>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 14, borderBottom: "1px dashed #f3f4f6" }}>
              <span>{it.service_name}</span>
              <span>₱{Number(it.amount || 0).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontWeight: 700, fontSize: 15 }}>
            <span>Payment Due</span>
            <span>₱{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Linked pet badge */}
        {linkedPet && (
          <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: GREEN_LIGHT, border: `1px solid ${GREEN_BORDER}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <ShieldCheck size={16} color={GREEN} />
            <span style={{ color: GREEN, fontWeight: 600 }}>
              Vaccination record saved to <strong>{linkedPet.pet_name}</strong>&apos;s account
            </span>
          </div>
        )}

        {/* Footer */}
        <div style={{ background: "#f9fafb", borderTop: "1px solid #f3f4f6", padding: "10px 20px", textAlign: "center", fontSize: 11, color: "#9CA3AF" }}>
          City Veterinary Office of Cabuyao · Please proceed to the counter to pay.
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={saveAsPng}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "13px 16px",
            background: GREEN, color: "#fff", border: "none", borderRadius: 10,
            fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
          {saving ? "Saving…" : "Save Receipt as Image"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", margin: 0 }}>
          The image will be saved to your device's Downloads folder.
        </p>
      </div>
    </div>
  );
}

// ─── PetCodeLookup ───────────────────────────────────────────────
function PetCodeLookup({ onSelect, onClear }) {
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null); // null = not searched yet, [] = not found
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    setCode(val);
    setSelected(null);
    setResults(null);
    onClear();

    clearTimeout(debounceRef.current);
    if (val.trim().length < 4) return;

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get("/outreach/qr/lookup-pet", { params: { code: val.trim() } });
        if (res.data.success && res.data.pets?.length > 0) {
          setResults(res.data.pets);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function handleSelect(pet) {
    setSelected(pet);
    setCode(pet.pet_code);
    setResults(null);
    onSelect(pet);
  }

  function handleClear() {
    setCode("");
    setSelected(null);
    setResults(null);
    onClear();
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* Input row */}
      <div style={{ position: "relative" }}>
        <input
          className="form-control"
          value={code}
          onChange={handleChange}
          placeholder="e.g. 000381 or PET-2026-000381"
          style={{ paddingRight: 38 }}
          autoComplete="off"
        />
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
          {searching ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
        </span>
      </div>

      <p style={{ margin: "5px 0 0", fontSize: 12, color: "#9CA3AF" }}>
        Type at least 4 digits — we'll find the matching pet.
      </p>

      {/* Results dropdown */}
      {results !== null && !selected && (
        <div style={{ marginTop: 6, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
          {results.length === 0 ? (
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, color: "#6B7280", fontSize: 14 }}>
              <XCircle size={16} color="#dc2626" />
              No verified pet found with that code.
            </div>
          ) : (
            results.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => handleSelect(pet)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "11px 14px", border: "none", background: "transparent",
                  textAlign: "left", cursor: "pointer", borderBottom: "1px solid #f3f4f6",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0faf4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: GREEN_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PawPrint size={16} color={GREEN} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{pet.pet_name}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    {pet.pet_code}
                    {pet.species_name ? ` · ${pet.species_name}` : ""}
                    {pet.sex ? ` · ${pet.sex}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>Owner: {pet.owner_name}</div>
                </div>
                <span style={{ fontSize: 12, color: GREEN, fontWeight: 600, flexShrink: 0 }}>Select</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected pet confirmation chip */}
      {selected && (
        <div style={{ marginTop: 8, padding: "10px 14px", background: GREEN_LIGHT, border: `1px solid ${GREEN_BORDER}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={18} color={GREEN} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: GREEN }}>{selected.pet_name}</div>
            <div style={{ fontSize: 12, color: "#374151" }}>{selected.pet_code} · {selected.owner_name}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              Vaccination records will be saved to this pet's account.
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4, flexShrink: 0 }}
            title="Remove"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main form ───────────────────────────────────────────────────
export default function OutreachConfirmForm() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(null);

  const [ownerName, setOwnerName] = useState("");
  const [petName, setPetName] = useState("");
  const [serviceDate, setServiceDate] = useState(todayInputValue());
  const [serviceTime, setServiceTime] = useState(nowTimeValue());
  const [barangay, setBarangay] = useState("");
  const [items, setItems] = useState([]);

  // Registration link state
  const [isRegistered, setIsRegistered] = useState(null); // null | true | false
  const [linkedPet, setLinkedPet] = useState(null); // selected pet object from lookup
  const [petCode, setPetCode] = useState(""); // raw code value sent with submission

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [doneData, setDoneData] = useState(null); // { linkedPet, selectedItems, total }

  useEffect(() => {
    loadForm();
  }, [token]);

  async function loadForm() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/outreach/qr/${token}`);
      if (!response.data.success) {
        setError(response.data.message || "This QR code is not recognized.");
        return;
      }
      const data = response.data.formData;
      setFormData(data);
      setBarangay(data.programBarangay || "");
      setItems(
        (data.services || []).map((s, index) => ({
          key: index,
          service_name: s.service_name,
          amount: Number(s.amount).toFixed(2),
          checked: false,
        }))
      );
    } catch (err) {
      setError(err.response?.data?.message || "This QR code is not recognized or may no longer be active.");
    } finally {
      setLoading(false);
    }
  }

  const total = useMemo(
    () => items.filter((it) => it.checked).reduce((sum, it) => sum + (Number.parseFloat(it.amount) || 0), 0),
    [items]
  );

  function toggleItem(key) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, checked: !it.checked } : it)));
  }

  const handlePetSelect = useCallback((pet) => {
    setLinkedPet(pet);
    setPetCode(pet.pet_code);
    // Auto-fill pet name if empty
    if (!petName.trim()) setPetName(pet.pet_name);
  }, [petName]);

  const handlePetClear = useCallback(() => {
    setLinkedPet(null);
    setPetCode("");
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    const selected = items.filter((it) => it.checked).map((it) => ({ service_name: it.service_name, amount: it.amount }));
    if (selected.length === 0) {
      setSubmitError("Please select at least one service or vaccination performed.");
      return;
    }
    if (!ownerName.trim()) {
      setSubmitError("Pet owner name is required.");
      return;
    }
    if (!serviceDate) {
      setSubmitError("Please enter the date.");
      return;
    }
    if (!serviceTime) {
      setSubmitError("Please enter the time.");
      return;
    }
    // If they said "Yes" to registered but haven't selected a pet yet
    if (isRegistered === true && !linkedPet) {
      setSubmitError("Please enter and select your Pet Code, or choose 'No' if you are not registered.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/outreach/qr/${token}/submit`, {
        owner_name: ownerName.trim(),
        pet_name: petName.trim(),
        service_date: serviceDate,
        service_time: serviceTime,
        barangay: barangay.trim(),
        items: selected,
        pet_code: petCode || null,
      });
      if (!response.data.success) {
        setSubmitError(response.data.message || "Could not submit. Please try again.");
        return;
      }
      setDoneData({
        linkedPet: response.data.linkedPet || null,
        selectedItems: selected,
        total,
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / error states ────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 16px" }}>
        <Loader2 size={32} color={GREEN} className="spin" style={{ marginBottom: 12 }} />
        <p style={{ color: "#6B7280" }}>Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center", padding: "0 16px" }}>
        <div style={{ fontSize: 44 }}>🐾</div>
        <h2>{error}</h2>
        <p style={{ color: "#6B7280" }}>Please contact the City Veterinary Office of Cabuyao for assistance.</p>
      </div>
    );
  }

  // ── Header shared between form and receipt ────────────────────

  const header = (
    <div style={{ background: GREEN, color: "#fff", padding: "18px 22px", borderRadius: "14px 14px 0 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PawPrint size={22} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>City of Cabuyao — Outreach</div>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>
            {formData.programName}
            {formData.eventDate ? ` · ${formData.eventDate.slice(0, 10)}` : ""}
            {formData.venue ? ` · ${formData.venue}` : ""}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Done screen ───────────────────────────────────────────────

  if (doneData) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", background: "#fff", borderRadius: 16, boxShadow: "0 6px 30px rgba(0,0,0,.12)", overflow: "hidden" }}>
        {header}
        <ReceiptPanel
          ownerName={ownerName}
          petName={petName}
          serviceDate={serviceDate}
          serviceTime={serviceTime}
          items={doneData.selectedItems}
          total={doneData.total}
          linkedPet={doneData.linkedPet}
          programName={formData.programName}
        />
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 620, margin: "36px auto", padding: "0 14px" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 6px 30px rgba(0,0,0,.12)", overflow: "hidden" }}>
        {header}

        <form onSubmit={handleSubmit} style={{ padding: "24px 26px" }}>
          <p style={{ color: "#6B7280", marginTop: 0, marginBottom: 20 }}>
            Kindly confirm the details below and the services performed.
            Payment will be made at the counter of the City Veterinary Office.
          </p>

          {/* Owner name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 6 }}>
              Pet Owner Name *
            </label>
            <input className="form-control" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Juan Dela Cruz" />
          </div>

          {/* Pet name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 6 }}>
              Pet Name
            </label>
            <input className="form-control" value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="e.g. Brownie" />
          </div>

          {/* Date + Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 6 }}>Date *</label>
              <input className="form-control" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 6 }}>Time *</label>
              <input className="form-control" type="time" value={serviceTime} onChange={(e) => setServiceTime(e.target.value)} />
            </div>
          </div>

          {/* Barangay */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 6 }}>
              Barangay
            </label>
            <input className="form-control" list="outreach-barangays" value={barangay} onChange={(e) => setBarangay(e.target.value)} placeholder="Select or type a barangay" />
            <datalist id="outreach-barangays">
              {ALL_CABUYAO_BARANGAYS.map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>

          {/* Services */}
          <h4 style={{ margin: "0 0 12px", color: "#111827", fontSize: 15 }}>Service / Vaccination Performed</h4>
          {items.length === 0 && (
            <p style={{ color: "#9CA3AF", fontSize: 14 }}>No services have been set for this program yet.</p>
          )}
          {items.map((it) => (
            <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <input
                type="checkbox"
                id={`svc-${it.key}`}
                checked={it.checked}
                onChange={() => toggleItem(it.key)}
                style={{ width: 18, height: 18, accentColor: GREEN, cursor: "pointer", flexShrink: 0 }}
              />
              <label htmlFor={`svc-${it.key}`} style={{ flex: 1, cursor: "pointer", fontSize: 15 }}>{it.service_name}</label>
              <span style={{ color: "#374151", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>₱{Number(it.amount).toFixed(2)}</span>
            </div>
          ))}

          {/* Payment total */}
          <div style={{ margin: "16px 0 22px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f0faf4", borderRadius: 10, border: `1px solid ${GREEN_BORDER}` }}>
            <span style={{ color: "#374151", fontSize: 14, fontWeight: 600 }}>Amount to pay at the counter</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: GREEN }}>₱{total.toFixed(2)}</span>
          </div>

          {/* ── City Vet Registration Question ────────────────── */}
          <div style={{ borderTop: "2px solid #f3f4f6", paddingTop: 20, marginBottom: 6 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginTop: 0, marginBottom: 14 }}>
              Are you registered at the City Veterinary Office?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {/* YES button */}
              <button
                type="button"
                onClick={() => setIsRegistered(true)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 10, border: `2px solid ${isRegistered === true ? GREEN : "#e5e7eb"}`,
                  background: isRegistered === true ? GREEN : "#fff",
                  color: isRegistered === true ? "#fff" : "#374151",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                {isRegistered === true && <CheckCircle2 size={16} />}
                Yes
              </button>

              {/* NO button */}
              <button
                type="button"
                onClick={() => { setIsRegistered(false); setLinkedPet(null); setPetCode(""); }}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 10, border: `2px solid ${isRegistered === false ? "#6B7280" : "#e5e7eb"}`,
                  background: isRegistered === false ? "#f3f4f6" : "#fff",
                  color: "#374151",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                No
              </button>
            </div>

            {/* Pet code lookup — shown only when Yes is selected */}
            {isRegistered === true && (
              <div style={{ marginTop: 18, padding: "16px 18px", background: "#f8fafb", border: "1px solid #e5e7eb", borderRadius: 12 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 }}>
                  Pet Code
                </label>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6B7280" }}>
                  Enter the pet code from your pet's QR record (e.g. <code style={{ background: "#e5e7eb", padding: "1px 5px", borderRadius: 4 }}>PET-2026-000381</code>).
                </p>
                <PetCodeLookup onSelect={handlePetSelect} onClear={handlePetClear} />
              </div>
            )}

            {/* Skipped (No) acknowledgement */}
            {isRegistered === false && (
              <p style={{ marginTop: 10, fontSize: 13, color: "#6B7280" }}>
                That's okay! Your transaction will still be recorded.
              </p>
            )}
          </div>

          {submitError && (
            <div className="form-error" style={{ marginBottom: 12 }}>{submitError}</div>
          )}

          <div style={{ marginTop: 20 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px 16px",
                background: GREEN, color: "#fff", border: "none", borderRadius: 10,
                fontWeight: 700, fontSize: 16, cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.75 : 1,
              }}
            >
              {submitting ? (
                <><Loader2 size={18} className="spin" /> Submitting...</>
              ) : (
                "Confirm and Submit"
              )}
            </button>
          </div>
        </form>
      </div>

      <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12, marginTop: 12 }}>
        City Veterinary Office of Cabuyao · Outreach Program
      </p>
    </div>
  );
}
