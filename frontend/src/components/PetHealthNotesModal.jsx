import { useEffect } from 'react';
import { X, Activity } from 'lucide-react';

function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

function DetailBlock({ label, value }) {
  return (
    <div className="pet-modal-field">
      <span className="pet-modal-field__label">{label}</span>
      <p
        className="pet-modal-field__value"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {value || '—'}
      </p>
    </div>
  );
}

export default function PetHealthNotesModal({ pet, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!pet) return null;

  const hasNotes =
    hasValue(pet.allergies) ||
    hasValue(pet.current_medication) ||
    hasValue(pet.important_conditions) ||
    hasValue(pet.special_instructions);

  return (
    <div className="pet-modal-backdrop" onClick={onClose}>
      <div
        className="pet-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${pet.name}'s health notes`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="pet-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.5} />
        </button>

        <header className="pet-modal-header">
          <div className="pet-modal-heading">
            <div className="pet-modal-name-row">
              <h2>Health Notes</h2>
            </div>
            <p className="pet-modal-code">
              {pet.name} {pet.pet_code ? `— ${pet.pet_code}` : ''}
            </p>
          </div>
        </header>

        <div className="pet-modal-body">
          {!hasNotes && (
            <div
              className="pet-modal-field"
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', padding: '1rem' }}
            >
              <Activity size={16} />
              <span className="pet-modal-field__value">No health notes recorded.</span>
            </div>
          )}

          {hasNotes && (
            <>
              <h3 className="pet-modal-section-title">Critical Safety Notes</h3>
              <div className="pet-modal-info-grid">
                <DetailBlock label="Allergies" value={pet.allergies} />
                <DetailBlock label="Current Medication" value={pet.current_medication} />
                <DetailBlock label="Important Conditions" value={pet.important_conditions} />
              </div>

              <h3 className="pet-modal-section-title">Special Instructions</h3>
              <div className="pet-modal-info-grid" style={{ gridTemplateColumns: '1fr' }}>
                <DetailBlock label="Care Notes / Special Instructions" value={pet.special_instructions} />
              </div>
            </>
          )}
        </div>

        <footer className="pet-modal-actions">
          <button type="button" className="btn-secondary pet-modal-action" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
