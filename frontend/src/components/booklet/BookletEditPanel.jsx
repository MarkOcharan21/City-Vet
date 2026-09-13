import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Camera, Check, Loader, Save, X } from "lucide-react";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { validatePetRegistration, CABUYAO_BARANGAYS } from "../../utils/validation";

const EMPTY_PET_FORM = {
  name: "",
  species_id: "",
  breed_id: "",
  breed_other: "",
  sex: "Male",
  color: "",
  birthdate: "",
};

const EMPTY_OWNER_FORM = {
  full_name: "",
  email: "",
  contact_number: "",
  address: "",
  barangay: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
};

const EMPTY_HEALTH_FORM = {
  allergies: "",
  current_medication: "",
  important_conditions: "",
  special_instructions: "",
};

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="booklet-edit__card">
      <div className="booklet-edit__card-head">
        <div>
          <div className="booklet-edit__card-title">{title}</div>
          {subtitle ? <div className="booklet-edit__card-sub">{subtitle}</div> : null}
        </div>
      </div>
      <div className="booklet-edit__card-body">{children}</div>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className={`booklet-edit__field${label === "Address" ? " booklet-edit__field--wide" : ""}`}>
      <label className="booklet-edit__label">
        {label} {required ? <span className="booklet-edit__req">*</span> : null}
      </label>
      {children}
      {hint ? <div className="booklet-edit__hint">{hint}</div> : null}
    </div>
  );
}

