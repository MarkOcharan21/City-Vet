import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Stethoscope, Syringe, ClipboardList } from "lucide-react";
import AnnouncementWidget from "../../components/announcements/AnnouncementWidget";
import SummaryCard from "../../components/SummaryCard";
import api from "../../services/api";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";

export default function VeterinarianDashboard() {
  const [charts, setCharts] = useState(null);

  const fetchData = useCallback(() => {
    api
      .get("/analytics/charts")
      .then((res) => setCharts(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData);

  const males = charts?.petsBySex?.find((s) => s.sex === "Male")?.total || 0;
  const females = charts?.petsBySex?.find((s) => s.sex === "Female")?.total || 0;
  const dogsTotal = charts?.dogsTotal || 0;
  const catsTotal = charts?.catsTotal || 0;
  const dogMale = charts?.dogsBySex?.find((s) => s.sex === "Male")?.total || 0;
  const dogFemale = charts?.dogsBySex?.find((s) => s.sex === "Female")?.total || 0;
  const catMale = charts?.catsBySex?.find((s) => s.sex === "Male")?.total || 0;
  const catFemale = charts?.catsBySex?.find((s) => s.sex === "Female")?.total || 0;

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Veterinarian Dashboard</h1>
          <p className="page-intro">
            Document the clinic visit and manage consultation records.
          </p>
        </div>
      </div>

      <AnnouncementWidget />

      <div className="summary-row summary-row--center">
        <SummaryCard
          label="Verified Dogs"
          value={charts ? dogsTotal : "—"}
          color="#1e7a46"
          sub={[
            { label: "Male", value: charts ? dogMale : "—" },
            { label: "Female", value: charts ? dogFemale : "—" },
          ]}
        />
        <SummaryCard
          label="Verified Cats"
          value={charts ? catsTotal : "—"}
          color="#c8102e"
          sub={[
            { label: "Male", value: charts ? catMale : "—" },
            { label: "Female", value: charts ? catFemale : "—" },
          ]}
        />
        <SummaryCard
          label="Pet Sex Distribution"
          value={charts ? Number(males) + Number(females) : "—"}
          color="#c6a15b"
          sub={[
            { label: "Male", value: charts ? males : "—" },
            { label: "Female", value: charts ? females : "—" },
          ]}
        />
      </div>

      <h2>Quick Access</h2>
      <div className="action-cards">
        <Link to="/veterinarian/clinical-records" className="action-card">
          <strong><Stethoscope size={18} /> New Consultation</strong>
          <p>Record a visit, add charges, and create the payment automatically.</p>
        </Link>
        <Link to="/veterinarian/consultation-log" className="action-card">
          <strong><ClipboardList size={18} /> Consultation Log</strong>
          <p>Review saved diagnoses, treatment plans, and follow-up care.</p>
        </Link>
        <Link to="/veterinarian/vaccination-monitoring" className="action-card">
          <strong><Syringe size={18} /> Vaccination Records</strong>
          <p>Record administered vaccines and monitor due dates.</p>
        </Link>
      </div>
    </div>
  );
}
