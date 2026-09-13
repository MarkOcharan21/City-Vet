import React from 'react';
import StatusBadge from '../StatusBadge';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

export default function PetVaccinationCard({ pet, latest, history, onAddRecord }) {
  if (!pet) return null;

  const species = pet.species_name || pet.species || '';
  const breed = pet.breed_name || pet.breed || '';
  const speciesBreed = [species, breed].filter(Boolean).join(' · ') || '—';
  const petId = pet.pet_code || pet.pet_id || '—';

  return (
    <div className="panel-card vaccination-pet-card">
      <div className="vaccination-pet-head">
        <div className="vaccination-pet-title">
          <strong className="vaccination-pet-name">{pet.name}</strong>
          {petId !== '—' && <span className="vaccination-pet-code">{petId}</span>}
        </div>
        <div className="vaccination-pet-head-actions">
          {latest && <StatusBadge status={latest.status} />}
        </div>
      </div>

      <div className="vaccination-pet-grid">
        <div className="grid-item">
          <span>Pet ID</span>
          <strong>{petId}</strong>
        </div>
        <div className="grid-item">
          <span>Species / Breed</span>
          <strong>{speciesBreed}</strong>
        </div>
        <div className="grid-item">
          <span>Owner</span>
          <strong>{pet.owner_name || '—'}</strong>
        </div>
        <div className="grid-item">
          <span>Barangay</span>
          <strong>{pet.barangay || '—'}</strong>
        </div>
      </div>

      <div className="vaccination-status-section">
        <h3 className="vaccination-status-title">Current Vaccination</h3>
        {latest ? (
          <div className="vaccination-status-banner">
            <div className="vaccination-status-main">
              <div className="vaccination-status-title-row">
                <strong className="vaccination-vaccine">{latest.vaccine_name}</strong>
                {latest.dose_label && (
                  <span className="vaccination-dose-badge">{latest.dose_label}</span>
                )}
              </div>
              <div className="vaccination-status-dates">
                <span>
                  Last Vaccinated: <strong>{formatDate(latest.date_administered)}</strong>
                </span>
                <span>
                  Next Due: <strong>{formatDate(latest.next_due_date)}</strong>
                </span>
              </div>
              {latest.comments && <p className="vaccination-status-notes">{latest.comments}</p>}
            </div>
            <StatusBadge status={latest.status} />
          </div>
        ) : (
          <p className="vaccination-no-records">No vaccination records found for this pet.</p>
        )}
        <div className="vaccination-pet-actions">
          <button type="button" className="btn-primary btn-sm" onClick={onAddRecord}>
            Update Vaccination Record
          </button>
        </div>
      </div>

      <div className="vaccination-history-section">
        <h3>Vaccination History</h3>
        {history && history.length > 0 ? (
          <div className="vaccination-history-list">
            {history.map((record, index) => (
              <div
                key={`${record.id}-${record.vaccine_id}-${record.date_administered}-${index}`}
                className="vaccination-history-item"
              >
                <div className="vaccination-history-date">{formatDate(record.date_administered)}</div>
                <div className="vaccination-history-body">
                  <div className="vaccination-history-title-row">
                    <strong>{record.vaccine_name}</strong>
                    {record.dose_label && (
                      <span className="vaccination-dose-badge">{record.dose_label}</span>
                    )}
                  </div>
                  <span>Next Due: {formatDate(record.next_due_date)}</span>
                  {record.comments && <em>{record.comments}</em>}
                </div>
                <StatusBadge status={record.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="vaccination-empty-text">No history available.</p>
        )}
      </div>
    </div>
  );
}