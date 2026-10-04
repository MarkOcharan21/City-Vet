import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  QrCode,
  Search,
  PawPrint,
  Printer,
  Stethoscope,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pill,
  ClipboardList,
  Calendar,
  FileText,
  Eye,
  History,
  X,
} from "lucide-react";
import DirectQrScanner from "../../components/staff/DirectQrScanner";
import MedicinePrescriptionSection from "../../components/staff/MedicinePrescriptionSection";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import GlobalLoadingOverlay from "../../components/GlobalLoadingOverlay";
import useMinLoading from "../../hooks/useMinLoading";
import FieldError from "../../components/ui/FieldError";
import { validateClinicalRecord } from "../../utils/validation";
import { emptyPrescriptionItem, rederivePrescription, buildRegimen } from "../../utils/medicineDosing";
import printPrescriptionSlip from "../../utils/prescriptionPrint";
import PrintReportButton from "../../components/staff/PrintReportButton";
import StatusBadge from "../../components/StatusBadge";
import { hasValue, formatDate, formatAge } from "../../utils/petDisplay";
import PetHealthNotesModal from "../../components/PetHealthNotesModal";

const DEFAULT_CONSULTATION_PRODUCT_NAME = "Consultation Fee";

function todayValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAGE_SIZE = 25;

const STEPS = [
  { key: "patient", label: "Select Patient", icon: PawPrint },
  { key: "notes", label: "Visit Notes", icon: FileText },
  { key: "medicines", label: "Medicines", icon: Pill },
  { key: "review", label: "Review", icon: Eye },
];

