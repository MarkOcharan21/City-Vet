import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Loader, Save, X } from 'lucide-react';
import api from '../services/api';
import FieldError from './ui/FieldError';
import { validatePetRegistration } from '../utils/validation';
import { resolveMediaUrl } from '../utils/mediaUrl';

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

  if (years <= 0 && months <= 0) return 'Currently a newborn';
  if (years <= 0) return `${months} month${months === 1 ? '' : 's'} old`;

  return years === 1 ? '1 year old' : `${years} years old`;
}

export default function PetEditModal({ pet, onClose, onSaved }) {
  const [species, setSpecies] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    api
      .get('/pets/species-breeds')
      .then((res) => {
        setSpecies(res.data.species || []);
        setBreeds(res.data.breeds || []);
      })
      .catch((err) => {
        console.error('Error loading reference data:', err);
        setError('Unable to load form data. Please try again.');
      });
  }, []);

  useEffect(() => {
    if (!pet) return;
    setForm({
      ...EMPTY_FORM,
      name: pet.name || '',
      species_id: pet.species_id ? String(pet.species_id) : '',
      breed_id: pet.breed_id ? String(pet.breed_id) : (pet.breed_custom ? 'other' : ''),
      breed_other: pet.breed_custom || '',
      sex: pet.sex || 'Male',
      color: pet.color || '',
      birthdate: pet.birthdate ? String(pet.birthdate).slice(0, 10) : '',
    });
    if (pet.photo) {
      setPhotoPreview(resolveMediaUrl(pet.photo));
    } else {
      setPhotoPreview(null);
    }
  }, [pet]);

  useEffect(() => {
    if (!onClose) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
    setFieldErrors((prev) => ({
      ...prev,
      [name]: ['name', 'color'].includes(name) && /[0-9]/.test(value)
        ? 'No numbers should be included.'
        : '',
    }));
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

    if (photoPreview && !pet?.photo) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }

  function handleRemovePhoto() {
    if (photo && photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    setPhotoPreview(pet?.photo ? resolveMediaUrl(pet.photo) : null);
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

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await api.put(`/pets/${pet.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data?.message || 'Pet information updated.');
      onSaved?.(true);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Could not update pet. Please try again.';
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!pet) return null;

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div
        className="pet-edit-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${pet.name}`}
      >
        <div className="pet-edit-modal-header">
          <div>
            <h3>Edit Pet Info</h3>
            <p>
              Update {pet.name}&apos;s details. Changes are saved immediately.
            </p>
          </div>
          <button
            type="button"
            className="pet-edit-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-card pet-edit-form">
          <div className="pet-edit-modal-body">
            {/* Pet Photo */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <Camera size={14} color="var(--color-primary)" /> Pet Photo
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Pet preview"
                      style={{
                        width: 110,
                        height: 110,
                        borderRadius: 12,
                        objectFit: 'cover',
                        border: '2px solid var(--color-border)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 110,
                        height: 110,
                        borderRadius: 12,
                        border: '2px dashed var(--color-border)',
                        background: 'var(--color-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <Camera size={26} />
                    </div>
                  )}
                  {photo && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      title="Remove new photo"
                      aria-label="Remove new photo"
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
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    id="pet-edit-photo-input"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="pet-edit-photo-input"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 1rem',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    <Camera size={15} />
                    {photo ? 'Choose Another' : 'Upload Photo'}
                  </label>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Optional. JPG, PNG, or WebP (max 5 MB).{pet.photo ? ' Keeps the current photo if not changed.' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 1: Pet Name + Sex */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <label>Pet Name <span style={{ color: 'var(--color-primary)' }}>*</span></label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Buddy" required />
                <FieldError message={fieldErrors.name} />
              </div>
              <div>
                <label>Sex <span style={{ color: 'var(--color-primary)' }}>*</span></label>
                <select name="sex" value={form.sex} onChange={handleChange}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Row 2: Species + Breed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
              <div>
                <label>Species <span style={{ color: 'var(--color-primary)' }}>*</span></label>
                <select name="species_id" value={form.species_id} onChange={handleChange} required>
                  <option value="">Select Species</option>
                  {species.map((s) => (
                    <option key={s.id} value={s.id}>{s.species_name}</option>
                  ))}
                </select>
                <FieldError message={fieldErrors.species_id} />
              </div>
              <div>
                <label>Breed</label>
                <select name="breed_id" value={form.breed_id} onChange={handleChange} disabled={!form.species_id}>
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
                <input name="breed_other" value={form.breed_other} onChange={handleChange} placeholder="Type your pet's breed" required />
                <FieldError message={fieldErrors.breed_other} />
              </div>
            )}

            {/* Row 3: Color + Birthdate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
              <div>
                <label>Color / Markings</label>
                <input name="color" value={form.color} onChange={handleChange} placeholder="e.g. Brown with white spots" />
                <FieldError message={fieldErrors.color} />
              </div>
              <div>
                <label>Birthdate</label>
                <input
                  type="date"
                  name="birthdate"
                  value={form.birthdate}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                />
                {form.birthdate && (
                  <p
                    style={{
                      margin: '0.35rem 0 0',
                      fontSize: '0.8rem',
                      color: 'var(--color-primary-dark)',
                      fontWeight: 600,
                      background: 'var(--color-primary-tint)',
                      padding: '0.3rem 0.7rem',
                      borderRadius: 8,
                      display: 'inline-block',
                    }}
                  >
                    {formatCurrentAge(form.birthdate)}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: '1rem',
                  background: 'var(--color-primary-tint)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 8,
                  padding: '0.7rem 1rem',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div className="pet-edit-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              {submitting ? (
                <>
                  <Loader size={16} className="spinner button-spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}