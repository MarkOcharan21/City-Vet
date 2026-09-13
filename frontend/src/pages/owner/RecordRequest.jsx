import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Trash2, FileText, Download } from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace("/api", "") || window.location.origin;

async function fetchRecordPdfBlob(requestId) {
  const response = await api.get(`/record-requests/${requestId}/pdf`, {
    responseType: 'blob',
  });

  const contentType = response.headers['content-type'] || '';
  const rawBlob = response.data;

  if (contentType.includes('application/json') || rawBlob?.type?.includes('json')) {
    const errorText = await rawBlob.text();
    let message = 'Failed to load PDF';
    try {
      message = JSON.parse(errorText).message || message;
    } catch {
      // Keep default message when response is not JSON.
    }
    throw new Error(message);
  }

  if (rawBlob instanceof Blob && rawBlob.type === 'application/pdf') {
    return rawBlob;
  }

  return new Blob([rawBlob], { type: 'application/pdf' });
}

export default function RecordRequest() {
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [form, setForm] = useState({
    pet_id: '',
    request_type: 'Vaccination Card',
    purpose: '',
    format: 'PDF',
    comments: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedPetInfo, setSelectedPetInfo] = useState(null);
  const previousStatusesRef = useRef({});
  const [pdfPreview, setPdfPreview] = useState(null);
  const [viewingPdf, setViewingPdf] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAllRequests, setShowAllRequests] = useState(false);

  const VISIBLE_LIMIT = 3;

  const numberedRequests = [...requests]
    .sort((a, b) => new Date(b.requested_date) - new Date(a.requested_date))
    .map((r, index, arr) => ({
      ...r,
      displayNumber: arr.length - index,
    }));

  const visibleRequests = showAllRequests
    ? numberedRequests
    : numberedRequests.slice(0, VISIBLE_LIMIT);

  const hiddenCount = Math.max(numberedRequests.length - VISIBLE_LIMIT, 0);

  function formatRequestDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const downloadPdf = useCallback(async (requestId) => {
    try {
      const blob = await fetchRecordPdfBlob(requestId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `record-request-${requestId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error(err.message || 'Failed to download PDF');
    }
  }, []);

  const closePdfPreview = useCallback(() => {
    setViewingPdf(false);
    setPdfPreview((current) => {
      if (current?.url) {
        window.URL.revokeObjectURL(current.url);
      }
      return null;
    });
  }, []);

  const viewPdf = useCallback(async (requestId) => {
    setPdfLoading(true);
    setViewingPdf(true);

    try {
      const blob = await fetchRecordPdfBlob(requestId);

      setPdfPreview((current) => {
        if (current?.url) {
          window.URL.revokeObjectURL(current.url);
        }
        return {
          url: window.URL.createObjectURL(blob),
          id: requestId,
        };
      });
    } catch (err) {
      console.error("Error loading PDF:", err);
      toast.error(err.message || 'Failed to load PDF preview');
      setViewingPdf(false);
      setPdfPreview(null);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  const loadRequests = useCallback((isInitialLoad = false) => {
    setRequestsLoading(true);
    api.get('/record-requests/my-requests')
      .then((res) => {
        const newRequests = res.data.requests || [];
        const prevStatuses = previousStatusesRef.current;
        
        // Check for newly issued records and notify (only on subsequent loads)
        if (!isInitialLoad) {
          newRequests.forEach(request => {
            // Only notify if the request existed before AND its status changed TO 'Issued'
            if (prevStatuses[request.id] && prevStatuses[request.id] !== 'Issued' && request.status === 'Issued') {
              toast.success(
                <div>
                  <strong>Record #{request.id}</strong> is ready for claiming!<br />
                  <small style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                         onClick={() => viewPdf(request.id)}>
                    Click to view PDF
                  </small>
                </div>,
                { duration: 8000 }
              );
            }
          });
        }
        
        // Update previous statuses ref
        const statusMap = {};
        newRequests.forEach(r => {
          statusMap[r.id] = r.status;
        });
        previousStatusesRef.current = statusMap;
        
        setRequests(newRequests);
      })
      .catch((err) => {
        console.error("Error loading requests:", err);
        toast.error("Failed to load requests");
      })
      .finally(() => setRequestsLoading(false));
  }, [viewPdf]);

  // Load initial data
  useEffect(() => {
    let cancelled = false;
    
    setPetsLoading(true);
    api.get('/pets/my-pets')
      .then((res) => {
        if (!cancelled) {
          setPets(res.data.pets || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error loading pets:", err);
          // Only show toast if not an auth error (user not logged in)
          if (err.response?.status !== 401 && err.response?.status !== 403) {
            toast.error("Failed to load pets");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setPetsLoading(false);
      });
    
    loadRequests(true); // Initial load — no notifications

    // Set up Socket.IO for real-time updates
    const socket = io(API_ORIGIN, { transports: ['websocket', 'polling'] });
    
    socket.on('new-notification', () => {
      loadRequests(); // Subsequent load — check for status changes
    });
    socket.on('connect_error', () => {
      // Silent fail - socket is optional for core functionality
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) {
        window.URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview?.url]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Show selected pet info when a pet is chosen
    if (name === 'pet_id' && value) {
      const pet = pets.find(p => String(p.id) === value);
      setSelectedPetInfo(pet || null);
    } else if (name === 'pet_id' && !value) {
      setSelectedPetInfo(null);
    }
  }

  function getPetDisplayLabel(pet) {
    const parts = [pet.name];
    if (pet.species_name) parts.push(`(${pet.species_name}`);
    if (pet.breed_name) {
      if (pet.species_name) {
        parts[parts.length - 1] += ` - ${pet.breed_name})`;
      } else {
        parts.push(`(${pet.breed_name})`);
      }
    } else if (pet.species_name) {
      parts[parts.length - 1] += ')';
    }
    if (pet.pet_code) parts.push(`[${pet.pet_code}]`);
    return parts.join(' ');
  }

  function openDeleteConfirm(request) {
    setDeleteTarget(request);
  }

  function cancelDelete() {
    if (deletingId) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const requestId = deleteTarget.id;
    setDeletingId(requestId);
    try {
      await api.delete(`/record-requests/${requestId}`);
      toast.success('Request deleted.');
      if (pdfPreview?.id === requestId) {
        closePdfPreview();
      }
      setDeleteTarget(null);
      loadRequests();
    } catch (err) {
      console.error('Error deleting request:', err);
      toast.error(err.response?.data?.message || 'Failed to delete request.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.pet_id) {
      toast.error("Please select a pet");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/record-requests', {
        ...form,
        pet_id: Number(form.pet_id),
        purpose: form.purpose.trim(),
        comments: form.comments.trim(),
      });
      toast.success('Request submitted successfully');
      setForm({
        pet_id: '',
        request_type: 'Vaccination Card',
        purpose: '',
        format: 'PDF',
        comments: '',
      });
      setSelectedPetInfo(null);
      loadRequests();
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  const handlePrintPdf = () => {
    if (!pdfPreview?.url) return;
    const printWindow = window.open(pdfPreview.url, '_blank', 'noopener,noreferrer');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  return (
    <>
    <div className="page page-split">
      <div className="page-main">
        <h1>Record Requests</h1>
        
        <form onSubmit={handleSubmit} className="form-card">
          <label>Pet</label>
          {petsLoading ? (
            <div style={{ padding: '8px 0' }}>
              <LoadingSpinner text="Loading your pets..." fullPage={false} />
            </div>
          ) : (
            <>
              <select name="pet_id" value={form.pet_id} onChange={handleChange} required>
                <option value="">Select Pet</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPetDisplayLabel(p)}
                  </option>
                ))}
              </select>
              {pets.length === 0 && !petsLoading && (
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                  No registered pets found. Register a pet first.
                </p>
              )}
            </>
          )}

          {/* Selected Pet Info Card */}
          {selectedPetInfo && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '8px',
              fontSize: '13px'
            }}>
              <strong style={{ color: '#0369a1' }}>Selected Pet:</strong>
              <div style={{ marginTop: '4px', color: '#334155' }}>
                <span>{selectedPetInfo.name}</span>
                {selectedPetInfo.species_name && (
                  <span> — {selectedPetInfo.species_name}</span>
                )}
                {selectedPetInfo.breed_name && (
                  <span> ({selectedPetInfo.breed_name})</span>
                )}
                {selectedPetInfo.pet_code && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Code: {selectedPetInfo.pet_code}
                  </div>
                )}
              </div>
            </div>
          )}

          <label>Request Type</label>
          <select name="request_type" value={form.request_type} onChange={handleChange}>
            <option>Vaccination Card</option>
            <option>Record Summary</option>
            <option>Certificate of Registration</option>
          </select>

          <label>Purpose</label>
          <input name="purpose" value={form.purpose} onChange={handleChange} placeholder="e.g. Travel requirement" />

          <label>Format</label>
          <select name="format" value={form.format} onChange={handleChange}>
            <option>PDF</option>
            <option>Printed Copy</option>
          </select>

          <label>Additional Comments</label>
          <textarea
            name="comments"
            value={form.comments}
            onChange={handleChange}
            rows={4}
            placeholder="Add any extra details or requests (optional)"
          />

          <button type="submit" className="btn-primary" disabled={submitting || !form.pet_id || petsLoading}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>

      <aside className="page-side">
        <h3>My Requests</h3>
        {requestsLoading ? (
          <LoadingSpinner text="Loading requests..." fullPage={false} />
        ) : requests.length === 0 ? (
          <div className="requests-empty">
            <p style={{ margin: 0 }}>No requests yet.</p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem' }}>Submit a form to request a record.</p>
          </div>
        ) : (
          <>
            {visibleRequests.map((r) => (
              <div key={r.id} className="mini-request-card">
                <div className="request-card-header">
                  <p className="request-card-title">
                    <span className="request-card-pet">#{r.displayNumber} — {r.pet_name}</span>
                  </p>
                  <button
                    type="button"
                    className="btn-delete-icon"
                    onClick={() => openDeleteConfirm(r)}
                    disabled={deletingId === r.id}
                    title="Delete request"
                    aria-label="Delete request"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="request-card-type">{r.request_type}</p>
                {r.purpose && <p className="request-card-purpose">{r.purpose}</p>}
                {r.comments && (
                  <p className="request-card-purpose" style={{ fontStyle: 'italic' }}>
                    Comment: {r.comments}
                  </p>
                )}

                <div className="request-card-meta">
                  <StatusBadge status={r.status} />
                  {r.requested_date && (
                    <span className="request-card-date">{formatRequestDate(r.requested_date)}</span>
                  )}
                </div>

                {r.status === 'Issued' && (
                  <div className="request-card-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => viewPdf(r.id)}
                    >
                      <FileText size={14} />
                      View PDF
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => downloadPdf(r.id)}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                )}

                {r.status === 'Open' && (
                  <div className="request-card-actions">
                    <button
                      type="button"
                      className="btn-delete-text"
                      onClick={() => openDeleteConfirm(r)}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? 'Deleting...' : 'Cancel Request'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {!showAllRequests && hiddenCount > 0 && (
              <button
                type="button"
                className="btn-view-more"
                onClick={() => setShowAllRequests(true)}
              >
                View More ({hiddenCount} more)
              </button>
            )}

            {showAllRequests && numberedRequests.length > VISIBLE_LIMIT && (
              <button
                type="button"
                className="btn-view-more btn-view-more--less"
                onClick={() => setShowAllRequests(false)}
              >
                Show Less
              </button>
            )}
          </>
        )}
      </aside>

      {/* PDF Preview Modal */}
      {viewingPdf && (
        <div
          onClick={closePdfPreview}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '16px',
              width: 'min(100%, 900px)',
              height: 'min(90vh, 700px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#C8102E' }}>
                Record Request #{pdfPreview?.id || '...'} - PDF Preview
              </h3>
              <div className="record-pdf-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrintPdf}
                  disabled={!pdfPreview?.url || pdfLoading}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => pdfPreview?.id && downloadPdf(pdfPreview.id)}
                  disabled={!pdfPreview?.id || pdfLoading}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closePdfPreview}
                >
                  Close
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              {pdfLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <LoadingSpinner text="Loading PDF..." fullPage={false} />
                </div>
              ) : pdfPreview?.url ? (
                <object
                  data={pdfPreview.url}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  style={{ display: 'block', background: '#fff' }}
                >
                  <embed
                    src={pdfPreview.url}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                    style={{ display: 'block', background: '#fff' }}
                  />
                </object>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b6062' }}>
                  Unable to display PDF preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    <ConfirmDialog
      open={!!deleteTarget}
      title="Cancel this request?"
      message={
        deleteTarget
          ? `Request #${deleteTarget.displayNumber} for "${deleteTarget.pet_name}" will be permanently removed.`
          : "This action cannot be undone."
      }
      confirmText="Yes, Delete"
      cancelText="Keep It"
      loading={!!deletingId}
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
    />
    </>
  );
}
