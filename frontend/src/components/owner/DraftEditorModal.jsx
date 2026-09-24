import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Camera,
  ClipboardPlus,
  Loader,
  Palette,
  PawPrint,
  Save,
  Send,
  Tag,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import FieldError from '../ui/FieldError';
import { showPersistentToast } from '../PersistentToast';
import { validatePetRegistration } from '../../utils/validation';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import {
  saveOfflineDraft,
  clearOfflineDraft,
  getOfflineDraft,
  getLookups,
  saveLookups,
} from '../../utils/offlineDraft';

const EMPTY_FORM = {
  name: '',
  species_id: '',
  breed_id: '',
  breed_other: '',
  sex: 'Male',
  color: '',
  birthdate: '',
};

function parseDraftInfo(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function formatCurrentAge(birthdate) {
  if (!birthdate) return null;
  const birth = new Date(birthdate + 'T00:00:00');
  if (isNaN(birth.getTime()) || birth > new Date()) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const days = now.getDate() - birth.getDate();
  if (days < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) return 'Currently a newborn';
  if (years <= 0) return `Current age: ${months} month${months === 1 ? '' : 's'} old`;
  const yearPart = `${years} year${years === 1 ? '' : 's'}`;
  if (months > 0) {
    return `Current age: ${yearPart} and ${months} month${months === 1 ? '' : 's'} old`;
  }
  return `Current age: ${yearPart} old`;
}

export default function DraftEditorModal({
  open,
  draft,
  online,
  onClose,
  onSaved,
  onSubmitted,
}) {
  const [species, setSpecies]       = useState([]);
  const [breeds, setBreeds]         = useState([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError]           = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [photo, setPhoto]           = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);

  const isOfflineSource = draft?.source === 'offline';
  const draftId = isOfflineSource ? null : draft?.id;
  const storedName = parseDraftInfo(draft?.temp_reg_info)?.name?.trim() || 'Untitled Pet';

  useEffect(() => {
    if (!open || !draft) return;
    let cancelled = false;
    let objectUrl = null;

    setLoading(true);
    setError('');
    setFieldErrors({});
    setForm({ ...EMPTY_FORM });
    setPhoto(null);
    setPhotoPreview(null);

    function applyForm(info) {
      if (cancelled) return;
      setForm((prev) => {
        const restored = { ...EMPTY_FORM, ...info };
        return {
          ...restored,
          species_id: restored.species_id ? String(restored.species_id) : prev.species_id,
          breed_id: restored.breed_id ? String(restored.breed_id) : prev.breed_id,
        };
      });
    }

    async function loadLookups() {
      try {
        const res = await api.get('/pets/species-breeds');
        if (cancelled) return;
        const sp = res.data.species || [];
        const br = res.data.breeds || [];
        setSpecies(sp);
        setBreeds(br);
        saveLookups(sp, br).catch(() => {});
      } catch {
        const cached = await getLookups().catch(() => null);
        if (cancelled) return;
        if (cached) {
          setSpecies(cached.species || []);
          setBreeds(cached.breeds || []);
        }
      }
    }

    async function loadDraftPayload() {
      if (draftId) {
        try {
          const res = await api.get(`/drafts/${draftId}`);
          if (cancelled) return;
          const info = parseDraftInfo(res.data.draft?.temp_reg_info);
          applyForm(info);
          if (info?.photo) {
            setPhotoPreview(resolveMediaUrl(info.photo));
          }
        } catch {
          applyForm(parseDraftInfo(draft.temp_reg_info));
        }
        return;
      }

      const saved = await getOfflineDraft().catch(() => null);
      if (cancelled || !saved?.form) return;
      applyForm(saved.form);
      if (saved.photo && saved.photo instanceof File) {
        setPhoto(saved.photo);
        objectUrl = URL.createObjectURL(saved.photo);
        setPhotoPreview(objectUrl);
      }
    }

    Promise.all([loadLookups(), loadDraftPayload()]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, draft, draftId]);

  if (!open || !draft) return null;

  const filteredBreeds = breeds.filter(
    (b) => String(b.species_id) === String(form.species_id)
  );

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'species_id') {
      setForm({ ...form, species_id: value, breed_id: '', breed_other: '' });
    } else if (name === 'breed_id') {
      setForm({ ...form, breed_id: value, breed_other: value === 'other' ? '' : form.breed_other });
    } else {
      setForm({ ...form, [name]: value });
    }
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setError('');
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be 5 MB or smaller.');
      return;
    }

    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }

  function handleRemovePhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function buildFormData() {
    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) {
        formData.append(key, val);
      }
    });
    if (photo) formData.append('photo', photo);
    return formData;
  }

  async function persistLocally() {
    if (draftId) {
      await api.put(`/drafts/${draftId}`, {
        temp_reg_info: form,
        device_id: navigator.userAgent,
        payload: form,
      });
    } else {
      await saveOfflineDraft({ form, photo });
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = validatePetRegistration(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }

    const liveOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!online || liveOffline) {
      try {
        await persistLocally();
        showPersistentToast('You are offline. Draft updated — submit again when you are back online.', { tone: 'offline' });
        onSaved();
      } catch {
        toast.error('Could not save your draft offline.');
      }
      return;
    }

    setSubmitting(true);
    try {
      let res;
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (draftId) {
        res = await api.post(`/drafts/${draftId}/submit`, buildFormData(), config);
      } else {
        res = await api.post('/pets', buildFormData(), config);
        clearOfflineDraft().catch(() => {});
      }
      toast.success(`Submitted! Pet code: ${res.data.petCode}`);
      onSubmitted();
    } catch (err) {
      if (!err.response) {
        try {
          await persistLocally();
          showPersistentToast('Connection lost. Your draft was saved — submit again when you are back online.', { tone: 'offline' });
          onSaved();
        } catch {
          setError('Submission failed. Please try again.');
        }
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft(e) {
    e.preventDefault();
    setError('');
    setSavingDraft(true);
    try {
      await persistLocally();
      toast.success('Draft saved.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save draft.');
    } finally {
      setSavingDraft(false);
    }
  }

  const savedLabel = isOfflineSource ? 'Offline Draft' : `Draft #${draftId}`;

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div
        className="barangay-pets-modal draft-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${savedLabel}`}
      >
        <div className="barangay-pets-modal-header">
          <div className="barangay-pets-modal-title">
            <div className="barangay-pets-modal-icon">
              <PawPrint size={26} />
            </div>
            <div>
              <h3>Edit Draft</h3>
              <p>
                <strong>{storedName}</strong> · {savedLabel} · saved{' '}
                {draft.updatedAt || draft.created_at
                  ? new Date(isOfflineSource ? draft.updatedAt : draft.created_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="barangay-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="draft-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <Loader size={28} className="spinner" />
              <p style={{ marginTop: '0.75rem' }}>Loading draft...</p>
            </div>
          ) : (
            <>
              {!isOfflineSource && draft.sync_state === 'Synced' && (
                <div className="offline-banner" style={{
                  marginBottom: '1rem',
                  background: 'var(--color-success-tint)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 8,
                  padding: '0.75rem 1rem',
                  color: 'var(--color-success)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}>
                  This draft was already submitted.
                </div>
              )}

              <form id="draft-registration-form" onSubmit={handleFormSubmit} className="form-card draft-modal-form">
                {/* Pet Photo Upload */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Camera size={14} color="var(--color-primary)" /> Pet Photo
                  </label>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {photoPreview ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={photoPreview}
                          alt="Pet preview"
                          style={{
                            width: 120,
                            height: 120,
                            borderRadius: 12,
                            objectFit: 'cover',
                            border: '2px solid var(--color-border)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoChange}
                          id="draft-photo-input"
                          style={{ display: 'none' }}
                        />
                        <label
                          htmlFor="draft-photo-input"
                          style={{
                            width: 120,
                            height: 120,
                            borderRadius: 12,
                            border: '2px dashed var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: 'var(--color-bg)',
                            transition: 'border-color 0.2s, background 0.2s',
                            gap: '0.3rem',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-tint)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg)'; }}
                        >
                          <Camera size={24} color="var(--color-text-muted)" />
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                            Upload Photo
                          </span>
                        </label>
                      </>
                    )}
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', paddingTop: '0.3rem' }}>
                      <p style={{ margin: 0 }}>Optional. JPG, PNG, or WebP (max 5 MB).</p>
                      <p style={{ margin: '0.25rem 0 0' }}>A clear photo helps clinic staff verify your pet.</p>
                    </div>
                  </div>
                </div>

                {/* Row 1: Pet Name + Sex */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Tag size={14} color="var(--color-primary)" /> Pet Name <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Buddy"
                      required
                    />
                    <FieldError message={fieldErrors.name} />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {form.sex === 'Male' ? '\u2642' : '\u2640'} Sex <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <select name="sex" value={form.sex} onChange={handleChange}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Species + Breed */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <PawPrint size={14} color="var(--color-primary)" /> Species <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <select name="species_id" value={form.species_id} onChange={handleChange} required>
                      <option value="">Select Species</option>
                      {species.map((s) => (
                        <option key={s.id} value={s.id}>{s.species_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ClipboardPlus size={14} color="var(--color-primary)" /> Breed
                    </label>
                    <select
                      name="breed_id"
                      value={form.breed_id}
                      onChange={handleChange}
                      disabled={!form.species_id}
                    >
                      <option value="">{form.species_id ? 'Select Breed' : 'Select Species First'}</option>
                      {filteredBreeds.map((b) => (
                        <option key={b.id} value={b.id}>{b.breed_name}</option>
                      ))}
                      <option value="other">Other (specify below)</option>
                    </select>
                  </div>
                </div>

                {/* Other breed input */}
                {form.breed_id === 'other' && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <label>Specify Breed <span style={{ color: 'var(--color-primary)' }}>*</span></label>
                    <input
                      name="breed_other"
                      value={form.breed_other}
                      onChange={handleChange}
                      placeholder="Type your pet's breed"
                      required
                    />
                  </div>
                )}

                {/* Row 3: Color + Birthdate / Age */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Palette size={14} color="var(--color-primary)" /> Color / Markings
                    </label>
                    <input
                      name="color"
                      value={form.color}
                      onChange={handleChange}
                      placeholder="e.g. Brown with white spots"
                    />
                    <FieldError message={fieldErrors.color} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                        <Calendar size={14} color="var(--color-primary)" /> Birthdate
                      </label>
                    </div>
                    <input
                      type="date"
                      name="birthdate"
                      value={form.birthdate}
                      onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {form.birthdate && (
                      <p style={{
                        margin: '0.35rem 0 0',
                        fontSize: '0.82rem',
                        color: 'var(--color-primary-dark)',
                        fontWeight: 600,
                        background: 'var(--color-primary-tint)',
                        padding: '0.35rem 0.7rem',
                        borderRadius: 8,
                        display: 'inline-block',
                      }}>
                        {formatCurrentAge(form.birthdate)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div style={{
                    marginTop: '1rem',
                    background: 'var(--color-primary-tint)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 8,
                    padding: '0.75rem 1rem',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                  }}>
                    {error}
                  </div>
                )}
              </form>
            </>
          )}
        </div>

        <div className="draft-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting || savingDraft}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSaveDraft}
            disabled={loading || submitting || savingDraft}
          >
            {savingDraft ? <Loader size={16} className="spinner button-spinner" /> : <Save size={16} />}
            Save Draft
          </button>
          <button
            type="submit"
            form="draft-registration-form"
            className="btn-primary"
            disabled={loading || submitting || savingDraft || draft.sync_state === 'Synced'}
          >
            {submitting ? <Loader size={16} className="spinner button-spinner" /> : <Send size={16} />}
            {submitting ? 'Submitting...' : 'Submit Registration'}
          </button>
        </div>
      </div>
    </div>
  );
}