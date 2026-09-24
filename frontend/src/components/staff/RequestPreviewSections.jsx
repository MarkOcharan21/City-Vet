import StatusBadge from '../StatusBadge';

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function RequestPreviewSections({ preview }) {
  if (!preview) return <p className="preview-empty">No preview data available yet.</p>;

  const pet = preview.pet || {};
  const owner = preview.owner || {};
  const qrCode = preview.qrCode || null;

  return (
    <div className="preview-sections">
      {preview.showPet && (
        <div className="preview-section">
          <h4>Pet Identity</h4>
          <div className="issue-detail-grid">
            <div className="issue-detail-item"><span>Name</span><strong>{pet.name || '—'}</strong></div>
            <div className="issue-detail-item"><span>Pet Code</span><strong>{pet.pet_code || '—'}</strong></div>
            <div className="issue-detail-item"><span>Species</span><strong>{pet.species_name || '—'}</strong></div>
            <div className="issue-detail-item"><span>Breed</span><strong>{pet.breed_name || '—'}</strong></div>
            <div className="issue-detail-item"><span>Sex</span><strong>{pet.sex || '—'}</strong></div>
            <div className="issue-detail-item"><span>Birthdate</span><strong>{fmt(pet.birthdate)}</strong></div>
          </div>
        </div>
      )}

      {preview.showOwner && (
        <div className="preview-section">
          <h4>Owner Information</h4>
          <div className="issue-detail-grid">
            <div className="issue-detail-item"><span>Full Name</span><strong>{owner.full_name || '—'}</strong></div>
            <div className="issue-detail-item"><span>Contact</span><strong>{owner.contact_number || '—'}</strong></div>
            <div className="issue-detail-item"><span>Address</span><strong>{owner.address || '—'}</strong></div>
            <div className="issue-detail-item"><span>Barangay</span><strong>{owner.barangay || '—'}</strong></div>
          </div>
        </div>
      )}

      {preview.showQr && qrCode && (
        <div className="preview-section">
          <h4>QR Code</h4>
          <div className="issue-detail-grid">
            <div className="issue-detail-item"><span>QR Token</span><strong>{qrCode.qr_token || '—'}</strong></div>
            <div className="issue-detail-item"><span>Status</span><strong>{qrCode.qr_status || '—'}</strong></div>
            <div className="issue-detail-item"><span>Issue Date</span><strong>{fmt(qrCode.issue_date)}</strong></div>
          </div>
        </div>
      )}

      {preview.vaccinations?.length > 0 && (
        <div className="preview-section">
          <h4>Vaccination Records</h4>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Vaccine</th><th>Date Administered</th><th>Next Due</th><th>Status</th></tr></thead>
              <tbody>
                {preview.vaccinations.map((v, i) => (
                  <tr key={i}>
                    <td>{v.vaccine_name || '—'}</td>
                    <td>{fmt(v.date_administered)}</td>
                    <td>{fmt(v.next_due_date)}</td>
                    <td><StatusBadge status={v.status || 'Pending'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview.consultations?.length > 0 && (
        <div className="preview-section">
          <h4>Clinical / Consultation Records</h4>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Diagnosis</th><th>Treatment Plan</th><th>Vet</th></tr></thead>
              <tbody>
                {preview.consultations.map((c, i) => (
                  <tr key={i}>
                    <td>{fmt(c.consultation_date)}</td>
                    <td>{c.diagnosis || '—'}</td>
                    <td>{c.treatment_plan || '—'}</td>
                    <td>{c.veterinarian || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview.prescriptions?.length > 0 && (
        <div className="preview-section">
          <h4>Prescription / Medicine Records</h4>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Days</th></tr></thead>
              <tbody>
                {preview.prescriptions.map((m, i) => (
                  <tr key={i}>
                    <td>{m.medicine_name || '—'}</td>
                    <td>{m.dosage || '—'}</td>
                    <td>{m.frequency || '—'}</td>
                    <td>{m.duration_days || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview.payments?.length > 0 && (
        <div className="preview-section">
          <h4>Payment Records</h4>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {preview.payments.map((p, i) => (
                  <tr key={i}>
                    <td>{fmt(p.payment_date)}</td>
                    <td>{p.description || '—'}</td>
                    <td>{p.amount != null ? `₱${Number(p.amount).toLocaleString('en-PH')}` : '—'}</td>
                    <td><StatusBadge status={p.status || 'Pending'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
