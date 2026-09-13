import { useEffect, useState } from "react";
import {
  Info,
  User,
  Lock,
  Stamp,
  Syringe,
  Stethoscope,
  Pill,
  ShieldPlus,
  Slice,
  TriangleAlert,
  QrCode,
  BookOpen,
  BadgeCheck,
  Phone,
  PhoneCall,
  AlertTriangle,
  Clock,
  KeyRound,
  PawPrint,
  X,
} from "lucide-react";
import BookletSection, { EmptyState } from "./BookletSection";
import BookletCover from "./BookletCover";
import BookletTabs from "./BookletTabs";
import PetSelector from "./PetSelector";
import PetCareGuide from "./PetCareGuide";
import BookletEditPanel from "./BookletEditPanel";
import { enrichBooklet, AVATAR_PLACEHOLDER, QR_PLACEHOLDER } from "./sampleData";
import { fmt, computeAge } from "./bookletUtils";
import { useAuth } from "../../context/AuthContext";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import stampPng from "../../assets/Digital_Stamp_city_vet.png";
import "./booklet.css";

function parseDurationDays(duration) {
  if (!duration) return null;
  const match = String(duration).match(/(\d+)\s*(day|week|month)s?/i);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "day") return n;
  if (unit === "week") return n * 7;
  if (unit === "month") return n * 30;
  return null;
}

function endDate(start, duration) {
  if (!start) return "—";
  const days = parseDurationDays(duration);
  if (days === null) return "—";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "—";
  const e = new Date(s.getTime() + days * 86400000);
  return fmt(e.toISOString());
}

function nextDueMeta(nextDue) {
  if (!nextDue) return { tone: "none", label: null };
  const ms = new Date(nextDue).getTime() - Date.now();
  if (ms < 0) return { tone: "overdue", label: "Overdue" };
  if (ms < 14 * 86400000) return { tone: "due", label: "Due soon" };
  return { tone: "ok", label: "Up-to-date" };
}

function statusMeta(status) {
  const map = {
    Updated: { tone: "ok", label: "Updated" },
    Due: { tone: "due", label: "Due" },
    Overdue: { tone: "overdue", label: "Overdue" },
    Verified: { tone: "ok", label: "Verified" },
    Paid: { tone: "ok", label: "Paid" },
  };
  return map[status] || { tone: "muted", label: status || "—" };
}

function firstNotEmpty(groups) {
  for (const group of groups) if (Array.isArray(group) && group.length) return group;
  return [];
}

const EDITABLE_ROLES = ["Owner", "Staff", "Admin", "Veterinarian"];

