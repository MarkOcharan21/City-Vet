import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PawPrint,
  Pencil,
  QrCode,
  TriangleAlert,
  X,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import PetStatusItem from './PetStatusItem';
import { getPetCardStatuses } from '../utils/petStatus';
import { resolveMediaUrl } from '../utils/mediaUrl';

const PHOTO_FALLBACK = 'https://placehold.co/120x120?text=Paw';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function computeAge(birthdate) {
  if (!birthdate) return '—';
  const birth = new Date(birthdate + 'T00:00:00');
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return '—';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0 && months <= 0) return 'Newborn';
  if (years <= 0) return `${months} month${months === 1 ? '' : 's'} old`;
  if (months > 0) return `${years} yr${years === 1 ? '' : 's'}, ${months} mo`;
  return `${years} year${years === 1 ? '' : 's'} old`;
}

function DetailField({ label, value }) {
  return (
    <div className="pet-modal-field">
      <span className="pet-modal-field__label">{label}</span>
      <span className="pet-modal-field__value">{value}</span>
    </div>
  );
}

export default function PetDetailModal({ pet, onClose, onEdit }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!pet) return null;

  const statusItems = getPetCardStatuses(pet);
  const photoUrl = resolveMediaUrl(pet.photo, PHOTO_FALLBACK);
  const paymentStatus = pet.latest_payment_status || '—';

  return (
    <div className="pet-modal-backdrop" onClick={onClose}>
      <div
        className="pet-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${pet.name} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="pet-modal-close" onClick={onClose} aria-label="Close pet details">
          <X size={18} strokeWidth={2.5} />
        </button>

        {pet.is_lost === 1 && (
          <div className="pet-modal-lost">
            <TriangleAlert size={18} strokeWidth={2.3} />
            <span>
              This pet is reported as lost.
              {pet.last_seen ? ` Last seen: ${pet.last_seen}.` : ''}
            </span>
          </div>
        )}

        <header className="pet-modal-header">
          <img src={photoUrl} alt={`${pet.name} photo`} className="pet-modal-photo" />
          <div className="pet-modal-heading">
            <div className="pet-modal-name-row">
              <h2>{pet.name}</h2>
              <StatusBadge status={pet.status} />
            </div>
            <p className="pet-modal-code">
              {pet.species_name}{pet.breed_name ? ` \u2014 ${pet.breed_name}` : ''}
            </p>
            <p className="pet-modal-code">
              Pet Code: <strong>{pet.pet_code || '—'}</strong>
            </p>
          </div>
        </header>

        <div className="pet-modal-body">
          <h3 className="pet-modal-section-title">Pet Profile</h3>
          <div className="pet-modal-info-grid">
            <DetailField label="Species" value={pet.species_name || '—'} />
            <DetailField label="Breed" value={pet.breed_name || '—'} />
            <DetailField label="Sex" value={pet.sex || '—'} />
            <DetailField label="Color" value={pet.color || '—'} />
            <DetailField label="Birthdate" value={formatDate(pet.birthdate)} />
            <DetailField label="Estimated Age" value={computeAge(pet.birthdate)} />
            <DetailField label="Registration Date" value={formatDate(pet.registration_date)} />
            <DetailField label="Payment Status" value={paymentStatus} />
          </div>

          <h3 className="pet-modal-section-title">Status Overview</h3>
          <div className="pet-modal-statuses">
            {statusItems.map((item) => (
              <PetStatusItem
                key={`${pet.id}-${item.category}`}
                category={item.category}
                status={item.status}
                description={item.description}
              />
            ))}
          </div>
        </div>

        <footer className="pet-modal-actions">
          <button type="button" className="btn-primary pet-modal-action" onClick={() => onEdit?.(pet)}>
            <Pencil size={16} />
            Edit Pet Info
          </button>
          <Link to="/owner/qr-records" className="btn-secondary pet-modal-action">
            <QrCode size={16} />
            QR Record
          </Link>
          <Link to="/owner/clinical-medicine" className="btn-secondary pet-modal-action">
            <PawPrint size={16} />
            Clinical Records
          </Link>
        </footer>
      </div>
    </div>
  );
}