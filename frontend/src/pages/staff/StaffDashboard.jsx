import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import SummaryCard from '../../components/SummaryCard';
import AnnouncementWidget from '../../components/announcements/AnnouncementWidget';
import PrintReportButton from '../../components/staff/PrintReportButton';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export default function StaffDashboard() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);

  const fetchData = useCallback(() => {
    api
      .get('/analytics/summary')
      .then((res) => setSummary(res.data.summary))
      .catch(console.error);
    api
      .get('/analytics/charts')
      .then((res) => setCharts(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData);

  const males = charts?.petsBySex?.find((s) => s.sex === 'Male')?.total || 0;
  const females = charts?.petsBySex?.find((s) => s.sex === 'Female')?.total || 0;
  const dogsTotal = charts?.dogsTotal || 0;
  const catsTotal = charts?.catsTotal || 0;
  const dogMale = charts?.dogsBySex?.find((s) => s.sex === 'Male')?.total || 0;
  const dogFemale = charts?.dogsBySex?.find((s) => s.sex === 'Female')?.total || 0;
  const catMale = charts?.catsBySex?.find((s) => s.sex === 'Male')?.total || 0;
  const catFemale = charts?.catsBySex?.find((s) => s.sex === 'Female')?.total || 0;

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Staff Dashboard</h1>
          <p className="page-intro">
            Get a quick overview of registered pets, vaccinations due, and the tasks that need your attention today.
          </p>
        </div>
        <div className="page-header-actions">
          <PrintReportButton />
        </div>
      </div>

      <AnnouncementWidget />

      <div className="summary-row">
        <SummaryCard label="Total Pets" value={summary?.total_pets ?? '—'} />
        <SummaryCard label="Verified" value={summary?.verified_pets ?? '—'} />
        <SummaryCard label="Vaccinations Due" value={summary?.due_vaccinations ?? '—'} color="#b8860b" />
      </div>

      <div className="summary-row summary-row--center">
        <SummaryCard
          label="Registered Dogs"
          value={charts ? dogsTotal : '—'}
          color="#1e7a46"
          sub={[
            { label: 'Male', value: charts ? dogMale : '—' },
            { label: 'Female', value: charts ? dogFemale : '—' },
          ]}
        />
        <SummaryCard
          label="Registered Cats"
          value={charts ? catsTotal : '—'}
          color="#c8102e"
          sub={[
            { label: 'Male', value: charts ? catMale : '—' },
            { label: 'Female', value: charts ? catFemale : '—' },
          ]}
        />
        <SummaryCard
          label="Pet Sex Distribution"
          value={charts ? males + females : '—'}
          color="#c6a15b"
          sub={[
            { label: 'Male', value: charts ? males : '—' },
            { label: 'Female', value: charts ? females : '—' },
          ]}
        />
      </div>

      <h2>Quick Access</h2>
      <div className="action-cards">
        <Link to="/staff/verify-registration" className="action-card">
          <strong>Verify Registration</strong>
          <p>Review and approve newly submitted pet registrations</p>
        </Link>
        <Link to="/staff/issue-records" className="action-card">
          <strong>Issue Requested Records</strong>
          <p>Fulfill pending document requests</p>
        </Link>
      </div>
    </div>
  );
}
