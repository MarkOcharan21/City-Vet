import { WifiOff, X } from 'lucide-react';

// Shown right after a Pet Owner submits a registration while offline. The
// submission is already saved on-device and queued — this modal only explains
// that it will be sent automatically the moment connectivity returns.
export default function OfflineSubmitModal({ open, petName, onClose }) {
  if (!open) return null;

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div
        className="barangay-pets-modal"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Offline submission saved"
      >
        <div className="barangay-pets-modal-header">
          <div className="barangay-pets-modal-title">
            <div
              className="barangay-pets-modal-icon"
              style={{ background: 'var(--color-warning-tint, #fef3c7)', color: 'var(--color-warning, #b45309)' }}
            >
              <WifiOff size={26} />
            </div>
            <div>
              <h3>You're Offline</h3>
              <p>Registration saved — will submit automatically</p>
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
          <div
            className="offline-banner"
            style={{
              marginBottom: '1rem',
              background: 'var(--color-warning-tint, #fef3c7)',
              border: '1px solid var(--color-warning, #f59e0b)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              color: 'var(--color-warning, #b45309)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            <strong>{petName || 'Your pet'}</strong> was saved on this device.
          </div>
          <p style={{ color: 'var(--color-text)', lineHeight: 1.6, margin: '0 0 1rem' }}>
            No connection right now, so this registration could not be sent yet.
            Once you're back online it will be submitted automatically — you don't
            need to do anything. (A pending registration is kept until it's sent.)
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-primary" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}