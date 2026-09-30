import { useCallback, useState } from "react";
import { Pill, Trash2, Wand2, Search, Check } from "lucide-react";
import FieldError from "../ui/FieldError";
import {
  DOSAGE_CHIPS,
  FREQUENCY_CHIPS,
  DURATION_CHIPS,
  emptyPrescriptionItem,
  buildRegimen,
  getQuantitySuggestion,
} from "../../utils/medicineDosing";

function formatMoney(value) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MedicinePrescriptionSection({
  items,
  medicines,
  diagnosis,
  activeRegimen = null,
  sourceLabel = null,
  onChange,
  fieldErrors = {},
  onClearError,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const updateItem = useCallback(
    (index, patch) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item))),
    [items, onChange]
  );

  const editField = useCallback(
    (index, field, value) =>
      updateItem(index, { [field]: value, touched: { ...(items[index].touched || {}), [field]: true } }),
    [items, updateItem]
  );

  const handleMedicineToggle = useCallback(
    (medicineId) => {
      const existingIndex = items.findIndex((item) => String(item.medicine_id) === String(medicineId) && item.medicine_id);
      if (existingIndex >= 0) {
        onChange(items.filter((_, i) => i !== existingIndex));
        return;
      }

      const medicine = medicines.find((entry) => String(entry.id) === String(medicineId));
      if (!medicine) return;

      const regimen = buildRegimen(medicine, diagnosis);
      const filled = {
        ...emptyPrescriptionItem(),
        medicine_id: medicineId,
        price: medicine.price != null ? Number(medicine.price) : null,
        touched: {},
        ...(regimen
          ? {
              dosage: regimen.dosage,
              frequency: regimen.frequency,
              duration: regimen.duration,
              instructions: regimen.instructions,
              quantity: regimen.quantity || "",
            }
          : {}),
      };

      const target = items.length === 1 && !items[0].medicine_id ? 0 : -1;
      if (target === 0) {
        onChange([filled]);
      } else {
        onChange([...items, filled]);
      }
    },
    [medicines, diagnosis, items, onChange]
  );

  const removeItem = useCallback(
    (index) => onChange(items.filter((_, i) => i !== index)),
    [items, onChange]
  );

  const applyRegimen = useCallback(
    (index) => {
      const item = items[index];
      const medicine = medicines.find((entry) => String(entry.id) === String(item.medicine_id));
      const regimen = buildRegimen(medicine, diagnosis);
      if (!regimen) return;

      const touched = { ...(item.touched || {}) };
      delete touched.dosage;
      delete touched.frequency;
      delete touched.duration;
      delete touched.quantity;

      updateItem(index, {
        dosage: regimen.dosage,
        frequency: regimen.frequency,
        duration: regimen.duration,
        quantity: regimen.quantity || item.quantity,
        touched,
      });
    },
    [items, medicines, diagnosis, updateItem]
  );

  const templateMedicineIds = activeRegimen?.medicines?.length
    ? new Set(activeRegimen.medicines.map((m) => String(m.medicine_id)))
    : null;

  const filteredMedicines = medicines.filter((med) => {
    if (templateMedicineIds && !templateMedicineIds.has(String(med.id))) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      med.medicine_name?.toLowerCase().includes(term) ||
      med.description?.toLowerCase().includes(term) ||
      med.category?.toLowerCase().includes(term)
    );
  });

  const prescribedIds = new Set(items.filter((i) => i.medicine_id).map((i) => String(i.medicine_id)));
  const prescribedItems = items.filter((item) => item.medicine_id);
  const totalPrice = prescribedItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <section className="clinical-form-section">
      <div className="clinical-form-section-header">
        <h3>Medicines &amp; Prescription</h3>
        <p>
          {activeRegimen
            ? `Showing medicines for "${activeRegimen.name}". Click to add or remove.`
            : "Click a medicine to add it. Click again to remove. Dosing is auto-computed based on the diagnosis."}
        </p>
      </div>

      {sourceLabel && <p className="prescription-source-note">{sourceLabel}</p>}

      <div className="medicine-picker">
        <div className="medicine-picker-search">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicines..."
            aria-label="Search medicines"
          />
        </div>

        <div className="medicine-card-grid">
          {filteredMedicines.length === 0 ? (
            <div className="empty-state-cell">No medicines found.</div>
          ) : (
            filteredMedicines.map((medicine) => {
              const isSelected = prescribedIds.has(String(medicine.id));
              return (
                <button
                  type="button"
                  key={medicine.id}
                  className={`medicine-card${isSelected ? " medicine-card--selected" : ""}`}
                  onClick={() => handleMedicineToggle(medicine.id)}
                >
                  <div className="medicine-card-header">
                    <span className="medicine-card-name">{medicine.medicine_name}</span>
                    {isSelected && (
                      <span className="medicine-card-check">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  {medicine.description && (
                    <p className="medicine-card-desc">{medicine.description}</p>
                  )}
                  <div className="medicine-card-footer">
                    {medicine.category && (
                      <span className="medicine-card-category">{medicine.category}</span>
                    )}
                    {medicine.price != null && Number(medicine.price) > 0 && (
                      <span className="medicine-card-price">{formatMoney(medicine.price)}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {prescribedItems.length > 0 && (
        <div className="prescription-list">
          <h4 className="prescription-list-title">Prescribed Medicines</h4>
          {items.map((item, index) => {
            if (!item.medicine_id) return null;

            const quantitySuggestion = getQuantitySuggestion(item);
            const selectedMedicine = medicines.find((entry) => String(entry.id) === String(item.medicine_id));
            const course = selectedMedicine ? buildRegimen(selectedMedicine, diagnosis) : null;
            const driftedFields = course
              ? [
                  course.dosage !== item.dosage && "dosage",
                  course.frequency !== item.frequency && "frequency",
                  course.duration !== item.duration && "duration",
                ].filter(Boolean)
              : [];

            return (
              <div className="prescription-item-card" key={index}>
                <div className="prescription-item-header">
                  <span className="prescription-item-title">
                    <Pill size={14} aria-hidden="true" /> {selectedMedicine?.medicine_name || "Medicine"}
                  </span>
                  <button type="button" className="prescription-item-remove" onClick={() => removeItem(index)}>
                    <Trash2 size={14} aria-hidden="true" /> Remove
                  </button>
                </div>

                <div className="clinical-form-grid clinical-form-grid--2">
                  <div className="field-group">
                    <label htmlFor={`dosage-${index}`}>Dosage</label>
                    <input
                      id={`dosage-${index}`}
                      value={item.dosage}
                      onChange={(e) => editField(index, 'dosage', e.target.value)}
                      placeholder="e.g. 1 tablet"
                    />
                    <div className="quick-template-row">
                      {DOSAGE_CHIPS.map((chip) => (
                        <button
                          type="button"
                          key={chip}
                          className="quick-template-chip"
                          onClick={() => editField(index, 'dosage', chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor={`frequency-${index}`}>Frequency</label>
                    <input
                      id={`frequency-${index}`}
                      value={item.frequency}
                      onChange={(e) => editField(index, 'frequency', e.target.value)}
                      placeholder="e.g. Twice daily"
                    />
                    <div className="quick-template-row">
                      {FREQUENCY_CHIPS.map((chip) => (
                        <button
                          type="button"
                          key={chip}
                          className="quick-template-chip"
                          onClick={() => editField(index, 'frequency', chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor={`duration-${index}`}>Duration</label>
                    <input
                      id={`duration-${index}`}
                      value={item.duration}
                      onChange={(e) => editField(index, 'duration', e.target.value)}
                      placeholder="e.g. 7 days"
                    />
                    <div className="quick-template-row">
                      {DURATION_CHIPS.map((chip) => (
                        <button
                          type="button"
                          key={chip}
                          className="quick-template-chip"
                          onClick={() => editField(index, 'duration', chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor={`quantity-${index}`}>Quantity</label>
                    <input
                      id={`quantity-${index}`}
                      value={item.quantity}
                      onChange={(e) => editField(index, 'quantity', e.target.value)}
                      placeholder="e.g. 1 bottle, 14 tablets"
                    />
                    {quantitySuggestion && item.quantity !== quantitySuggestion && (
                      <div className="quantity-suggestion-row">
                        <span className="quantity-suggestion-label">Suggested:</span>
                        <button
                          type="button"
                          className="quick-template-chip"
                          onClick={() => editField(index, 'quantity', quantitySuggestion)}
                        >
                          {quantitySuggestion}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor={`price-${index}`}>Price</label>
                    <input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        updateItem(index, { price: val });
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {course?.course && (
                  <div className="regimen-note">
                    <Wand2 size={14} aria-hidden="true" />
                    <span>
                      <strong>{course.course.label}</strong> — {course.course.reason} Default would be{" "}
                      {selectedMedicine.default_duration}.
                    </span>
                    {driftedFields.length > 0 && (
                      <button
                        type="button"
                        className="regimen-apply-btn"
                        onClick={() => applyRegimen(index)}
                        title={`Replace your ${driftedFields.join(" and ")} with the suggested value`}
                      >
                        Use suggested regimen
                      </button>
                    )}
                  </div>
                )}

                <div className="field-group">
                  <label htmlFor={`instructions-${index}`}>Special Instructions</label>
                  <input
                    id={`instructions-${index}`}
                    value={item.instructions}
                    onChange={(e) => editField(index, 'instructions', e.target.value)}
                    placeholder="e.g. Give with food, may cause drowsiness"
                  />
                </div>
              </div>
            );
          })}

          <div className="prescription-total">
            <span>Total Medicines Price</span>
            <strong>{formatMoney(totalPrice)}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