export default function BookletEditPanel({ pet, role, onSaved }) {
  const [species, setSpecies] = useState([]);
  const [breeds, setBreeds] = useState([]);

  const [petForm, setPetForm] = useState(EMPTY_PET_FORM);
  const [petErrors, setPetErrors] = useState({});
  const [petError, setPetError] = useState("");
  const [savingPet, setSavingPet] = useState(false);

  const [ownerForm, setOwnerForm] = useState(EMPTY_OWNER_FORM);
  const [ownerError, setOwnerError] = useState("");
  const [savingOwner, setSavingOwner] = useState(false);

  const [healthForm, setHealthForm] = useState(EMPTY_HEALTH_FORM);
  const [healthError, setHealthError] = useState("");
  const [savingHealth, setSavingHealth] = useState(false);

  const [lostForm, setLostForm] = useState({ last_seen: "", reward: "" });
  const [lostError, setLostError] = useState("");
  const [workingLost, setWorkingLost] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);

  const isOwner = role === "Owner";

  useEffect(() => {
    api
      .get("/pets/species-breeds")
      .then((res) => {
        setSpecies(res.data.species || []);
        setBreeds(res.data.breeds || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pet) return;
    setPetForm({
      ...EMPTY_PET_FORM,
      name: pet.name || "",
      species_id: pet.species_id ? String(pet.species_id) : "",
      breed_id: pet.breed_id ? String(pet.breed_id) : pet.breed_custom ? "other" : "",
      breed_other: pet.breed_custom || "",
      sex: pet.sex || "Male",
      color: pet.color || "",
      birthdate: pet.birthdate ? String(pet.birthdate).slice(0, 10) : "",
    });
    setPhoto(null);
    setPhotoPreview(pet.photo ? resolveMediaUrl(pet.photo) : null);

    setOwnerForm((prev) => ({
      ...prev,
      full_name: pet.full_name || "",
      contact_number: pet.contact_number || "",
      address: pet.address || "",
      barangay: pet.barangay || "",
      emergency_contact_name: pet.emergency_contact_name || "",
      emergency_contact_number: pet.emergency_contact_number || "",
    }));

    setHealthForm({
      allergies: pet.allergies || "",
      current_medication: pet.current_medication || "",
      important_conditions: pet.important_conditions || "",
      special_instructions: pet.special_instructions || "",
    });

    setLostForm({
      last_seen: pet.last_seen || "",
      reward: pet.reward || "",
    });
    setShowLostForm(false);
    setPetError(""); setOwnerError(""); setHealthError(""); setLostError("");
    setPetErrors({});
  }, [pet]);

  useEffect(() => {
    if (!isOwner) {
      setOwnerForm((prev) => ({ ...prev, email: "" }));
      return undefined;
    }
    const ctrl = new AbortController();
    api
      .get("/owner/profile", { signal: ctrl.signal })
      .then((res) => {
        const p = res.data.profile;
        if (p) setOwnerForm((prev) => ({ ...prev, email: p.email || "" }));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [isOwner, pet?.pet_owner_id]);

  if (!pet) return null;

  const filteredBreeds = breeds.filter((b) => String(b.species_id) === String(petForm.species_id));

  function setPet(field, value) {
    setPetForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "species_id") {
        next.breed_id = "";
        next.breed_other = "";
      } else if (field === "breed_id") {
        next.breed_other = value === "other" ? "" : prev.breed_other;
      }
      return next;
    });
    setPetError("");
    setPetErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function setOwner(field, value) {
    setOwnerForm((prev) => ({ ...prev, [field]: value }));
    setOwnerError("");
  }

  function setHealth(field, value) {
    setHealthForm((prev) => ({ ...prev, [field]: value }));
    setHealthError("");
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setPetError("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPetError("Photo must be 5 MB or smaller.");
      return;
    }
    if (photoPreview && pet?.photo) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPetError("");
  }

  async function savePet() {
    setPetError("");
    setPetErrors({});
    const validation = validatePetRegistration(petForm);
    if (!validation.valid) {
      setPetErrors(validation.errors || {});
      setPetError(validation.message);
      return;
    }
    setSavingPet(true);
    try {
      const formData = new FormData();
      Object.entries(petForm).forEach(([key, val]) => {
        if (val !== "" && val !== null && val !== undefined) formData.append(key, val);
      });
      if (photo) formData.append("photo", photo);
      await api.put(`/pets/${pet.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Pet information saved.");
      onSaved?.();
    } catch (err) {
      setPetError(err.response?.data?.message || "Could not save pet information.");
    } finally {
      setSavingPet(false);
    }
  }

  async function saveOwner() {
    setOwnerError("");
    const payload = {
      full_name: ownerForm.full_name,
      contact_number: ownerForm.contact_number,
      address: ownerForm.address,
      barangay: ownerForm.barangay,
      emergency_contact_name: ownerForm.emergency_contact_name,
      emergency_contact_number: ownerForm.emergency_contact_number,
    };
    setSavingOwner(true);
    try {
      if (isOwner) {
        await api.put("/owner/profile", { ...payload, email: ownerForm.email });
      } else {
        await api.put(`/pets/${pet.id}/owner-info`, payload);
      }
      toast.success("Owner information saved.");
      onSaved?.();
    } catch (err) {
      setOwnerError(err.response?.data?.message || "Could not save owner information.");
    } finally {
      setSavingOwner(false);
    }
  }

  async function saveHealth() {
    setHealthError("");
    setSavingHealth(true);
    try {
      await api.put(`/pets/${pet.id}/health`, {
        allergies: healthForm.allergies,
        current_medication: healthForm.current_medication,
        important_conditions: healthForm.important_conditions,
        special_instructions: healthForm.special_instructions,
      });
      toast.success("Health & safety information saved.");
      onSaved?.();
    } catch (err) {
      setHealthError(err.response?.data?.message || "Could not save health information.");
    } finally {
      setSavingHealth(false);
    }
  }

  async function reportLost() {
    setLostError("");
    setWorkingLost(true);
    try {
      await api.put(`/pets/${pet.id}/report-lost`, {
        last_seen: lostForm.last_seen,
        reward: lostForm.reward,
      });
      toast.success("Pet has been reported as lost.");
      onSaved?.();
    } catch (err) {
      setLostError(err.response?.data?.message || "Could not report lost pet.");
    } finally {
      setWorkingLost(false);
    }
  }

  async function markFound() {
    setLostError("");
    setWorkingLost(true);
    try {
      await api.put(`/pets/${pet.id}/found`, {});
      toast.success("Pet has been marked as found.");
      onSaved?.();
    } catch (err) {
      setLostError(err.response?.data?.message || "Could not update pet.");
    } finally {
      setWorkingLost(false);
    }
  }

  return (
    <div className="booklet-edit">
      <div className="booklet-edit__intro">
        <div className="booklet-edit__intro-title">✏️ Edit Pet Booklet</div>
        <div className="booklet-edit__intro-sub">
          Changes are saved to the official records and reflected here automatically.
        </div>
      </div>

      {/* 1 · Pet Profile */}
      <SectionCard title="Pet Profile" subtitle="Basic identification details">
        <div className="booklet-edit__grid">
          <Field label="Pet Name" required>
            <input
              type="text"
              value={petForm.name}
              onChange={(e) => setPet("name", e.target.value)}
              placeholder="e.g. Buddy"
            />
            {petErrors.name ? <div className="booklet-edit__error">{petErrors.name}</div> : null}
          </Field>
          <Field label="Sex" required>
            <select value={petForm.sex} onChange={(e) => setPet("sex", e.target.value)}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
          <Field label="Species" required>
            <select value={petForm.species_id} onChange={(e) => setPet("species_id", e.target.value)}>
              <option value="">Select Species</option>
              {species.map((s) => (
                <option key={s.id} value={s.id}>{s.species_name}</option>
              ))}
            </select>
            {petErrors.species_id ? <div className="booklet-edit__error">{petErrors.species_id}</div> : null}
          </Field>
          <Field label="Breed" required>
            <select value={petForm.breed_id} onChange={(e) => setPet("breed_id", e.target.value)} disabled={!petForm.species_id}>
              <option value="">{petForm.species_id ? "Select Breed" : "Select Species First"}</option>
              {filteredBreeds.map((b) => (
                <option key={b.id} value={b.id}>{b.breed_name}</option>
              ))}
              <option value="other">Other (specify below)</option>
            </select>
            {petErrors.breed_id ? <div className="booklet-edit__error">{petErrors.breed_id}</div> : null}
          </Field>
          {petForm.breed_id === "other" && (
            <Field label="Specify Breed" required>
              <input
                type="text"
                value={petForm.breed_other}
                onChange={(e) => setPet("breed_other", e.target.value)}
                placeholder="Type your pet's breed"
              />
              {petErrors.breed_other ? <div className="booklet-edit__error">{petErrors.breed_other}</div> : null}
            </Field>
          )}
          <Field label="Color / Markings">
            <input
              type="text"
              value={petForm.color}
              onChange={(e) => setPet("color", e.target.value)}
              placeholder="e.g. Brown with white spots"
            />
            {petErrors.color ? <div className="booklet-edit__error">{petErrors.color}</div> : null}
          </Field>
          <Field label="Birthdate">
            <input
              type="date"
              value={petForm.birthdate}
              onChange={(e) => setPet("birthdate", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </Field>
          <Field label="Pet Photo" hint="Optional. JPG, PNG, or WebP (max 5 MB).">
            <div className="booklet-edit__photo-row">
              {photoPreview ? (
                <img src={photoPreview} alt="Pet preview" className="booklet-edit__photo" />
              ) : (
                <div className="booklet-edit__photo booklet-edit__photo--empty">
                  <Camera size={20} />
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                id="booklet-edit-photo"
                style={{ display: "none" }}
              />
              <label htmlFor="booklet-edit-photo" className="booklet-edit__btn booklet-edit__btn--outline">
                <Camera size={14} strokeWidth={2.4} /> {photo ? "Choose Another" : "Upload Photo"}
              </label>
              {photo && (
                <button
                  type="button"
                  className="booklet-edit__btn booklet-edit__btn--ghost"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(pet?.photo ? resolveMediaUrl(pet.photo) : null);
                    if (photoInputRef.current) photoInputRef.current.value = "";
                  }}
                >
                  <X size={14} strokeWidth={2.4} /> Remove
                </button>
              )}
            </div>
          </Field>
        </div>
        <div className="booklet-edit__save-row">
          {savingPet ? (
            <Loader size={16} className="spinner" aria-hidden="true" />
          ) : (
            <button type="button" className="booklet-edit__btn booklet-edit__btn--primary" onClick={savePet} disabled={savingPet}>
              <Save size={15} strokeWidth={2.4} /> Save Pet Profile
            </button>
          )}
          {petError ? <div className="booklet-edit__error">{petError}</div> : null}
        </div>
      </SectionCard>

      {/* 2 · Owner Info & Emergency Contact */}
      <SectionCard title="Owner Information & Emergency Contact" subtitle="Contact details shown in the Owner and Emergency tabs">
        <div className="booklet-edit__grid">
          <Field label="Owner Name" required>
            <input
              type="text"
              value={ownerForm.full_name}
              onChange={(e) => setOwner("full_name", e.target.value)}
              placeholder="Registered owner's full name"
            />
          </Field>
          {isOwner && (
            <Field label="Email">
              <input
                type="email"
                value={ownerForm.email}
                onChange={(e) => setOwner("email", e.target.value)}
                placeholder="you@email.com"
              />
            </Field>
          )}
          <Field label="Contact Number">
            <input
              type="tel"
              value={ownerForm.contact_number}
              onChange={(e) => setOwner("contact_number", e.target.value)}
              placeholder="09XXXXXXXXX"
            />
          </Field>
          <Field label="Barangay">
            <select value={ownerForm.barangay} onChange={(e) => setOwner("barangay", e.target.value)}>
              <option value="">Select Barangay</option>
              {CABUYAO_BARANGAYS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Address">
            <input
              type="text"
              value={ownerForm.address}
              onChange={(e) => setOwner("address", e.target.value)}
              placeholder="House / Street / Subdivision"
            />
          </Field>
          <Field label="Emergency Contact Name">
            <input
              type="text"
              value={ownerForm.emergency_contact_name}
              onChange={(e) => setOwner("emergency_contact_name", e.target.value)}
              placeholder="Who to contact in emergencies"
            />
          </Field>
          <Field label="Emergency Contact Number">
            <input
              type="tel"
              value={ownerForm.emergency_contact_number}
              onChange={(e) => setOwner("emergency_contact_number", e.target.value)}
              placeholder="09XXXXXXXXX"
            />
          </Field>
        </div>
        <div className="booklet-edit__save-row">
          {savingOwner ? (
            <Loader size={16} className="spinner" aria-hidden="true" />
          ) : (
            <button type="button" className="booklet-edit__btn booklet-edit__btn--primary" onClick={saveOwner} disabled={savingOwner}>
              <Save size={15} strokeWidth={2.4} /> Save Owner Info
            </button>
          )}
          {ownerError ? <div className="booklet-edit__error">{ownerError}</div> : null}
        </div>
      </SectionCard>

      {/* 3 · Health & Safety */}
      <SectionCard title="Health & Safety (Emergency Tab)" subtitle="Flags shown to emergency responders in the Emergency tab">
        <div className="booklet-edit__grid">
          <Field label="Allergies" hint="Comma-separated, e.g. Chicken, Penicillin">
            <input
              type="text"
              value={healthForm.allergies}
              onChange={(e) => setHealth("allergies", e.target.value)}
              placeholder="e.g. Chicken, Penicillin"
            />
          </Field>
          <Field label="Current Medication" hint="Comma-separated">
            <input
              type="text"
              value={healthForm.current_medication}
              onChange={(e) => setHealth("current_medication", e.target.value)}
              placeholder="e.g. Ivermectin, Multivitamin"
            />
          </Field>
          <Field label="Important Conditions" hint="Comma-separated">
            <input
              type="text"
              value={healthForm.important_conditions}
              onChange={(e) => setHealth("important_conditions", e.target.value)}
              placeholder="e.g. Heartworm positive, Diabetic"
            />
          </Field>
          <Field label="Special Instructions">
            <textarea
              rows={2}
              value={healthForm.special_instructions}
              onChange={(e) => setHealth("special_instructions", e.target.value)}
              placeholder="Any special care instructions for responders"
            />
          </Field>
        </div>
        <div className="booklet-edit__save-row">
          {savingHealth ? (
            <Loader size={16} className="spinner" aria-hidden="true" />
          ) : (
            <button type="button" className="booklet-edit__btn booklet-edit__btn--primary" onClick={saveHealth} disabled={savingHealth}>
              <Save size={15} strokeWidth={2.4} /> Save Health & Safety
            </button>
          )}
          {healthError ? <div className="booklet-edit__error">{healthError}</div> : null}
        </div>
      </SectionCard>

      {/* 4 · Lost pet status */}
      <SectionCard title="Lost Pet Status" subtitle="Show a Lost Pet Alert on this booklet and public profile">
        {pet.is_lost === 1 ? (
          <div className="booklet-edit__lost-active">
            <span>
              <Check size={15} strokeWidth={2.6} /> This pet is currently reported as {pet.last_seen ? <>lost · last seen {pet.last_seen}</> : "lost"}
              {pet.reward ? <> · reward ₱{pet.reward}</> : null}.
            </span>
            <button
              type="button"
              className="booklet-edit__btn booklet-edit__btn--danger-ghost"
              onClick={markFound}
              disabled={workingLost}
            >
              {workingLost ? <Loader size={15} className="spinner" /> : <Check size={15} strokeWidth={2.4} />} Mark as Found
            </button>
          </div>
        ) : (
          <div>
            {!showLostForm ? (
              <div className="booklet-edit__save-row">
                <button
                  type="button"
                  className="booklet-edit__btn booklet-edit__btn--outline"
                  onClick={() => setShowLostForm(true)}
                >
                  Report Lost
                </button>
              </div>
            ) : (
              <div className="booklet-edit__grid">
                <Field label="Last Seen">
                  <input
                    type="text"
                    value={lostForm.last_seen}
                    onChange={(e) => setLostForm((prev) => ({ ...prev, last_seen: e.target.value }))}
                    placeholder="Where the pet was last seen"
                  />
                </Field>
                <Field label="Reward (₱)">
                  <input
                    type="number"
                    min="0"
                    value={lostForm.reward}
                    onChange={(e) => setLostForm((prev) => ({ ...prev, reward: e.target.value }))}
                    placeholder="e.g. 500"
                  />
                </Field>
              </div>
            )}
            {showLostForm && (
              <div className="booklet-edit__save-row">
                {workingLost ? (
                  <Loader size={16} className="spinner" aria-hidden="true" />
                ) : (
                  <button type="button" className="booklet-edit__btn booklet-edit__btn--primary" onClick={reportLost} disabled={workingLost}>
                    <Check size={15} strokeWidth={2.4} /> Report Lost
                  </button>
                )}
                {lostError ? <div className="booklet-edit__error">{lostError}</div> : null}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}