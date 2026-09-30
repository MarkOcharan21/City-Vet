import toast from "react-hot-toast";
import {
  getPrintHeader,
  getSectionHeader,
  getPrintFooter,
  openPrintDocument,
} from "./printReport";

const AMP = String.fromCharCode(38);
const ENT_AMP = `${AMP}amp;`;
const ENT_LT = `${AMP}lt;`;
const ENT_GT = `${AMP}gt;`;
const ENT_QUOT = `${AMP}quot;`;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, ENT_AMP)
    .replace(/</g, ENT_LT)
    .replace(/>/g, ENT_GT)
    .replace(/"/g, ENT_QUOT);
}

function displayValue(value) {
  const text = value?.toString().trim();
  return text ? escapeHtml(text) : "—";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function buildMedicineCardHtml(item) {
  return `
    <div class="rx-medicine-card">
      <div class="rx-medicine-card-header">${displayValue(item.name)}</div>
      <div class="rx-medicine-grid">
        <div class="rx-medicine-field">
          <span>Quantity</span>
          <strong>${displayValue(item.quantity)}</strong>
        </div>
        <div class="rx-medicine-field">
          <span>Dosage</span>
          <strong>${displayValue(item.dosage)}</strong>
        </div>
        <div class="rx-medicine-field">
          <span>Frequency</span>
          <strong>${displayValue(item.frequency)}</strong>
        </div>
        <div class="rx-medicine-field">
          <span>Duration</span>
          <strong>${displayValue(item.duration)}</strong>
        </div>
      </div>
      ${
        item.instructions?.trim()
          ? `
        <div class="rx-instructions">
          <span>Special Instructions</span>
          <p>${displayValue(item.instructions)}</p>
        </div>
      `
          : ""
      }
    </div>
  `;
}

/**
 * Prints the prescription slip for a just-saved consultation. The workspace
 * already holds every value the slip needs, so this needs no extra fetch and
 * cannot print a prescription that failed to save.
 */
export default function printPrescriptionSlip({
  pet,
  consultationDate,
  diagnosis,
  medicines,
  prescriptionId,
  prescribedBy,
}) {
  if (!Array.isArray(medicines) || medicines.length === 0) {
    toast.error("There are no medicines on this prescription to print.");
    return false;
  }

  const label = prescriptionId ? `#${prescriptionId}` : "Draft Preview";
  const isDraft = !prescriptionId;
  const notes = diagnosis?.trim();

  const summaryItems = [
    ["Pet", `${displayValue(pet?.name)}${pet?.pet_code ? ` (${displayValue(pet.pet_code)})` : ""}`],
    ["Owner", displayValue(pet?.owner_name)],
    ["Consultation Date", displayValue(formatDate(consultationDate))],
    ...(prescribedBy ? [["Prescribed By", displayValue(prescribedBy)]] : []),
    ["Prescription No.", escapeHtml(label)],
  ];

  const opened = openPrintDocument({
    title: `Prescription - ${pet?.name || "Pet"}`,
    bodyHtml: `
      ${getPrintHeader("Prescription Slip")}

      <div class="rx-status-row">
        <p class="report-meta" style="margin:0;">Generated ${escapeHtml(new Date().toLocaleString("en-PH"))}</p>
        <span class="rx-status-badge ${isDraft ? "rx-status-badge--draft" : ""}">
          ${isDraft ? "Draft Copy" : "Official Copy"}
        </span>
      </div>

      ${getSectionHeader(1, "Patient Information")}
      <div class="rx-summary-grid">
        ${summaryItems
          .map(
            ([label2, value]) => `
        <div class="rx-summary-item">
          <span>${escapeHtml(label2)}</span>
          <strong>${value}</strong>
        </div>`
          )
          .join("")}
      </div>

      ${notes ? `${getSectionHeader(2, "Clinical Notes")}<div class="notes">${displayValue(notes)}</div>` : ""}

      ${getSectionHeader(notes ? 3 : 2, "Medicines Prescribed")}
      ${medicines.map((item) => buildMedicineCardHtml(item)).join("")}

      ${getPrintFooter("Veterinarian / Clinic Staff")}
    `,
  });

  if (!opened) {
    toast.error("Allow pop-ups to print the prescription slip.");
    return false;
  }

  return true;
}
