import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Eye, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import useMinLoading from '../../hooks/useMinLoading';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import PrintReportButton from '../../components/staff/PrintReportButton';
import RequestBatchViewModal from '../../components/staff/RequestBatchViewModal';
import RequestPreviewSections from '../../components/staff/RequestPreviewSections';

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function IssueRequestedRecord() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewingBatch, setViewingBatch] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(null);

  function loadRequests() {
    setLoading(true);
    api.get('/record-requests')
      .then((res) => setRequests(res.data.requests || []))
      .catch((err) => {
        console.error('Error loading requests:', err);
        toast.error('Failed to load requests');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRequests(); }, []);

  const groups = useMemo(() => {
    const map = new Map();
    requests.forEach((r) => {
      const key = r.request_group_id || r.id;
      if (!map.has(key)) {
        map.set(key, { key, id: r.id, items: [] });
      }
      map.get(key).items.push(r);
    });
    return [...map.values()].map((g) => {
      const first = g.items[0];
      return {
        ...g,
        owner_name: first?.owner_name,
        pet_name: first?.pet_name,
        requested_date: first?.requested_date,
        issued_date: first?.issued_date,
        purpose: first?.purpose,
        comments: first?.comments,
        types: [...new Set(g.items.map((i) => i.request_type).filter(Boolean))],
        status: g.items.every((i) => i.status === 'Issued') ? 'Issued' : 'Pending',
      };
    });
  }, [requests]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return groups.filter((g) => {
      const inA =
        !term ||
        `${g.id} ${g.owner_name || ''} ${g.pet_name || ''} ${g.types.join(' ')} ${g.purpose || ''} ${g.comments || ''}`
          .toLowerCase()
          .includes(term);
      const inS = !statusFilter || g.status === statusFilter;
      const inT = !typeFilter || g.types.includes(typeFilter);
      return inA && inS && inT;
    });
  }, [groups, q, statusFilter, typeFilter]);

  async function downloadPdf(batch) {
    const anchorId = batch.items?.[0]?.id || batch.id;
    setPdfDownloading(anchorId);
    try {
      const res = await api.get(`/record-requests/${anchorId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `record-request-${anchorId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Combined record PDF downloaded.');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setPdfDownloading(null);
    }
  }

  async function confirmIssue(batch) {
    const anchorId = batch.items?.[0]?.id || batch.id;
    try {
      await api.put(`/record-requests/${anchorId}/issue`);
      toast.success('All records in this batch issued.');
      setViewingBatch(null);
      loadRequests();
    } catch (err) {
      console.error('Error issuing batch:', err);
      toast.error(err.response?.data?.message || 'Failed to issue batch');
    }
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Issue Requested Records</h1>
          <p className="page-intro">
            Open Requests — issue vaccination cards, record summaries, and other requested documents.
          </p>
        </div>
        <PrintReportButton category="requests" label="Issued Records" />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading requests..." />
      ) : (
        <div className="panel-card table-panel-card">
          <div className="table-header-row">
            <div>
              <h2>Issue Requested Records</h2>
              <p>Open Requests — issue vaccination cards, record summaries, and other requested documents.</p>
            </div>
            <div className="table-meta">
              {loading ? 'Loading…' : `${shown.length} request${shown.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          <div className="toolbar-row">
            <div className="search-wrap">
              <Search size={18} className="search-icon" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by ID, owner, pet, or type…"
              />
            </div>

            <div className="toolbar-select">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {['Pending', 'Issued'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="toolbar-select">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All Record Types</option>
                {[...new Set(requests.map((r) => r.request_type).filter(Boolean))].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Owner</th>
                  <th>Pet</th>
                  <th>Requested Type(s)</th>
                  <th>Requested Date</th>
                  <th>Issued Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b.key}>
                    <td data-label="Request">#{b.id}</td>
                    <td data-label="Owner">{b.owner_name || '—'}</td>
                    <td data-label="Pet">{b.pet_name || '—'}</td>
                    <td data-label="Requested Type(s)">
                      <div className="batch-type-chips">
                        {b.types.map((t) => <span className="batch-type-chip" key={t}>{t}</span>)}
                      </div>
                    </td>
                    <td data-label="Requested Date">{fmtDate(b.requested_date)}</td>
                    <td data-label="Issued Date">{b.status === 'Issued' ? fmtDate(b.issued_date) : '—'}</td>
                    <td data-label="Status"><StatusBadge status={b.status} /></td>
                    <td data-label="Actions">
                      <div className="table-actions-cell">
                        <button type="button" className="btn-icon-action" onClick={() => setViewingBatch(b)} title="View batch">
                          <Eye size={15} />
                        </button>
                        <button type="button" className="btn-icon-action btn-icon-action--print" onClick={() => downloadPdf(b)} disabled={pdfDownloading === b.id} title="Download combined PDF">
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan="8">No requests match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingBatch && (
        <RequestBatchViewModal
          batch={viewingBatch}
          onClose={() => setViewingBatch(null)}
          onIssued={confirmIssue}
          onPdf={downloadPdf}
        />
      )}
    </div>
  );
}
