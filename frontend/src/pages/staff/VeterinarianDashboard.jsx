import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Stethoscope, Pill, Syringe } from "lucide-react";
import api from "../../services/api";
import SummaryCard from "../../components/SummaryCard";
import AnnouncementWidget from "../../components/announcements/AnnouncementWidget";

export default function VeterinarianDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/clinic-queue")
      .then((res) => setQueue(res.data.entries || []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    waiting: queue.filter((entry) => entry.status === "Waiting").length,
    inConsultation: queue.filter((entry) => entry.status === "In Consultation").length,
    completed: queue.filter((entry) => entry.status === "Completed").length,
  }), [queue]);

  const nextPatients = queue
    .filter((entry) => entry.status === "Waiting" || entry.status === "In Consultation")
    .sort((a, b) => a.id - b.id)
    .slice(0, 5);

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Veterinarian Dashboard</h1>
          <p className="page-intro">
            Manage the walk-in queue and document the clinic visit.
          </p>
        </div>
      </div>

      <AnnouncementWidget />

      <div className="summary-row">
        <SummaryCard label="Waiting" value={loading ? "—" : counts.waiting} color="#D97706" />
        <SummaryCard label="In Consultation" value={loading ? "—" : counts.inConsultation} color="#1D4ED8" />
        <SummaryCard label="Completed Today" value={loading ? "—" : counts.completed} color="#15803D" />
      </div>

      <h2>Quick Access</h2>
      <div className="action-cards">
        <Link to="/veterinarian/queue" className="action-card">
          <strong><ClipboardCheck size={18} /> Walk-in Queue</strong>
          <p>Call and manage patients waiting for consultation.</p>
        </Link>
        <Link to="/veterinarian/clinical-records" className="action-card">
          <strong><Stethoscope size={18} /> Consultation Records</strong>
          <p>Document diagnosis, treatment plans, and follow-up care.</p>
        </Link>
        <Link to="/veterinarian/medicine-records" className="action-card">
          <strong><Pill size={18} /> Prescriptions</strong>
          <p>Create and review medicine instructions for consultations.</p>
        </Link>
        <Link to="/veterinarian/vaccination-monitoring" className="action-card">
          <strong><Syringe size={18} /> Vaccination Records</strong>
          <p>Record administered vaccines and monitor due dates.</p>
        </Link>
      </div>

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Next Patients</h2>
            <p>Current walk-ins ordered by queue number.</p>
          </div>
          <Link to="/veterinarian/queue" className="btn-secondary btn-sm">View Queue</Link>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Pet</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {nextPatients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state-cell">
                    {loading ? "Loading queue..." : "No patients are currently waiting."}
                  </td>
                </tr>
              ) : nextPatients.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="Queue">#{entry.id}</td>
                  <td data-label="Pet">{entry.pet_name} ({entry.pet_code})</td>
                  <td data-label="Owner">{entry.owner_name}</td>
                  <td data-label="Status">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