export default function DigitalPetBooklet({ data, mode = "public", pets, activeToken, onSwitchPet, onClose, onRefresh }) {
  const { user } = useAuth();
  const b = enrichBooklet(data, mode);
  const pet = b.pet;

  const [activeTab, setActiveTab] = useState("pet-profile");
  const [editing, setEditing] = useState(false);

  const canEdit = b.authorized && EDITABLE_ROLES.includes(user?.role);

  useEffect(() => {
    setActiveTab("pet-profile");
    setEditing(false);
  }, [pet.pet_code]);

  const changeTab = (id) => {
    setActiveTab(id);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const tabCounts = {
    "digital-stamp": b.stamps.length,
    "vaccination-record": b.vaccinations.length,
    "medical-history": b.consultations.length,
    medications: b.prescriptions.length,
    "preventive-care": b.preventiveCare.length,
    procedures: b.procedures.length,
  };

  const photoUrl = resolveMediaUrl(pet.photo, AVATAR_PLACEHOLDER);
  const qrUrl = resolveMediaUrl(pet.image_path, QR_PLACEHOLDER);

  const allergies = firstNotEmpty([b.emergency.allergies, ["None reported"]]);
  const conditions = firstNotEmpty([b.emergency.conditions, ["None reported"]]);
  const currentMeds = firstNotEmpty([
    b.emergency.current_medication,
    b.prescriptions.slice(0, 2).map((p) => p.medicine_name),
    ["None reported"],
  ]);
  const specialInstructions = b.emergency.special_instructions;

  const printBooklet = () => {
    const booklet = document.querySelector(".booklet-sheet");
    const printWindow = window.open("", "_blank");

    if (!booklet || !printWindow) {
      window.print();
      return;
    }

    // Print only the booklet in its own document.  Printing the modal in the
    // portal lets the app's other print rules use the browser viewport width,
    // which causes Chrome to shrink the record when it is saved as PDF.
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Digital Pet Booklet</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
            body * { visibility: visible !important; }
            .booklet-sheet {
              width: 190mm !important;
              max-width: 190mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #fff !important;
            }
            .booklet-toolbar { display: none !important; }
            .booklet-nav, .booklet-tabs, .booklet-pet-selector { display: none !important; }
            .booklet-tab-panel { display: block !important; }
            .booklet-cover, .booklet-section { break-inside: avoid; page-break-inside: avoid; }
          </style>
        </head>
        <body>${booklet.outerHTML}</body>
      </html>`);
    printWindow.document.close();

    const printWhenReady = () => {
      const images = Array.from(printWindow.document.images);
      Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      }))).finally(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
      });
    };

    if (printWindow.document.readyState === "complete") printWhenReady();
    else printWindow.addEventListener("load", printWhenReady, { once: true });
  };

  return (
    <div className="booklet-sheet" style={{ "--stamp-url": `url(${stampPng})` }}>
      <div className="booklet-toolbar">
        <div className="booklet-toolbar__brand">
          <span className="booklet-toolbar__logo" aria-hidden="true">
            <PawPrint size={18} strokeWidth={2.3} />
          </span>
          <div className="booklet-toolbar__titles">
            <span className="booklet-toolbar__title">Digital Pet Booklet</span>
            <span className="booklet-toolbar__sub">
              {pet.name} · {pet.pet_code}
            </span>
          </div>
        </div>
        <div className="booklet-toolbar__actions">
          {canEdit && (
            <button
              type="button"
              className={`booklet-toolbar__edit${editing ? " is-active" : ""}`}
              onClick={() => setEditing((cur) => !cur)}
              aria-pressed={editing}
            >
              ✏️ {editing ? "Close Editor" : "Edit Info"}
            </button>
          )}
          <button type="button" className="booklet-toolbar__print" onClick={printBooklet}>
            🖨 Print / Save as PDF
          </button>
          {onClose && (
            <button
              type="button"
              className="booklet-toolbar__close"
              onClick={onClose}
              aria-label="Close booklet"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <PetSelector pets={pets} activeToken={activeToken} onSelect={onSwitchPet} />

      {editing && canEdit && (
        <BookletEditPanel pet={pet} role={user?.role} onSaved={onRefresh} />
      )}

      {pet.is_lost === 1 && (
        <div className="booklet-lost">
          <div className="booklet-lost__title">
            <TriangleAlert size={20} strokeWidth={2.5} /> LOST PET ALERT
          </div>
          <p className="booklet-lost__text">
            This pet has been reported lost. If you have information, please contact the City Veterinary
            Office immediately.
          </p>
          {pet.last_seen && (
            <p className="booklet-lost__seen">
              <strong>Last seen:</strong> {pet.last_seen}
              {pet.reward ? <> • <strong>Reward:</strong> {pet.reward}</> : null}
            </p>
          )}
        </div>
      )}

      <BookletCover pet={pet} photoUrl={photoUrl} qrUrl={qrUrl} authorized={b.authorized} />

      <BookletTabs activeTab={activeTab} onChange={changeTab} counts={tabCounts} />
      <div className="booklet-panels">

      {/* 02 · PET PROFILE */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "pet-profile"}>
      <BookletSection id="pet-profile" number={2} icon={<Info size={20} />} title="Pet Profile" subtitle="Basic identification details of the registered pet">
        <div className="booklet-grid booklet-grid--4">
          <ProfileField label="Pet Name" value={pet.name} />
          <ProfileField label="Species" value={pet.species_name || "—"} />
          <ProfileField label="Breed" value={pet.breed_name || "—"} />
          <ProfileField label="Sex" value={pet.sex || "—"} />
          <ProfileField label="Color / Markings" value={pet.color || "—"} />
          <ProfileField label="Date of Birth" value={fmt(pet.birthdate)} />
          <ProfileField label="Estimated Age" value={computeAge(pet.birthdate)} />
          <ProfileField label="Registration Date" value={fmt(pet.registration_date)} />
          <ProfileField label="Registration No." value={pet.pet_code || "—"} />
          <ProfileField label="Pet Status" value={pet.status || "Registered"} strong />
        </div>
      </BookletSection>
      </div>

      {/* 03 · OWNER INFORMATION */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "owner-info"}>
      <BookletSection id="owner-info" number={3} icon={<User size={20} />} title="Owner Information" subtitle="Registered pet owner details">
        {b.authorized ? (
          <div className="booklet-grid booklet-grid--4">
            <ProfileField label="Owner Name" value={pet.full_name || "—"} />
            <ProfileField label="Contact Number" value={pet.contact_number || "—"} />
            <ProfileField label="Registered Address" value={pet.address || "—"} span={2} />
            <ProfileField label="Barangay" value={pet.barangay || "—"} />
            <ProfileField label="Emergency Contact" value={b.emergency.emergency_contact_name || "Not set"} muted />
          </div>
        ) : (
          <div className="booklet-private">
            <Lock size={22} strokeWidth={2.2} />
            <div>
              <div className="booklet-private__title">Owner information is private</div>
              <p className="booklet-private__text">
                Full owner details are only visible to the registered owner and authorized clinic
                personnel.
              </p>
            </div>
          </div>
        )}
      </BookletSection>
      </div>

      {/* 04 · DIGITAL STAMP / VERIFICATION */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "digital-stamp"}>
      <BookletSection id="digital-stamp" number={4} icon={<Stamp size={20} />} title="Digital Stamp / Verification" subtitle="System-generated official verification records" count={b.stamps.length}>
        {b.stamps.length ? (
          <div className="stamp-list">
            {b.stamps.map((stamp, i) => (
              <div className="stamp-row" key={i}>
                <div className="stamp-row__seal">
                  <div className="stamp-row__seal-icon">
                    <BadgeCheck size={18} strokeWidth={2.4} />
                  </div>
                  <div className="stamp-seal-img" role="img" aria-label="City Vet Official Stamp" />
                </div>
                <div className="stamp-row__body">
                  <div className="stamp-row__top">
                    <div className="stamp-row__transaction">{stamp.transaction}</div>
                    <span className="status-pill status-pill--ok">VERIFIED</span>
                  </div>
                  <div className="stamp-row__meta">
                    <Clock size={13} strokeWidth={2.2} />
                    <span>{fmt(stamp.date)}</span>
                    {stamp.time ? (
                      <>
                        <span className="dot">•</span>
                        <span>{stamp.time}</span>
                      </>
                    ) : null}
                    <span className="dot">•</span>
                    <span>Verified by: {stamp.verified_by || "City Veterinary Office"}</span>
                  </div>
                  <div className="stamp-row__footnote">System-generated official digital stamp</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Stamp size={26} />} title="No official transactions recorded yet" note="Digital stamps appear automatically after each verified veterinary transaction." />
        )}
      </BookletSection>
      </div>

      {/* 05 · VACCINATION RECORD */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "vaccination-record"}>
      <BookletSection id="vaccination-record" number={5} icon={<Syringe size={20} />} title="Vaccination Record" subtitle="Immunization history and due schedules" count={b.vaccinations.length}>
        {b.vaccinations.length ? (
          <div className="table-wrap">
            <table className="booklet-table">
              <thead>
                <tr>
                  <th>Vaccine</th>
                  <th>Date</th>
                  <th>Next Due</th>
                  <th>Verified By</th>
                  <th>Remarks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {b.vaccinations.map((v) => {
                  const meta = statusMeta(v.status);
                  return (
                    <tr key={v.id}>
                      <td data-label="Vaccine"><strong>{v.vaccine_name}</strong></td>
                      <td data-label="Date">{fmt(v.date_administered)}</td>
                      <td data-label="Next Due">{fmt(v.next_due_date)}</td>
                      <td data-label="Verified By">{v.staff_name || "—"}</td>
                      <td data-label="Remarks">{v.comments || "—"}</td>
                      <td data-label="Status"><span className={`status-pill status-pill--${meta.tone}`}>{meta.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Syringe size={26} />} title="No vaccination records yet" note="Vaccination records will appear here once administered by the clinic." />
        )}
      </BookletSection>
      </div>

      {/* 06 · MEDICAL HISTORY */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "medical-history"}>
      <BookletSection id="medical-history" number={6} icon={<Stethoscope size={20} />} title="Medical History" subtitle="Chronological record of consultations and treatments" count={b.consultations.length}>
        {b.consultations.length ? (
          <div className="table-wrap">
            <table className="booklet-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Visit / Complaint</th>
                  <th>Diagnosis</th>
                  <th>Treatment</th>
                  <th>Veterinarian</th>
                </tr>
              </thead>
              <tbody>
                {b.consultations.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Date">{fmt(c.consultation_date)}</td>
                    <td data-label="Visit / Complaint">{c.complaint || "—"}</td>
                    <td data-label="Diagnosis">{c.diagnosis || "—"}</td>
                    <td data-label="Treatment">{c.treatment_plan || "—"}</td>
                    <td data-label="Veterinarian">{c.veterinarian || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Stethoscope size={26} />} title="No medical history yet" note="Consultation and treatment history will appear here once available." />
        )}
      </BookletSection>
      </div>

      {/* 07 · MEDICATIONS */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "medications"}>
      <BookletSection id="medications" number={7} icon={<Pill size={20} />} title="Medications" subtitle="Prescribed medicines and dosage instructions" count={b.prescriptions.length}>
        {b.prescriptions.length ? (
          <div className="table-wrap">
            <table className="booklet-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Instructions</th>
                  <th>Prescribed By</th>
                </tr>
              </thead>
              <tbody>
                {b.prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Medicine"><strong>{p.medicine_name}</strong>{p.quantity ? <span className="cell-sub"> ({p.quantity})</span> : null}</td>
                    <td data-label="Dosage">{p.dosage || "—"}</td>
                    <td data-label="Frequency">{p.frequency || "—"}</td>
                    <td data-label="Start">{fmt(p.prescribed_date)}</td>
                    <td data-label="End">{endDate(p.prescribed_date, p.duration)}</td>
                    <td data-label="Instructions">{p.instructions || "—"}</td>
                    <td data-label="Prescribed By">{p.prescribed_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Pill size={26} />} title="No medications prescribed" note="Prescribed medications will appear here once recorded by the clinic." />
        )}
      </BookletSection>
      </div>

      {/* 08 · DEWORMING & PREVENTIVE CARE */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "preventive-care"}>
      <BookletSection id="preventive-care" number={8} icon={<ShieldPlus size={20} />} title="Deworming & Preventive Care" subtitle="Separate tracking for deworming and preventive treatments" count={b.preventiveCare.length}>
        {b.preventiveCare.length ? (
          <div className="table-wrap">
            <table className="booklet-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Date</th>
                  <th>Next Due</th>
                  <th>Administered By</th>
                </tr>
              </thead>
              <tbody>
                {b.preventiveCare.map((p) => {
                  const due = nextDueMeta(p.next_due_date);
                  return (
                    <tr key={p.id}>
                      <td data-label="Type">{p.care_type}</td>
                      <td data-label="Product"><strong>{p.product_name}</strong></td>
                      <td data-label="Date">{fmt(p.date_administered)}</td>
                      <td data-label="Next Due">
                        {p.next_due_date ? (
                          <span className={`status-pill status-pill--${due.tone}`}>
                            {fmt(p.next_due_date)} {due.label ? `· ${due.label}` : ""}
                          </span>
                        ) : "—"}
                      </td>
                      <td data-label="Administered By">{p.administered_by || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<ShieldPlus size={26} />} title="No preventive care records yet" note="Deworming and flea/tick prevention tracking will appear here." />
        )}
      </BookletSection>
      </div>

      {/* 09 · PROCEDURES */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "procedures"}>
      <BookletSection id="procedures" number={9} icon={<Slice size={20} />} title="Procedures" subtitle="Surgeries, laboratory and other veterinary procedures" count={b.procedures.length}>
        {b.procedures.length ? (
          <div className="table-wrap">
            <table className="booklet-table">
              <thead>
                <tr>
                  <th>Procedure</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Veterinarian</th>
                  <th>Result / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {b.procedures.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Procedure"><strong>{p.procedure_name}</strong></td>
                    <td data-label="Type">{p.procedure_type}</td>
                    <td data-label="Date">{fmt(p.procedure_date)}</td>
                    <td data-label="Veterinarian">{p.veterinarian || "—"}</td>
                    <td data-label="Result / Remarks">{p.result_notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Slice size={26} />} title="No procedures recorded" note="Spay/neuter, surgery and laboratory records will appear here." />
        )}
      </BookletSection>
      </div>

      {/* 10 · EMERGENCY INFORMATION */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "emergency-info"}>
      <BookletSection id="emergency-info" number={10} icon={<TriangleAlert size={20} />} title="Emergency Information" subtitle="Quick-access details for emergency responders" accent="danger">
        <div className="booklet-grid booklet-grid--2">
          <div className="emergency-card emergency-card--lead">
            <img src={photoUrl} alt={pet.name} className="emergency-card__photo" />
            <div>
              <div className="emergency-card__name">{pet.name}</div>
              <div className="emergency-card__code">{pet.pet_code}</div>
            </div>
          </div>

          <div className="emergency-card">
            <div className="emergency-card__row">
              <span className="emergency-card__label">Owner Contact</span>
              <span className="emergency-card__value">
                {b.authorized ? (
                  <>
                    <PhoneCall size={14} strokeWidth={2.4} /> {pet.contact_number || "—"}
                  </>
                ) : (
                  "Available to authorized personnel"
                )}
              </span>
            </div>
            <div className="emergency-card__row">
              <span className="emergency-card__label">Emergency Contact</span>
              <span className="emergency-card__value">
                {b.emergency.emergency_contact_name || "Not set"}
                {b.emergency.emergency_contact_number ? ` • ${b.emergency.emergency_contact_number}` : ""}
              </span>
            </div>
            <div className="emergency-card__row">
              <span className="emergency-card__label">Allergies</span>
              <span className="emergency-card__value">{allergies.join(", ")}</span>
            </div>
            <div className="emergency-card__row">
              <span className="emergency-card__label">Current Medication</span>
              <span className="emergency-card__value">{currentMeds.join(", ")}</span>
            </div>
            <div className="emergency-card__row">
              <span className="emergency-card__label">Important Condition</span>
              <span className="emergency-card__value">{conditions.join(", ")}</span>
            </div>
          </div>
        </div>

        {specialInstructions ? (
          <div className="emergency-note">
            <AlertTriangle size={16} strokeWidth={2.4} />
            <span><strong>Special instructions:</strong> {specialInstructions}</span>
          </div>
        ) : null}
      </BookletSection>
      </div>

      {/* 11 · QR VERIFICATION */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "qr-verification"}>
      <BookletSection id="qr-verification" number={11} icon={<QrCode size={20} />} title="QR Verification" subtitle="Verify the authenticity of this digital record">
        <div className="qr-verify">
          <div className="qr-verify__code">
            {qrUrl && <img src={qrUrl} alt={`QR verification for ${pet.name}`} />}
            <div className="qr-verify__seal">
              <div className="stamp-seal-img" role="img" aria-label="City Vet Official Stamp" />
            </div>
          </div>
          <div className="qr-verify__info">
            <div className="qr-verify__label">DIGITAL RECORD VERIFICATION</div>
            <div className="qr-verify__id">
              <span className="qr-verify__id-label">Pet ID</span>
              <span className="qr-verify__id-value">{pet.pet_code || "—"}</span>
            </div>
            <div className="qr-verify__status">
              <span className="status-pill status-pill--ok">
                <BadgeCheck size={15} strokeWidth={2.5} /> VERIFIED
              </span>
            </div>
            <div className="qr-verify__updated">Last updated: {fmt(pet.issue_date || pet.registration_date)}</div>
            <div className="qr-verify__note">
              <Phone size={14} strokeWidth={2.2} /> Scan with your phone camera to open this pet's Digital Pet Booklet.
            </div>
            <div className="qr-verify__secure">
              <KeyRound size={14} strokeWidth={2.2} />
              <span>
                This QR code is a <strong>secure access token</strong> — it does not contain personal
                information, only a safe link to this authorized digital record.
              </span>
            </div>
          </div>
        </div>
      </BookletSection>
      </div>

      {/* 12 · PET CARE GUIDE */}
      <div className="booklet-tab-panel" role="tabpanel" hidden={activeTab !== "pet-care-guide"}>
      <BookletSection id="pet-care-guide" number={12} icon={<BookOpen size={20} />} title="Pet Care Guide" subtitle="Responsible pet ownership reminders from the City Veterinary Office">
        <PetCareGuide items={b.careGuide} />
      </BookletSection>
      </div>

      </div>

      <footer className="booklet-footer">
        <div>
          <strong>City Veterinary Animal Clinic</strong> • Cabuyao City, Laguna
        </div>
        <div>This is an official digital record generated by the City Veterinary Office.</div>
      </footer>
    </div>
  );
}

function ProfileField({ label, value, strong, muted, span }) {
  return (
    <div className={`profile-item${span ? " profile-item--span" : ""}`}>
      <span className="profile-item__label">{label}</span>
      <span className={`profile-item__value${strong ? " profile-item__value--strong" : ""}${muted ? " profile-item__value--muted" : ""}`}>
        {value}
      </span>
    </div>
  );
}