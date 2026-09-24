import { useEffect, useState } from 'react';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../StatusBadge';
import RequestPreviewSections from './RequestPreviewSections';
import toast from 'react-hot-toast';

const fmt = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function RequestBatchViewModal({ batch, onClose, onIssued, onPdf }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const anchorId = (batch.items && batch.items[0]?.id) || batch.key || batch.groupId;
    if (!anchorId) {
      setLoading(false);
      return;
    }
    api
      .get(`/record-requests/${anchorId}/preview-data`)
      .then((res) => setPreview(res.data.preview || null))
      .catch((err) => {
        console.error('Preview load error:', err);
        toast.error(err.response?.data?.message || 'Failed to load preview');
      })
      .finally(() => setLoading(false));
  }, [batch]);

  const types = batch.types?.length ? batch.types : [batch.request_type].filter(Boolean ? Boolean : Boolean);

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div className="barangay-pets-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="barangay-pets-modal-header">
          <div className="barangay-pets-modal-title">
            <div className="barangay-pets-modal-icon">📄</div>
            <div>
              <h3>Request Batch #{batch.key || batch.groupId}</h3>
              <p>{batch.pet_name || '—'} · {batch.owner_name || '—'}</p>
            </div>
          </div>
          <button type="button" className="barangay-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="barangay-pets-modal-body">
          <div className="issue-detail-grid">
            <div className="issue-detail-item issue-detail-item--wide">
              <span>Request Type(s)</span>
              <strong>{types.join(', ')}</strong>
            </div>
            <div className="issue-detail-item"><span>Format</span><strong>{batch.format || '—'}</strong></div>
            <div className="issue-detail-item"><span>Requested</span><strong>{fmt(batch.requested_date)}</strong></div>
            <div className="issue-detail-item"><span>Issued</span><strong>{batch.status === 'Issued' ? fmt(batch.issued_date) : 'Not yet'}</strong></div>
            <div className="issue-detail-item issue-detail-item--wide"><span>Purpose</span><strong>{batch.purpose || '—'}</strong></div>
            {batch.comments && (
              <div className="issue-detail-item issue-detail-item--wide"><span>Owner Comments</span><strong style={{ fontStyle: 'italic' }}>{batch.comments}</strong></div>
            )}
          </div>

          <div className="issue-status-note">
            <StatusBadge status={batch.status} />
            {batch.status === 'Issued'
              ? <span>All records in this batch have been issued.</span>
              : <span>Prepare the combined PDF, then confirm issuance for the whole batch.</span>}
          </div>

          <div className="record-preview-section">
            <h4>Record Request Preview</h4>
            <p className="preview-note">
              Below is the record data that will appear in the generated PDF (only sections for the requested types).
            </p>
            {loading ? <p className="preview-loading">Loading preview…</p> : <RequestPreviewSections preview={preview} />}
          </div>

          <div className="issue-modal-actions">
            <button type="button" className="btn-secondary" onClick={() => onPdf(batch)}>
              <Download size={15} />
              Generate / Download Combined PDF
            </button>
            {batch.status !== 'Issued' && (
              <button type="button" className="btn-primary" onClick={() => onIssued(batch)}>
                <CheckCircle2 size={15} />
                Confirm Issue Batch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
