import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Megaphone,
  PartyPopper,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import api from "../../services/api";
import AnnouncementWidget from "../../components/announcements/AnnouncementWidget";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const VISIBLE_ACTIVITY = 8;

function toDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(date) {
  const today = toDateOnly(new Date());
  const d = toDateOnly(date);
  if (!today || !d) return null;
  return Math.round((d - today) / 86400000);
}

function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return (
    "\u20B1" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function speciesEmoji(species) {
  const s = (species || "").toLowerCase();
  if (s.includes("dog")) return "\u{1F415}";
  if (s.includes("cat")) return "\u{1F408}";
  if (s.includes("bird")) return "\u{1F426}";
  if (s.includes("rabbit")) return "\u{1F407}";
  return "\u{1F43E}";
}

function petVaccineStatus(pet) {
  const overdue = Number(pet.overdue_vaccinations || 0);
  const dueSoon = Number(pet.due_soon_vaccinations || 0);
  const total = Number(pet.vaccination_count || 0);

  if (pet.is_lost) return { label: "Missing", tone: "danger" };
  if (overdue > 0) return { label: "Overdue", tone: "danger" };
  if (dueSoon > 0) return { label: "Due Soon", tone: "warn" };
  if (total === 0) return { label: "No Records", tone: "muted" };
  return { label: "Vaccinated", tone: "ok" };
}

export default function OwnerDashboard() {
  const [slices, setSlices] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAllActivity, setShowAllActivity] = useState(false);

  function load() {
    setLoading(true);
    const defs = [
      ["pets", api.get("/pets/my-pets").then((r) => r.data.pets || [])],
      ["vaccines", api.get("/vaccinations/my-history").then((r) => r.data.records || [])],
      ["clinical", api.get("/clinical/my-records").then((r) => r.data.records || [])],
      ["medicines", api.get("/medicines/my-records").then((r) => r.data.records || [])],
      ["payments", api.get("/payment-history/my-history").then((r) => r.data.records || [])],
      ["requests", api.get("/record-requests/my-requests").then((r) => r.data.requests || [])],
    ];

    Promise.allSettled(defs.map(([, p]) => p)).then((results) => {
      const next = {};
      const errs = {};
      defs.forEach(([key], i) => {
        if (results[i].status === "fulfilled") {
          next[key] = results[i].value;
        } else {
          errs[key] = true;
        }
      });
      setErrors(errs);
      setSlices((prev) => ({ ...prev, ...next }));
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  const pets = slices.pets || [];
  const vaccines = slices.vaccines || [];

  const petAlerts = useMemo(() => {
    const alerts = [];
    pets.forEach((pet) => {
      const overdue = Number(pet.overdue_vaccinations || 0);
      const dueSoon = Number(pet.due_soon_vaccinations || 0);
      if (overdue === 0 && dueSoon === 0) return;

      const dueVaccines = (vaccines || [])
        .filter((v) => v.pet_id === pet.id && v.next_due_date)
        .map((v) => ({
          vaccine_name: v.vaccine_name,
          due: toDateOnly(v.next_due_date),
        }))
        .filter((v) => v.due);

      const earliest = dueVaccines.sort((a, b) => a.due - b.due)[0] || null;
      const isOverdue = overdue > 0;

      alerts.push({
        pet,
        isOverdue,
        vaccine_name: earliest ? earliest.vaccine_name : "",
        due: earliest ? earliest.due : null,
      });
    });

    alerts.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return (a.due || 0) - (b.due || 0);
    });
    return alerts;
  }, [pets, vaccines]);

  const activity = useMemo(() => {
    const acts = [];

    (vaccines || []).forEach((r) => {
      const d = toDateOnly(r.date_administered);
      if (!d) return;
      acts.push({
        id: `vax-${r.id}`,
        date: d,
        emoji: speciesEmoji(r.pet_name),
        pet: r.pet_name,
        text: "Vaccination Record Updated",
        sub: r.vaccine_name,
        page: "/owner/vaccinations",
      });
    });

    (slices.clinical || []).forEach((r) => {
      const d = toDateOnly(r.consultation_date);
      if (!d) return;
      acts.push({
        id: `clin-${r.id}`,
        date: d,
        emoji: speciesEmoji(r.pet_name),
        pet: r.pet_name,
        text: "Check-up Record Added",
        sub: r.diagnosis || "Consultation record",
        page: "/owner/clinical-medicine",
      });
    });

    (slices.medicines || []).forEach((r) => {
      const d = toDateOnly(r.prescribed_date);
      if (!d) return;
      acts.push({
        id: `med-${r.id}`,
        date: d,
        emoji: speciesEmoji(r.pet_name),
        pet: r.pet_name,
        text: "Medicine Prescribed",
        sub: `${r.medicine_name}${r.quantity ? ` \u00B7 Qty ${r.quantity}` : ""}`,
        page: "/owner/clinical-medicine",
      });
    });

    (slices.payments || []).forEach((r) => {
      const d = toDateOnly(r.date ? `${r.date}T${r.time || "00:00:00"}` : null);
      if (!d) return;
      acts.push({
        id: `pay-${r.source}-${r.id}`,
        date: d,
        emoji: "\u{1F4B3}",
        pet: "Payment",
        text:
          r.source === "clinic"
            ? `Payment Recorded \u00B7 ${fmtMoney(r.amount)}`
            : `Outreach Payment \u00B7 ${fmtMoney(r.amount)}`,
        sub: r.ref || "",
        page: "/owner/payment-history",
      });
    });

    (slices.requests || []).forEach((r) => {
      const d = toDateOnly(r.requested_date);
      if (!d) return;
      acts.push({
        id: `req-${r.id}`,
        date: d,
        emoji: "\u{1F4C4}",
        pet: r.pet_name,
        text: "Record Request \u00B7 " + (r.request_type || "Request"),
        sub: r.status || "",
        page: "/owner/record-requests",
      });
    });

    (pets || [])
      .filter((p) => p.status === "Verified" && p.registration_date)
      .forEach((p) => {
        const d = toDateOnly(p.registration_date);
        if (!d) return;
        acts.push({
          id: `reg-${p.id}`,
          date: d,
          emoji: speciesEmoji(p.species_name),
          pet: p.name,
          text: "Pet Registration Verified",
          sub: p.pet_code || "",
          page: "/owner/my-pets",
        });
      });

    return acts.sort((a, b) => b.date - a.date);
  }, [slices, vaccines, pets]);

  const visibleActivity = showAllActivity ? activity : activity.slice(0, VISIBLE_ACTIVITY);
  const petsFailed = errors.pets || (!loading && slices.pets === undefined);

  return (
    <div className="page owner-dashboard">
      <section aria-labelledby="od-mypets-title">
        <h2 id="od-mypets-title" className="od-section-title">
          <span className="od-section-icon" aria-hidden="true">
            {"🐾"}
          </span>
          My Pets
          <Link to="/owner/my-pets" className="od-viewall">
            View All <ChevronRight size={16} />
          </Link>
        </h2>

        {petsFailed ? (
          <div className="od-state">
            Could not load your pets.{" "}
            <button type="button" className="od-retry" onClick={load}>
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        ) : (
          <div className="od-pets">
            {!loading &&
              pets.map((pet) => {
                const vax = petVaccineStatus(pet);
                return (
<article className="od-pet" key={pet.id}>
                      <div className="od-pet-photo-slot">
                        {pet.photo && String(pet.photo).trim() !== "" ? (
                          <img
                            className="od-pet-photo"
                            src={resolveMediaUrl(pet.photo)}
                            alt={`${pet.name} photo`}
                          />
                        ) : null}
                      </div>
                      <div className="od-pet-info">
                        <h3 className="od-pet-name">{pet.name}</h3>
                        <p className="od-pet-meta">
                          {pet.species_name}
                          {pet.sex ? ` \u00B7 ${pet.sex}` : ""}
                        </p>
                        <span className={`od-chip od-chip--${vax.tone}`}>{vax.label}</span>
                        <Link to="/owner/my-pets" className="od-pet-view">
                          View Pet
                        </Link>
                      </div>
                    </article>
                );
              })}

            {!loading && pets.length === 0 && (
              <div className="od-empty">
                <strong>No pets yet</strong>
                <span>Register your pet to start tracking its health.</span>
                <Link to="/owner/register-pet" className="btn-primary btn-sm">
                  Register Pet
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="od-important-title">
        <h2 id="od-important-title" className="od-section-title">
          <span className="od-section-icon" aria-hidden="true">
            {"📌"}
          </span>
          Important for Your Pets
        </h2>

        {petAlerts.length === 0 ? (
          <div className="od-alert-clear">
            <CheckCircle2 size={22} />
            <div>
              <strong>All pets are up to date</strong>
              <span>No vaccinations need attention right now.</span>
            </div>
          </div>
        ) : (
          <div className="od-alerts">
            {petAlerts.map((alert) => {
              const tone = alert.isOverdue ? "danger" : "warn";
              const diff = alert.due ? daysFromToday(alert.due) : null;
              return (
                <div key={alert.pet.id} className={`od-alert od-alert--${tone}`}>
                  <span className="od-alert-icon" aria-hidden="true">
                    <TriangleAlert size={22} />
                  </span>
                  <div className="od-alert-body">
                    <strong>
                      {alert.pet.name.toUpperCase()}&apos;S VACCINATION IS{" "}
                      {alert.isOverdue ? "OVERDUE" : "DUE SOON"}
                    </strong>
                    <p>
                      {alert.vaccine_name || "Vaccination"}
                      {alert.due
                        ? ` \u00B7 Due: ${fmtDate(alert.due)}${
                            diff !== null
                              ? diff === 0
                                ? " (today)"
                                : diff < 0
                                ? ` (${-diff} day${-diff === 1 ? "" : "s"} late)`
                                : ` (in ${diff} day${diff === 1 ? "" : "s"})`
                              : ""
                          }`
                        : ""}
                    </p>
                  </div>
                  <Link to="/owner/vaccinations" className="od-alert-link">
                    View Vaccine History <ChevronRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="od-announce-title">
        <h2 id="od-announce-title" className="od-section-title">
          <span className="od-section-icon" aria-hidden="true">
            {"📢"}
          </span>
          City Veterinary Office Announcement
        </h2>
        <AnnouncementWidget />
      </section>

      <section aria-labelledby="od-activity-title">
        <h2 id="od-activity-title" className="od-section-title">
          <span className="od-section-icon" aria-hidden="true">
            {"📋"}
          </span>
          Recent Activity
        </h2>

        {activity.length === 0 ? (
          <div className="od-empty od-empty--compact">
            <PartyPopper size={30} />
            <strong>Nothing yet</strong>
            <span>Your recent activity will show up here.</span>
          </div>
        ) : (
          <>
            <div className="od-activity-card">
              <ul className="od-activity">
                {visibleActivity.map((item) => (
                  <li key={item.id}>
                    <Link to={item.page} className="od-activity-item">
                      <span className="od-activity-date">{fmtDate(item.date)}</span>
                      <span className="od-activity-emoji" aria-hidden="true">
                        {item.emoji}
                      </span>
                      <span className="od-activity-main">
                        <strong>{item.text}</strong>
                        <small>
                          {item.pet}
                          {item.sub ? ` \u00B7 ${item.sub}` : ""}
                        </small>
                      </span>
                      <ChevronRight size={16} className="od-activity-chevron" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {activity.length > VISIBLE_ACTIVITY && (
              <button
                type="button"
                className="od-showmore"
                onClick={() => setShowAllActivity((v) => !v)}
              >
                {showAllActivity ? "Show Less" : `View All Activity (${activity.length})`}
                <ChevronDown size={16} style={{ transform: showAllActivity ? "rotate(180deg)" : undefined }} />
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}