export default function ClinicalRecords() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedPetId = searchParams.get("pet_id");
  const [pets, setPets] = useState([]);
  const [catalogGroups, setCatalogGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoading(loading);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    complaint: "",
    diagnosis: "",
    treatment_plan: "",
    consultation_date: todayValue(),
    follow_up_date: "",
  });
  const [charges, setCharges] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [regimens, setRegimens] = useState([]);
  const [activeRegimen, setActiveRegimen] = useState(null);
  const [prescription, setPrescription] = useState([emptyPrescriptionItem()]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedPet, setSelectedPet] = useState(null);
  const [petLoading, setPetLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState("single");
  const [scannedPets, setScannedPets] = useState([]);
  const scannedPetIdsRef = useRef(new Set());
  const [searchPetName, setSearchPetName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pickerStatus, setPickerStatus] = useState("Verified");
  const [pickerPage, setPickerPage] = useState(1);
  const searchDebounceRef = useRef(null);
  const [savedReceipt, setSavedReceipt] = useState(null);
  const successModalRef = useRef(null);
  const [healthPet, setHealthPet] = useState(null);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [petRecords, setPetRecords] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  function loadPets() {
    return api.get("/pets").then((res) => {
      setPets(res.data.pets || []);
    }).catch(() => setPets([])).finally(() => setPetLoading(false));
  }

  function loadCatalog() {
    return api.get("/catalog")
      .then((res) => setCatalogGroups(res.data.categories || []))
      .catch(() => setCatalogGroups([]));
  }

  function loadMedicines() {
    return api.get("/medicines/list")
      .then((res) => setMedicines(res.data.medicines || []))
      .catch(() => setMedicines([]));
  }

  function loadRegimens() {
    return api.get("/regimens")
      .then((res) => setRegimens(res.data.regimens || []))
      .catch(() => setRegimens([]));
  }

  async function loadPetRecords(petId) {
    setLoadingRecords(true);
    try {
      const [clinicalRes, vaccineRes] = await Promise.all([
        api.get(`/clinical?pet_id=${petId}`),
        api.get(`/vaccinations/pet/${petId}`)
      ]);
      setPetRecords({
        clinical: clinicalRes.data.records || [],
        vaccinations: vaccineRes.data.history || []
      });
    } catch (error) {
      toast.error("Failed to load pet records");
      setPetRecords({ clinical: [], vaccinations: [] });
    } finally {
      setLoadingRecords(false);
    }
  }

  function openRecordsModal() {
    if (selectedPet?.pet_id) {
      setRecordsModalOpen(true);
      loadPetRecords(selectedPet.pet_id);
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPets(), loadCatalog(), loadMedicines(), loadRegimens()]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    if (!preselectedPetId || pets.length === 0) return;
    const match = pets.find((pet) => String(pet.id) === String(preselectedPetId));
    if (!match) return;
    if (match.status && match.status !== 'Verified') {
      setFieldErrors({ pet: `"${match.name}" is not yet verified. Verify the pet registration before consulting.` });
      toast.error(`"${match.name}" is not yet verified and cannot be consulted yet.`);
      return;
    }
    setSelectedPet({ pet_id: match.id, name: match.name, pet_code: match.pet_code, owner_name: match.owner_name, id: match.id, status: match.status });
  }, [preselectedPetId, pets]);

  const catalogProducts = useMemo(() => catalogGroups.flatMap((group) => group.products || []), [catalogGroups]);
  const productMap = useMemo(() => new Map(catalogProducts.map((product) => [Number(product.id), product])), [catalogProducts]);

  useEffect(() => {
    if (!selectedPet) return;
    const product = catalogProducts.find(
      (entry) => entry.name === DEFAULT_CONSULTATION_PRODUCT_NAME && Number(entry.active ?? 1) === 1
    );
    if (!product) return;
    const productId = Number(product.id);
    setCharges((current) =>
      current.some((charge) => Number(charge.catalog_product_id) === productId)
        ? current
        : [...current, { catalog_product_id: productId, quantity: 1 }]
    );
  }, [selectedPet, catalogProducts]);

  const cartLines = useMemo(
    () => charges.map((charge) => {
      const product = productMap.get(Number(charge.catalog_product_id));
      const unitPrice = Number(product?.price) || 0;
      const quantity = Math.max(1, Number(charge.quantity) || 1);
      return {
        catalogProductId: Number(charge.catalog_product_id),
        name: product?.name || "Catalog service",
        unit: product?.unit || null,
        species: product?.species || null,
        subcategory: product?.subcategory || null,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      };
    }),
    [charges, productMap],
  );
  const cartTotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);

  useEffect(() => {
    if (savedReceipt && successModalRef.current) successModalRef.current.focus();
  }, [savedReceipt]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    if (name === "diagnosis") {
      setPrescription((current) => rederivePrescription(current, value, medicines));
    }
  }

  function applyTemplate(template) {
    setForm((current) => ({
      ...current,
      complaint: template.complaint,
      diagnosis: template.diagnosis,
      treatment_plan: template.treatment,
    }));
    setFieldErrors((current) => ({ ...current, complaint: "", diagnosis: "", treatment_plan: "" }));
    setActiveRegimen(template);

    const seeded = (template.medicines || []).map((medicine) => ({
      ...emptyPrescriptionItem(),
      medicine_id: medicine.medicine_id,
      dosage: medicine.dosage || "",
      frequency: medicine.frequency || "",
      duration: medicine.duration || "",
      instructions: medicine.instructions || "",
    }));

    const withItems = seeded.length > 0 ? seeded : [emptyPrescriptionItem()];
    setPrescription(rederivePrescription(withItems, template.diagnosis, medicines));
  }

  function setFollowUpInDays(days) {
    if (!form.consultation_date) return;
    const date = new Date(`${form.consultation_date}T00:00:00`);
    date.setDate(date.getDate() + days);
    setForm((current) => ({ ...current, follow_up_date: date.toISOString().slice(0, 10) }));
  }

  function addMedicineToPrescription(medicineId) {
    setPrescription((current) => {
      if (current.some((item) => String(item.medicine_id) === String(medicineId) && item.medicine_id)) {
        return current;
      }

      const medicine = medicines.find((entry) => String(entry.id) === String(medicineId));
      const regimen = buildRegimen(medicine, form.diagnosis);
      const filled = {
        ...emptyPrescriptionItem(),
        medicine_id: medicineId,
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

      const target = current.length === 1 && !current[0].medicine_id ? 0 : -1;
      if (target === 0) return [filled];

      return [...current, filled];
    });
  }

  function clearBatch() {
    scannedPetIdsRef.current.clear();
    setScannedPets([]);
  }

  function canConsult(pet) {
    if (pet && pet.status && pet.status !== 'Verified') {
      toast.error(`"${pet.name}" is not yet verified. Verify the pet registration before consulting.`);
      return false;
    }
    return true;
  }

  function selectBatchPet(pet) {
    if (!canConsult(pet)) return;
    setSelectedPet(pet);
    setQrModalOpen(false);
    clearBatch();
    setStep(2);
  }

  function openMobileScanModal() {
    setQrModalOpen(true);
  }

  function handlePetScanned(petData, mode) {
    if (!canConsult(petData)) return;
    if (mode === "batch") {
      if (scannedPetIdsRef.current.has(petData.pet_id)) return;
      scannedPetIdsRef.current.add(petData.pet_id);
      setScannedPets((prev) => [...prev, petData]);
      toast.success(`Added ${petData.name} to batch.`);
    } else {
      setSelectedPet(petData);
      setQrModalOpen(false);
      setStep(2);
      toast.success(`Pet ${petData.name} selected.`);
    }
  }

  async function handleSearchPet(rawTerm) {
    const term = String(rawTerm ?? "").trim();
    if (term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    api.get("/pets", { params: { search: term } }).then((res) => {
      const pets = res.data.pets || [];
      setSearchResults(pets);
    }).catch(() => setSearchResults([])).finally(() => setSearching(false));
  }

  const pickerTerm = searchPetName.trim();
  const isPickerSearching = pickerTerm.length >= 2;
  const pickerSource = isPickerSearching ? searchResults : pets;

  const pickerFilteredPets = useMemo(() => {
    if (!pickerStatus) return pickerSource;
    if (pickerStatus === 'Pending') return pickerSource.filter((pet) => pet.status !== 'Verified');
    return pickerSource.filter((pet) => pet.status === pickerStatus);
  }, [pickerSource, pickerStatus]);

  const totalPickerPages = Math.max(1, Math.ceil(pickerFilteredPets.length / PAGE_SIZE));
  const safePickerPage = Math.min(pickerPage, totalPickerPages);
  const visiblePickerPets = pickerFilteredPets.slice(
    (safePickerPage - 1) * PAGE_SIZE,
    safePickerPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPickerPage(1);
  }, [searchPetName, pickerStatus]);

  function selectFromSearch(pet) {
    if (!canConsult(pet)) return;
    setSelectedPet({ pet_id: pet.id, name: pet.name, pet_code: pet.pet_code, owner_name: pet.owner_name, id: pet.id, status: pet.status });
    setSearchPetName("");
    setSearchResults([]);
    setSearchParams({});
    setStep(2);
    toast.success(`Pet ${pet.name} selected.`);
  }

  function goToStep(nextStep) {
    setFieldErrors({});
    setStep(nextStep);
  }

  function handleNext() {
    setFieldErrors({});
    if (step === 1 && !selectedPet) {
      setFieldErrors({ pet: "Select a patient first." });
      toast.error("Select a patient first.");
      return;
    }
    if (step === 2) {
      const validation = validateClinicalRecord({
        pet_id: selectedPet?.pet_id,
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
    }
    setStep((current) => Math.min(4, current + 1));
  }

  function handleBack() {
    setFieldErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({});
    if (!selectedPet) {
      setFieldErrors({ pet: "Select a patient first." });
      toast.error("Select a patient first.");
      return;
    }
    if (selectedPet.status && selectedPet.status !== 'Verified') {
      setFieldErrors({ pet: `"${selectedPet.name}" is not yet verified. Verify the pet registration before consulting.` });
      toast.error(`"${selectedPet.name}" is not yet verified and cannot be consulted yet.`);
      return;
    }
    if (!charges.length) {
      setFieldErrors({ charges: "Add at least one consultation charge." });
      toast.error("Add at least one consultation charge.");
      return;
    }
    const validation = validateClinicalRecord({
      pet_id: selectedPet.pet_id,
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
      const medicineItems = prescription
        .filter((item) => String(item.medicine_id || "").trim() !== "")
        .map((item) => ({
          medicine_id: Number(item.medicine_id),
          quantity: (item.quantity || "").trim() || null,
          dosage: (item.dosage || "").trim() || null,
          frequency: (item.frequency || "").trim() || null,
          duration: (item.duration || "").trim() || null,
          instructions: (item.instructions || "").trim() || null,
        }));

      const payload = {
        pet_id: selectedPet.pet_id,
        complaint: form.complaint,
        diagnosis: form.diagnosis,
        treatment_plan: form.treatment_plan,
        consultation_date: form.consultation_date,
        follow_up_date: form.follow_up_date || null,
        charges: charges.map((charge) => ({ catalog_product_id: charge.catalog_product_id, quantity: charge.quantity })),
        prescription: medicineItems,
      };
      const response = await api.post("/clinical", payload);
      const result = response.data || {};
      const savedPet = {
        name: selectedPet.name,
        pet_code: selectedPet.pet_code,
        owner_name: selectedPet.owner_name,
      };
      const savedDate = form.consultation_date;
      const savedDiagnosis = form.diagnosis;
      const savedLines = cartLines.map((line) => ({
        name: line.name,
        detail: line.unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      }));
      const savedMedicines = medicineItems.map((item) => ({
        name: medicines.find((medicine) => Number(medicine.id) === Number(item.medicine_id))?.medicine_name || "Medicine",
        quantity: item.quantity || "",
        dosage: item.dosage || "",
        frequency: item.frequency || "",
        duration: item.duration || "",
        instructions: item.instructions || "",
      }));

      setForm({ complaint: "", diagnosis: "", treatment_plan: "", consultation_date: todayValue(), follow_up_date: "" });
      setCharges([]);
      setPrescription([emptyPrescriptionItem()]);
      setActiveRegimen(null);
      setSelectedPet(null);
      setSearchParams({});
      setStep(1);

      setSavedReceipt({
        paymentReference: result.paymentReference || null,
        paymentStatus: result.paymentStatus || "Unpaid",
        consultationId: result.consultationId || null,
        prescriptionId: result.prescriptionId || null,
        consultationDate: savedDate,
        diagnosis: savedDiagnosis,
        totalAmount: Number(result.totalAmount) || 0,
        medicines: savedMedicines,
        charges: Array.isArray(result.charges) && result.charges.length
          ? result.charges.map((charge) => ({
              name: charge.description,
              quantity: Number(charge.quantity) || 0,
              unitPrice: Number(charge.unit_price) || 0,
              lineTotal: Number(charge.line_total) || 0,
            }))
          : savedLines,
        pet: savedPet,
      });

      await loadPets();
    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        setFieldErrors(serverErrors);
      }
      toast.error(error.response?.data?.message || "Could not save consultation record.");
    } finally {
      setSaving(false);
    }
  }

  if (showLoading) return <GlobalLoadingOverlay visible message="Loading consultation workspace..." />;

  const prescriptionItems = prescription.filter((item) => String(item.medicine_id || "").trim() !== "");

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Consultation Workspace</h1>
          <p className="page-intro">Scan pet QR or search by name to begin consultation.</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}><button type="button" className="btn-primary" onClick={openMobileScanModal} aria-label="Scan Pet QR"><QrCode size={16} /> Scan Pet QR</button><PrintReportButton category="clinical" /></div>
      </div>

      <div className="consultation-stepper" role="navigation" aria-label="Consultation progress">
        {STEPS.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div className={`consultation-stepper-step ${step === i + 1 ? "consultation-stepper-step--active" : ""} ${step > i + 1 ? "consultation-stepper-step--done" : ""}`}>
              <span className="consultation-stepper-circle">{step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}</span>
              <span className="consultation-stepper-label">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`consultation-stepper-connector ${step > i + 1 ? "consultation-stepper-connector--done" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="panel-card table-panel-card patient-select-card">
          <div className="table-header-row">
            <div>
              <h2>Select a patient</h2>
              <p>Scan the pet QR code or search by owner/pet name to begin a consultation.</p>
            </div>
            <div className="table-meta">
              {petLoading
                ? 'Loading...'
                : `${pickerFilteredPets.length} patient${pickerFilteredPets.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          {petLoading ? (
            <div className="empty-state-cell">
              <LoadingSpinner text="Loading patients..." fullPage={false} />
            </div>
          ) : (
            <>
              <div className="toolbar-row">
                <div className="search-wrap">
                  <Search size={16} className="search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchPetName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearchPetName(value);
                      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                      searchDebounceRef.current = setTimeout(() => handleSearchPet(value), 400);
                    }}
                    placeholder="Search by pet, owner, or pet code..."
                    aria-label="Search pet owner or pet"
                  />
                </div>

                <div className="toolbar-select">
                  <select
                    value={pickerStatus}
                    onChange={(event) => setPickerStatus(event.target.value)}
                    aria-label="Filter patients by status"
                  >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                  </select>
                </div>
              </div>

              <p className="filter-hint" style={{ marginTop: "0.5rem" }}>
                <strong>Only verified pets can be consulted.</strong> Pets whose registration is
                still pending must first be verified in Staff &rarr; Verify Registration.
              </p>

              {isPickerSearching && (
                <p className="filter-hint">
                  {searching ? (
                    'Searching...'
                  ) : (
                    <>
                      Search results for <strong>{pickerTerm}</strong> — select a pet to begin.
                    </>
                  )}
                </p>
              )}

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Owner</th>
                      <th>Sex / Age</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePickerPets.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-state-cell">
                          {isPickerSearching
                            ? 'No pets match your search.'
                            : 'No pets available.'}
                        </td>
                      </tr>
                    ) : (
                      visiblePickerPets.map((pet) => {
                        const age = formatAge(pet.birthdate);

                        return (
                          <tr key={pet.id}>
                            <td data-label="Pet" className="pr-pet-cell">
                              <div className="pr-pet">
                                {hasValue(pet.photo) ? (
                                  <img
                                    className="pr-pet-thumb"
                                    src={resolveMediaUrl(pet.photo)}
                                    alt=""
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="pr-pet-thumb pr-pet-thumb--empty" aria-hidden="true">
                                    <PawPrint size={15} />
                                  </span>
                                )}
                                <div className="pr-pet-main">
                                  <strong>{pet.name}</strong>
                                  <span
                                    className="pr-pet-sub"
                                    title={`${pet.pet_code}${pet.breed_name || pet.species_name ? ` · ${pet.breed_name || pet.species_name}` : ''}`}
                                  >
                                    {pet.pet_code}
                                    {pet.breed_name || pet.species_name
                                      ? ` · ${pet.breed_name || pet.species_name}`
                                      : ''}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td data-label="Owner">
                              <div className="pr-owner">
                                <span>{pet.owner_name || '—'}</span>
                                <span className="pr-owner-meta">
                                  {pet.barangay || 'No barangay'}
                                </span>
                              </div>
                            </td>

                            <td data-label="Sex / Age">
                              <div className="pr-demographic">
                                <span>{pet.sex || '—'}</span>
                                {age && <span className="pr-demographic-age">{age}</span>}
                              </div>
                            </td>

                            <td data-label="Status">
                              <div className="pr-status">
                                <StatusBadge status={pet.status} />
                              </div>
                            </td>

<td data-label="Actions">
                               <div className="table-actions table-action-group">
                                 <button
                                   type="button"
                                   className="btn-primary btn-sm"
                                   onClick={() => selectFromSearch(pet)}
                                 >
                                   <Stethoscope size={14} /> Select
                                 </button>
                                 <button
                                   type="button"
                                   className="btn-secondary btn-sm"
                                   onClick={() => setHealthPet(pet)}
                                 >
                                   View
                                 </button>
                               </div>
                             </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPickerPages > 1 && (
                <div className="pr-pagination">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setPickerPage((current) => Math.max(1, current - 1))}
                    disabled={safePickerPage === 1}
                  >
                    Previous
                  </button>
                  <span className="pr-pagination-info">
                    Page {safePickerPage} of {totalPickerPages} · {pickerFilteredPets.length} patients
                  </span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setPickerPage((current) => Math.min(totalPickerPages, current + 1))}
                    disabled={safePickerPage === totalPickerPages}
                  >
                    Next
                  </button>
                </div>
              )}

              <div className="clinical-form-actions" style={{ marginTop: "1rem", justifyContent: "center" }}>
                <button type="button" className="btn-primary" onClick={openMobileScanModal}>
                  <QrCode size={16} /> Scan Pet QR Code
                </button>
              </div>
            </>
          )}

        </div>
      )}

      {step === 2 && selectedPet && (
        <div className="panel-card clinical-panel-card consultation-workspace-card">
          <div className="panel-header" style={{ gap: "1rem" }}>
            <div>
              <h2>Visit Notes</h2>
              <p>{selectedPet.name} · {selectedPet.pet_code} · {selectedPet.owner_name}</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={openRecordsModal}>
              <History size={14} /> Review Records
            </button>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="clinical-form">
            <section className="clinical-form-section">
              <div className="clinical-form-section-header">
                <h3>Clinical Notes</h3>
                <p>Record the presenting complaint, findings, and treatment plan.</p>
              </div>
              <div className="clinical-form-stack">
                <div className="field-group">
                  <label>Quick Templates</label>
                  <div className="quick-template-row">
                    {regimens.map((regimen) => (
                      <button
                        type="button"
                        className={`quick-template-chip${activeRegimen?.id === regimen.id ? " is-active" : ""}`}
                        key={regimen.id}
                        onClick={() => applyTemplate(regimen)}
                        title={regimen.medicines?.length ? `Fills the notes and prescribes ${regimen.medicines.map((m) => m.medicine_name).join(", ")}` : "Fills the consultation notes"}
                      >
                        {regimen.name}
                      </button>
                    ))}
                  </div>
                  {regimens.length === 0 && (
                    <p className="field-hint">No consultation templates available.</p>
                  )}
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

            <div className="consultation-stepper-actions">
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ChevronLeft size={16} /> Back
              </button>
              <button type="button" className="btn-primary" onClick={handleNext}>
                Next: Medicines <ChevronRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 3 && selectedPet && (
        <div className="panel-card clinical-panel-card consultation-workspace-card">
          <div className="panel-header" style={{ gap: "1rem" }}>
            <div>
              <h2>Medicines &amp; Prescription</h2>
              <p>{selectedPet.name} · {selectedPet.pet_code} — select medicines and review auto-computed dosing</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={openRecordsModal}>
              <History size={14} /> Review Records
            </button>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="clinical-form">
            <MedicinePrescriptionSection
              items={prescription}
              medicines={medicines}
              diagnosis={form.diagnosis}
              activeRegimen={activeRegimen}
              sourceLabel={activeRegimen ? `From template: ${activeRegimen.name}` : null}
              onChange={setPrescription}
              fieldErrors={fieldErrors}
              onClearError={(index, name) =>
                setFieldErrors((prev) => {
                  const key = `prescription.${index}.${name}`;
                  if (!(key in prev)) return prev;
                  const next = { ...prev };
                  delete next[key];
                  return next;
                })
              }
            />

            <section className="clinical-form-section">
              <div className="clinical-form-section-header"><h3>Schedule</h3><p>Set the consultation date and optional follow-up visit.</p></div>
              <div className="clinical-form-grid clinical-form-grid--2">
                <div className="field-group"><label htmlFor="consultation_date">Consultation Date</label><input id="consultation_date" type="date" name="consultation_date" value={form.consultation_date} onChange={handleChange} required max={todayValue()} /><FieldError message={fieldErrors.consultation_date} /></div>
                <div className="field-group"><label htmlFor="follow_up_date">Follow-up Date</label><input id="follow_up_date" type="date" name="follow_up_date" value={form.follow_up_date} onChange={handleChange} min={form.consultation_date || undefined} /><div className="quick-template-row"><button type="button" className="quick-template-chip" onClick={() => setFollowUpInDays(14)} disabled={!form.consultation_date}>+2 weeks</button><button type="button" className="quick-template-chip" onClick={() => setFollowUpInDays(30)} disabled={!form.consultation_date}>+1 month</button></div><FieldError message={fieldErrors.follow_up_date} /></div>
              </div>
            </section>

            <div className="consultation-stepper-actions">
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <ChevronLeft size={16} /> Back
              </button>
              <button type="button" className="btn-primary" onClick={handleNext}>
                Next: Review <ChevronRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 4 && selectedPet && (
        <form onSubmit={handleSubmit} className="clinical-form">
          <div className="panel-card clinical-panel-card consultation-workspace-card">
            <div className="panel-header">
              <div>
                <h2>Review Consultation</h2>
                <p>Verify everything below before saving. You can go back to edit any section.</p>
              </div>
            </div>

            <div className="review-card">
              <div className="review-section">
                <div className="review-section-header">
                  <h4><PawPrint size={14} /> Patient</h4>
                  <button type="button" className="review-edit-btn" onClick={() => goToStep(1)}>Edit</button>
                </div>
                <div className="review-grid">
                  <div className="review-field">
                    <span className="review-field-label">Name</span>
                    <span className="review-field-value">{selectedPet.name || "—"}</span>
                  </div>
                  <div className="review-field">
                    <span className="review-field-label">Pet Code</span>
                    <span className="review-field-value">{selectedPet.pet_code || "—"}</span>
                  </div>
                  <div className="review-field">
                    <span className="review-field-label">Owner</span>
                    <span className="review-field-value">{selectedPet.owner_name || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-header">
                  <h4><ClipboardList size={14} /> Visit Notes</h4>
                  <button type="button" className="review-edit-btn" onClick={() => goToStep(2)}>Edit</button>
                </div>
                <div className="review-grid">
                  <div className="review-field review-field--full">
                    <span className="review-field-label">Presenting Complaint</span>
                    <span className={`review-field-value${form.complaint ? "" : " review-field-value--empty"}`}>{form.complaint || "Not recorded"}</span>
                  </div>
                  <div className="review-field review-field--full">
                    <span className="review-field-label">Diagnosis / Notes</span>
                    <span className={`review-field-value${form.diagnosis ? "" : " review-field-value--empty"}`}>{form.diagnosis || "Not recorded"}</span>
                  </div>
                  <div className="review-field review-field--full">
                    <span className="review-field-label">Treatment Plan</span>
                    <span className={`review-field-value${form.treatment_plan ? "" : " review-field-value--empty"}`}>{form.treatment_plan || "Not recorded"}</span>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-header">
                  <h4><Pill size={14} /> Medicines &amp; Prescription</h4>
                  <button type="button" className="review-edit-btn" onClick={() => goToStep(3)}>Edit</button>
                </div>
                {prescriptionItems.length === 0 ? (
                  <p className="review-empty-note">No medicines prescribed for this consultation.</p>
                ) : (
                  <table className="review-medicine-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                        <th>Qty</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptionItems.map((item, index) => {
                        const med = medicines.find((m) => String(m.id) === String(item.medicine_id));
                        return (
                          <tr key={index}>
                            <td className="review-medicine-name">{med?.medicine_name || "Medicine"}</td>
                            <td>{item.dosage || "—"}</td>
                            <td>{item.frequency || "—"}</td>
                            <td>{item.duration || "—"}</td>
                            <td>{item.quantity || "—"}</td>
                            <td>{item.instructions || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="review-section">
                <div className="review-section-header">
                  <h4><Stethoscope size={14} /> Consultation Charges</h4>
                </div>
                {cartLines.length === 0 ? (
                  <p className="review-empty-note">No charges added. At least one consultation charge is required to save.</p>
                ) : (
                  <>
                    <div className="review-charge-list">
                      {cartLines.map((line) => (
                        <div className="review-charge-line" key={line.catalogProductId}>
                          <div className="review-charge-line-name">
                            <span>{line.name}</span>
                            <small>&times;{line.quantity} @ {formatMoney(line.unitPrice)}</small>
                          </div>
                          <span className="review-charge-line-price">{formatMoney(line.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="review-charge-total">
                      <span>Total</span>
                      <strong>{formatMoney(cartTotal)}</strong>
                    </div>
                  </>
                )}
                <FieldError message={fieldErrors.charges} />
              </div>

              <div className="review-section">
                <div className="review-section-header">
                  <h4><Calendar size={14} /> Schedule</h4>
                  <button type="button" className="review-edit-btn" onClick={() => goToStep(2)}>Edit</button>
                </div>
                <div className="review-grid">
                  <div className="review-field">
                    <span className="review-field-label">Consultation Date</span>
                    <span className="review-field-value">{formatDate(form.consultation_date)}</span>
                  </div>
                  <div className="review-field">
                    <span className="review-field-label">Follow-up Date</span>
                    <span className={`review-field-value${form.follow_up_date ? "" : " review-field-value--empty"}`}>{form.follow_up_date ? formatDate(form.follow_up_date) : "None set"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="consultation-stepper-actions">
              <button type="button" className="btn-secondary" onClick={handleBack} disabled={saving}>
                <ChevronLeft size={16} /> Back
              </button>
              <button type="submit" className="btn-primary" disabled={saving || charges.length === 0}>
                {saving ? "Saving consultation..." : "Save Consultation & Create Payment"}
              </button>
            </div>
            {saving && (
              <p className="charge-saving-note" role="status">
                <span className="charge-picker-spinner" aria-hidden="true" />
                Recording the consultation and creating the payment transaction...
              </p>
            )}
          </div>
        </form>
      )}

      <DirectQrScanner
        isOpen={qrModalOpen}
        onClose={() => { setQrModalOpen(false); clearBatch(); }}
        scanMode={scanMode}
        onScanModeChange={setScanMode}
        scannedPets={scannedPets}
        onSelectBatchPet={selectBatchPet}
        onClearBatch={clearBatch}
        onPetScanned={handlePetScanned}
      />

      {savedReceipt && (
        <div className="receipt-modal-overlay" onClick={() => setSavedReceipt(null)}>
          <div
            className="receipt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-modal-title"
            tabIndex={-1}
            ref={successModalRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="receipt-modal-head">
              <span className="receipt-modal-icon" aria-hidden="true"><CheckCircle2 size={22} /></span>
              <div>
                <h3 id="receipt-modal-title">Consultation saved</h3>
                <p>The payment transaction is now in Staff &rarr; Payment Monitoring.</p>
              </div>
              <button type="button" className="barangay-modal-close" onClick={() => setSavedReceipt(null)} aria-label="Close">&times;</button>
            </div>

            <div className="receipt-modal-body">
              <div className="receipt-handoff">
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>
                  Sent to <strong>Staff &rarr; Payment Monitoring</strong> with status{" "}
                  <span className="receipt-status">{savedReceipt.paymentStatus}</span>
                </span>
              </div>

              <div className="receipt-meta">
                <div>
                  <span>Payment Reference</span>
                  <strong className="receipt-ref">{savedReceipt.paymentReference || "—"}</strong>
                </div>
                <div>
                  <span>Patient</span>
                  <strong>{savedReceipt.pet?.name || "—"}{savedReceipt.pet?.pet_code ? ` · ${savedReceipt.pet.pet_code}` : ""}</strong>
                </div>
                <div>
                  <span>Owner</span>
                  <strong>{savedReceipt.pet?.owner_name || "—"}</strong>
                </div>
                <div>
                  <span>Consultation</span>
                  <strong>#{savedReceipt.consultationId ?? "—"} · {formatDate(savedReceipt.consultationDate)}</strong>
                </div>
              </div>

              {savedReceipt.medicines?.length > 0 && (
                <div className="receipt-prescription">
                  <h4>Prescription</h4>
                  <ul>
                    {savedReceipt.medicines.map((medicine, index) => (
                      <li key={`${medicine.name}-${index}`}>
                        <span className="receipt-rx-name">
                          <strong>{medicine.name}</strong>
                          <small>
                            {[medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(" · ") || "As directed"}
                          </small>
                          {medicine.instructions && <em>{medicine.instructions}</em>}
                        </span>
                        {medicine.quantity && <span className="receipt-rx-qty">Qty {medicine.quantity}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="receipt-charges">
                <h4>Charged to this consultation</h4>
                <ul>
                  {savedReceipt.charges.map((charge, index) => (
                    <li key={`${charge.name}-${index}`}>
                      <span className="receipt-charge-name">
                        {charge.name}
                        <small>&times;{charge.quantity} @ {formatMoney(charge.unitPrice)}</small>
                      </span>
                      <strong>{formatMoney(charge.lineTotal)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="receipt-total">
                  <span>Total to collect</span>
                  <strong>{formatMoney(savedReceipt.totalAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="receipt-modal-foot">
              <p>Payment Monitoring will show this as <strong>{savedReceipt.paymentStatus}</strong> until staff mark it collected.</p>
              <div className="receipt-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSavedReceipt(null)}>Close</button>
                {savedReceipt.medicines?.length > 0 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      printPrescriptionSlip({
                        pet: savedReceipt.pet,
                        consultationDate: savedReceipt.consultationDate,
                        diagnosis: savedReceipt.diagnosis,
                        medicines: savedReceipt.medicines,
                        prescriptionId: savedReceipt.prescriptionId,
                      })
                    }
                  >
                    <Printer size={16} aria-hidden="true" /> Print prescription
                  </button>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { setSavedReceipt(null); setFieldErrors({}); }}
                >
                  Start another consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {recordsModalOpen && (
        <div className="receipt-modal-overlay" onClick={() => setRecordsModalOpen(false)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px", maxHeight: "85vh" }}>
            <div className="receipt-modal-head">
              <h3>Pet Records</h3>
            </div>

            {loadingRecords ? (
              <div className="empty-state-cell">
                <LoadingSpinner text="Loading records..." fullPage={false} />
              </div>
            ) : (
              <div className="receipt-modal-body" style={{ maxHeight: "calc(85vh - 140px)", overflowY: "auto" }}>
                <div className="receipt-meta" style={{ marginBottom: "1.5rem" }}>
                  <div>
                    <span>Patient</span>
                    <strong>{selectedPet?.name} · {selectedPet?.pet_code}</strong>
                  </div>
                  <div>
                    <span>Owner</span>
                    <strong>{selectedPet?.owner_name}</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  {petRecords?.clinical?.length > 0 && (
                    <div className="receipt-prescription" style={{ marginBottom: 0 }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <FileText size={16} />
                        Recent Consultations
                      </h4>
                      <div style={{
                        maxHeight: "400px",
                        overflowY: "auto",
                        padding: "0.5rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb"
                      }}>
                        {petRecords.clinical
                          .sort((a, b) => new Date(b.consultation_date) - new Date(a.consultation_date))
                          .slice(0, 5)
                          .map((record) => (
                          <div key={record.id} style={{
                            padding: "1rem",
                            backgroundColor: "#ffffff",
                            borderRadius: "6px",
                            marginBottom: "0.75rem",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                          }}>
                            <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "#111827" }}>
                              {formatDate(record.consultation_date)}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#4b5563", marginBottom: "0.5rem", lineHeight: "1.5" }}>
                              <strong style={{ color: "#111827" }}>Diagnosis:</strong> {record.diagnosis || "Not recorded"}
                            </div>
                            {record.treatment_plan && (
                              <div style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: "1.5" }}>
                                <strong style={{ color: "#111827" }}>Treatment:</strong> {record.treatment_plan}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {petRecords?.vaccinations?.length > 0 && (
                    <div className="receipt-prescription" style={{ marginBottom: 0 }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <Pill size={16} />
                        Vaccination History
                      </h4>
                      <div style={{
                        maxHeight: "400px",
                        overflowY: "auto",
                        padding: "0.5rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb"
                      }}>
                        {petRecords.vaccinations
                          .sort((a, b) => new Date(b.vaccination_date) - new Date(a.vaccination_date))
                          .slice(0, 5)
                          .map((vaccine) => (
                          <div key={vaccine.id} style={{
                            padding: "1rem",
                            backgroundColor: "#ffffff",
                            borderRadius: "6px",
                            marginBottom: "0.75rem",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                          }}>
                            <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "#111827" }}>
                              {vaccine.vaccine_name}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                              <strong style={{ color: "#111827" }}>Date:</strong> {formatDate(vaccine.vaccination_date)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {(!petRecords?.clinical?.length && !petRecords?.vaccinations?.length) && (
                  <div className="empty-state-cell" style={{ padding: "3rem", textAlign: "center" }}>
                    <ClipboardList size={48} style={{ color: "#9ca3af", marginBottom: "1rem" }} />
                    <p style={{ color: "#6b7280", fontSize: "1rem" }}>No records found for this pet.</p>
                  </div>
                )}
              </div>
            )}

            <div className="receipt-modal-foot">
              <div className="receipt-modal-actions">
                <button type="button" className="btn-primary" onClick={() => setRecordsModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    {healthPet && <PetHealthNotesModal pet={healthPet} onClose={() => setHealthPet(null)} />}
    </div>
  );
}
