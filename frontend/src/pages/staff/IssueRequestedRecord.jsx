import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

export default function IssueRequestedRecord() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadRequests() {
    setLoading(true);
    api.get('/record-requests')
      .then((res) => setRequests(res.data.requests || []))
      .catch((err) => {
        console.error("Error loading requests:", err);
        toast.error("Failed to load requests");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRequests(); }, []);

  async function handleIssue(id) {
    try {
      await api.put(`/record-requests/${id}/issue`);
      toast.success("Record marked as issued successfully");
      loadRequests();
    } catch (err) {
      console.error("Error issuing record:", err);
      toast.error(err.response?.data?.message || "Failed to issue record");
    }
  }

  return (
    <div className="page">
      <h1>Issue Requested Record</h1>
      <p>Open Requests — issue vaccination cards, record summaries, and other requested documents.</p>

      {loading ? <p>Loading...</p> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Owner</th>
                <th>Pet</th>
                <th>Request Type</th>
                <th>Purpose</th>
                <th>Comments</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td data-label="Request ID">{r.id}</td>
                  <td data-label="Owner">{r.owner_name}</td>
                  <td data-label="Pet">{r.pet_name}</td>
                  <td data-label="Request Type">{r.request_type}</td>
                  <td data-label="Purpose">{r.purpose || '—'}</td>
                  <td data-label="Comments">{r.comments || '—'}</td>
                  <td data-label="Status"><StatusBadge status={r.status} /></td>
                  <td>
                    {r.status !== 'Issued' && (
                      <button className="btn-primary" onClick={() => handleIssue(r.id)}>Mark as Issued</button>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan="8">No open requests.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
