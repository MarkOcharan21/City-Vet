import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import SummaryCard from '../../components/SummaryCard';
import AnnouncementWidget from '../../components/announcements/AnnouncementWidget';

export default function StaffDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api
      .get('/analytics/summary')
      .then((res) => setSummary(res.data.summary))
      .catch(console.error);
  }, []);

  return (
    <div className="page">
      <h1> Staff Dashboard</h1>

      <AnnouncementWidget />

      <div className="summary-row">
        <SummaryCard label="Total Pets" value={summary?.total_pets ?? '—'} />
        <SummaryCard label="Verified" value={summary?.verified_pets ?? '—'} />
        <SummaryCard label="Vaccinations Due" value={summary?.due_vaccinations ?? '—'} color="#b8860b" />
      </div>

      <h2>Quick Access</h2>
      <div className="action-cards">
        <Link to="/staff/verify-registration" className="action-card">
          <strong>Verify Registration</strong>
          <p>Review and approve newly submitted pet registrations</p>
        </Link>
        <Link to="/staff/vaccination-monitoring" className="action-card">
          <strong>Vaccination Monitoring</strong>
          <p>Track which pets are due or updated</p>
        </Link>
        <Link to="/staff/issue-records" className="action-card">
          <strong>Issue Requested Record</strong>
          <p>Fulfill open document requests</p>
        </Link>
      </div>
    </div>
  );
}
