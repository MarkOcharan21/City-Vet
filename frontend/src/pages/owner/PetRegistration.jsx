import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PawPrint, CheckCircle, ClipboardPlus, Loader,
  Palette, Calendar, Tag, Camera, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import FieldError from '../../components/ui/FieldError';
import { showPersistentToast } from '../../components/PersistentToast';
import { validatePetRegistration } from '../../utils/validation';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import useOfflineDetection from '../../hooks/useOfflineDetection';
import {
  getOfflineDraft,
  clearOfflineDraft,
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

  if (years <= 0 && months <= 0) {
    return 'Currently a newborn';
  }
  if (years <= 0) {
    return `Current age: ${months} month${months === 1 ? '' : 's'} old`;
  }
  const yearPart = `${years} year${years === 1 ? '' : 's'}`;
  if (months > 0) {
    return `Current age: ${yearPart} and ${months} month${months === 1 ? '' : 's'} old`;
  }
  return `Current age: ${yearPart} old`;
}

export default function PetRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const editingPetId = searchParams.get('petId');
  const [species, setSpecies]       = useState([]);
  const [breeds, setBreeds]         = useState([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted]   = useState(null);
  const [photo, setPhoto]           = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);

  const {
    isOnline,
    saveNow,
    simulatedOffline,
  } = useOfflineDetection({
    isEditingDraft: !!draftId || !!editingPetId,
    form,
    photo,
  });

  useEffect(() => {
    setLoading(true);

    const requests = [api.get('/pets/species-breeds')];

    if (draftId) {
      requests.push(api.get(`/drafts/${draftId}`));
    } else if (editingPetId) {
      requests.push(api.get(`/pets/${editingPetId}`));
    }

    Promise.all(requests)
      .then(([speciesRes, extraRes]) => {
        const sp = speciesRes.data.species || [];
        const br = speciesRes.data.breeds || [];
        setSpecies(sp);
        setBreeds(br);
        saveLookups(sp, br).catch(() => {});

        if (editingPetId && extraRes?.data?.pet) {
          const pet = extraRes.data.pet;
          setForm({
            ...EMPTY_FORM,
            name: pet.name || '',
            species_id: pet.species_id ? String(pet.species_id) : '',
            breed_id: pet.breed_id ? String(pet.breed_id) : (pet.breed_custom ? 'other' : ''),
            breed_other: pet.breed_custom || '',
            sex: pet.sex || 'Male',
            color: pet.color || '',
            birthdate: pet.birthdate
              ? String(pet.birthdate).slice(0, 10)
              : '',
          });
          if (pet.photo) {
            setPhotoPreview(resolveMediaUrl(pet.photo));
          }
        } else if (extraRes?.data?.draft) {
          const info = typeof extraRes.data.draft.temp_reg_info === 'string'
            ? JSON.parse(extraRes.data.draft.temp_reg_info)
            : extraRes.data.draft.temp_reg_info;

          setForm({
            ...EMPTY_FORM,
            ...info,
            species_id: info?.species_id ? String(info.species_id) : '',
            breed_id: info?.breed_id ? String(info.breed_id) : '',
          });
        }
      })
      .catch(() =>
        getLookups()
          .then((cached) => {
            if (cached) {
              setSpecies(cached.species || []);
              setBreeds(cached.breeds || []);
              setError('');
            } else {
              setError('Unable to load registration data. Please refresh the page.');
            }
          })
          .catch(() => setError('Unable to load registration data. Please refresh the page.'))
      )
      .finally(() => setLoading(false));
  }, [draftId, editingPetId]);

  // Restore a locally-saved offline draft (only for brand-new registrations,
  // never for a server-side draft being edited via ?draftId=).
  useEffect(() => {
    if (draftId || editingPetId) return;
    let cancelled = false;
    getOfflineDraft()
      .then((saved) => {
        if (cancelled || !saved || !saved.form) return;
        setForm((prev) => {
          const restored = { ...EMPTY_FORM, ...saved.form };
          return {
            ...restored,
            species_id: restored.species_id ? String(restored.species_id) : prev.species_id,
            breed_id: restored.breed_id ? String(restored.breed_id) : prev.breed_id,
          };
        });
        if (saved.photo && saved.photo instanceof File) {
          setPhoto(saved.photo);
          setPhotoPreview(URL.createObjectURL(saved.photo));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, editingPetId]);

  const filteredBreeds = breeds.filter(
    (b) => String(b.species_id) === String(form.species_id)
  );

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'species_id') {
      setForm({ ...form, species_id: value, breed_id: '', breed_other: '' });
    } else if (name === 'breed_id') {
      setForm({ ...form, breed_id: value, breed_other: value === 'other' ? '' : form.breed_other });
    } else if (name === 'birthdate') {
      setForm({ ...form, birthdate: value });
    } else {
      setForm({ ...form, [name]: value });
    }

    if (name === 'name' || name === 'color') {
      const numWarning = /[0-9]/.test(value) ? 'No numbers should be included.' : '';
      setFieldErrors((prev) => ({ ...prev, [name]: numWarning }));
    } else {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }

  function handleRemovePhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = validatePetRegistration(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }

    // Offline or failing connection: never fail silently. Save the submission
    // as a local draft and route the owner to Draft Registration to continue.
    // Re-read navigator.onLine live so a freshly-fallen connection is caught
    // even if the React connectivity state has not updated yet.
    const liveOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!isOnline || liveOffline) {
      if (draftId || editingPetId) {
        setError('Connection lost. Your changes are still on this form — submit again when you are back online.');
        return;
      }
      try {
        await saveNow(form, photo);
        showPersistentToast('You are offline. Registration saved as a draft — continue it from Draft Registration.', { tone: 'offline' });
      } catch {
        toast.error('Could not save your draft offline.');
      }
      navigate('/owner/drafts');
      return;
    }

    setSubmitting(true);
    try {
      let res;

      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });
      if (photo) {
        formData.append('photo', photo);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (draftId) {
        res = await api.post(`/drafts/${draftId}/submit`, formData, config);
      } else if (editingPetId) {
        res = await api.put(`/pets/${editingPetId}`, formData, config);
      } else {
        res = await api.post('/pets', formData, config);
      }

      setSubmitted({ petName: form.name, petCode: res.data.petCode, isEdit: !!editingPetId });
      setForm(EMPTY_FORM);
      setPhoto(null);
      setPhotoPreview(null);
      clearOfflineDraft().catch(() => {});
    } catch (err) {
      // Network-layer failure while the browser still thinks we are online
      // (server/DB down, timeout) — keep the offline-draft safety net.
      if (!err.response) {
        if (draftId || editingPetId) {
          setError('Connection lost. Your changes are still on this form — submit again when you are back online.');
          return;
        }
        try {
          await saveNow(form, photo);
          showPersistentToast('Connection lost. Your registration was saved as a draft — continue it from Draft Registration.', { tone: 'offline' });
        } catch {
          setError('Registration failed. Please try again.');
        }
        navigate('/owner/drafts');
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    setError('');
    try {
      const payload = { temp_reg_info: form, device_id: navigator.userAgent, payload: form };

      if (draftId) {
        await api.put(`/drafts/${draftId}`, payload);
      } else {
        await api.post('/drafts', payload);
      }

      toast.success('Saved as draft! You can finish it later from Draft Registration.');
      clearOfflineDraft().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save draft.');
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    const isEdit = submitted.isEdit;
    return (
      <div className="page">
        <div style={{
          maxWidth: 520,
          margin: '3rem auto',
          background: '#fff',
          borderRadius: 16,
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(36,20,22,0.10)',
          borderTop: '4px solid var(--color-success)',
        }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'var(--color-success-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <CheckCircle size={38} color="var(--color-success)" strokeWidth={2} />
          </div>

          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--color-success)', fontSize: '1.55rem' }}>
            {isEdit ? 'Pet Info Updated!' : 'Registration Submitted!'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>
            <strong style={{ color: 'var(--color-ink)' }}>{submitted.petName}</strong>
            {isEdit ? " has been updated successfully." : ' has been submitted for registration.'}
          </p>
          {submitted.petCode && (
            <p style={{
              display: 'inline-block',
              background: 'var(--color-primary-tint)',
              color: 'var(--color-primary-dark)',
              borderRadius: 8,
              padding: '0.35rem 0.85rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              margin: '0.25rem 0 1.25rem',
              letterSpacing: '0.04em',
            }}>
              Pet Code: {submitted.petCode}
            </p>
          )}
          {!isEdit && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginBottom: '2rem' }}>
              Clinic staff will verify the registration and generate your QR code shortly.
              You'll receive a notification once it's ready.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!isEdit && (
              <button
                className="btn-primary"
                style={{ margin: 0, minWidth: 160 }}
                onClick={() => setSubmitted(null)}
              >
                Register Another Pet
              </button>
            )}
            <button
              className="btn-secondary"
              style={{ minWidth: 140 }}
              onClick={() => navigate('/owner/my-pets')}
            >
              {isEdit ? 'Back to My Pets' : 'View My Pets'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <PawPrint size={28} color="var(--color-primary)" />
          Pet Registration
        </h1>
        <p className="page-intro" style={{ margin: 0 }}>
          {editingPetId
            ? 'Update your pet\'s information below. Changes are saved immediately.'
            : draftId
              ? 'Continue editing your saved draft, then submit when ready.'
              : 'Fill in your pet\'s details below. Clinic staff will review and verify the registration.'}
        </p>
      </div>

      {/* Offline status banner */}
      {!isOnline && (
        <div className="offline-banner" style={{
          marginBottom: '1.25rem',
          background: '#FFF7E6',
          border: '1px solid #E6A23C',
          borderRadius: 8,
          padding: '0.75rem 1rem',
          color: '#8a5a00',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span aria-hidden="true">📡</span>
          <span>
            {simulatedOffline
              ? 'You are offline.'
              : 'You are offline.'}
            {' '}Your entries are saved as a draft and will appear
            in Draft Registration — continue and submit once you are back online.
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <Loader size={28} className="spinner" />
          <p style={{ marginTop: '0.75rem' }}>Loading form data...</p>
        </div>
      )}

      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '1.5rem',
          alignItems: 'start',
        }}>
          {/* ── Main form card ── */}
          <form onSubmit={handleSubmit} className="form-card" style={{ margin: 0 }}>

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
                      id="pet-photo-input"
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="pet-photo-input"
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

            {/* Actions */}
            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              {!editingPetId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                >
                  Save as Draft
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}
              >
                {submitting ? (
                  <>
                    <Loader size={16} className="spinner button-spinner" />
                    {editingPetId ? 'Updating...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    {editingPetId ? 'Update Pet Info' : 'Submit Registration'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Side panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tips card */}
            <div className="help-panel" style={{ marginBottom: 0 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardPlus size={18} color="var(--color-primary)" />
                How it works
              </h2>
              <ol>
                <li>Fill in your pet&apos;s details and click <strong>Submit Registration</strong>.</li>
                <li>Clinic staff will review and verify the submission.</li>
                <li>A QR code will be generated for your pet once verified.</li>
                <li>You&apos;ll receive a notification when it&apos;s ready.</li>
              </ol>
            </div>

            {/* Pet type visual hint */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 4px 16px rgba(36,20,22,0.06)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-ink)' }}>
                Available species
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{
                  flex: 1, borderRadius: 10, padding: '0.85rem',
                  background: form.species_id === String(species.find(s => s.species_name === 'Dog')?.id)
                    ? 'var(--color-primary-tint)' : 'var(--color-bg)',
                  border: '1.5px solid',
                  borderColor: form.species_id === String(species.find(s => s.species_name === 'Dog')?.id)
                    ? 'var(--color-primary)' : 'var(--color-border)',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '1.75rem' }}>🐕</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: '0.3rem', color: 'var(--color-ink)' }}>Dog</div>
                </div>
                <div style={{
                  flex: 1, borderRadius: 10, padding: '0.85rem',
                  background: form.species_id === String(species.find(s => s.species_name === 'Cat')?.id)
                    ? 'var(--color-primary-tint)' : 'var(--color-bg)',
                  border: '1.5px solid',
                  borderColor: form.species_id === String(species.find(s => s.species_name === 'Cat')?.id)
                    ? 'var(--color-primary)' : 'var(--color-border)',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '1.75rem' }}>🐈</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: '0.3rem', color: 'var(--color-ink)' }}>Cat</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
