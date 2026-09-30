import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  PawPrint,
  ShieldAlert,
} from "lucide-react";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import useMinLoading from "../../hooks/useMinLoading";
import PrintReportButton from "../../components/staff/PrintReportButton";
import { hasValue, formatDate, formatAge, healthFlags, flagLabel } from "../../utils/petDisplay";

const PAGE_SIZE = 25;

export default function ConsultationLog() {
  const [records, setRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoading(loading);
  const [recordSearch, setRecordSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [recordPage, setRecordPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/clinical").then((res) => setRecords(res.data.records || [])).catch(() => setRecords([])),
      api.get("/pets").then((res) => setPets(res.data.pets || [])).catch(() => setPets([])),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // The consultation API returns only clinical columns; the pet roster carries
  // photo/breed/barangay/health fields, so join on it instead of widening the query.
  const petById = useMemo(() => {
    const map = new Map();
    pets.forEach((pet) => map.set(Number(pet.id), pet));
    return map;
  }, [pets]);

  const availableYears = useMemo(() => {
    const years = new Set();
    records.forEach((record) => {
      if (!record.consultation_date) return;
      const year = String(record.consultation_date).slice(0, 4);
      if (/^\d{4}$/.test(year)) years.add(Number(year));
    });
    return [...years].sort((a, b) => b - a);
  }, [records]);

  const recordSpeciesOptions = useMemo(() => {
    const names = new Set();
    records.forEach((record) => {
      const name = petById.get(Number(record.pet_id))?.species_name;
      if (hasValue(name)) names.add(name);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [records, petById]);

  const filteredRecords = useMemo(() => {
    const term = recordSearch.trim().toLowerCase();
    return records.filter((record) => {
      const iso = String(record.consultation_date || "").slice(0, 10);
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      if (yearFilter && iso.slice(0, 4) !== yearFilter) return false;
      if (speciesFilter) {
        const species = petById.get(Number(record.pet_id))?.species_name;
        if (species !== speciesFilter) return false;
      }
      if (!term) return true;
      return [record.pet_name, record.pet_code, record.owner_name, record.diagnosis, record.treatment_plan, record.vet_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [records, recordSearch, dateFrom, dateTo, yearFilter, speciesFilter, petById]);

  // A narrowed result set can shrink below the current page — start over.
  useEffect(() => {
    setRecordPage(1);
  }, [recordSearch, dateFrom, dateTo, yearFilter, speciesFilter]);

  const totalRecordPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safeRecordPage = Math.min(recordPage, totalRecordPages);
  const visibleRecords = filteredRecords.slice(
    (safeRecordPage - 1) * PAGE_SIZE,
    safeRecordPage * PAGE_SIZE,
  );

  const flaggedRecordCount = useMemo(
    () => filteredRecords.filter((record) => healthFlags(petById.get(Number(record.pet_id))).length > 0).length,
    [filteredRecords, petById],
  );

  const followUpCount = useMemo(
    () => filteredRecords.filter((record) => hasValue(record.follow_up_date)).length,
    [filteredRecords],
  );

  const hasActiveRecordFilters = Boolean(dateFrom || dateTo || yearFilter || speciesFilter);

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <Link to="/veterinarian/clinical-records" className="back-link"><ArrowLeft size={15} /> Back</Link>
          <h1>Consultation Log</h1>
          <p className="page-intro">Review saved clinical notes for each pet.</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <Link to="/veterinarian/clinical-records" className="btn-primary">New Consultation</Link>
          <PrintReportButton category="clinical" />
        </div>
      </div>

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Saved Consultations</h2>
            <p>Every consultation recorded in the clinic, newest first.</p>
          </div>
          <div className="table-meta">
            {showLoading
              ? 'Loading...'
              : `${filteredRecords.length} record${filteredRecords.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Search by pet, owner, or diagnosis..."
              value={recordSearch}
              onChange={(event) => setRecordSearch(event.target.value)}
              aria-label="Search consultation records"
            />
          </div>

          <div className="toolbar-select">
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              aria-label="Filter by year"
            >
              <option value="">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-select">
            <select
              value={speciesFilter}
              onChange={(event) => setSpeciesFilter(event.target.value)}
              aria-label="Filter by species"
            >
              <option value="">All Species</option>
              {recordSpeciesOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-row toolbar-row--dates">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="Consultation date from"
          />
          <span className="toolbar-range-sep">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="Consultation date to"
          />
        </div>

        {hasActiveRecordFilters && (
          <p className="filter-hint">
            Showing filtered results
            {dateFrom && (<> from <strong>{formatDate(dateFrom)}</strong></>)}
            {dateTo && (<>{dateFrom ? ' to' : ' from'} <strong>{formatDate(dateTo)}</strong></>)}
            {yearFilter && (<> for the year <strong>{yearFilter}</strong></>)}
            {speciesFilter && (<> of species <strong>{speciesFilter}</strong></>)}
            .
          </p>
        )}

        {flaggedRecordCount > 0 && !showLoading && (
          <p className="pr-flag-summary">
            <ShieldAlert size={15} aria-hidden="true" />
            <strong>{flaggedRecordCount}</strong> of these pets carry allergies, medication, or medical
            conditions on file.
          </p>
        )}

        {followUpCount > 0 && !showLoading && (
          <p className="pr-flag-summary pr-flag-summary--info">
            <CalendarClock size={15} aria-hidden="true" />
            <strong>{followUpCount}</strong> consultation{followUpCount !== 1 ? 's have' : ' has'} a
            scheduled follow-up.
          </p>
        )}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Owner</th>
                <th>Consultation</th>
                <th>Findings</th>
                <th>Health Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {showLoading ? (
                <tr>
                  <td colSpan="6" className="empty-state-cell">
                    <LoadingSpinner text="Loading consultation records..." fullPage={false} />
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state-cell">
                    {hasActiveRecordFilters || recordSearch.trim()
                      ? 'No consultation records match your filters.'
                      : 'No consultation records yet.'}
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record) => {
                  const pet = petById.get(Number(record.pet_id));
                  const age = formatAge(pet?.birthdate);
                  const flags = healthFlags(pet);
                  const shownFlags = flags.slice(0, 2);
                  const extraFlags = flags.length - shownFlags.length;
                  const breedLine = pet?.breed_name || pet?.species_name;

                  return (
                    <tr key={record.id}>
                      <td data-label="Pet" className="pr-pet-cell">
                        <div className="pr-pet">
                          {hasValue(pet?.photo) ? (
                            <img className="pr-pet-thumb" src={resolveMediaUrl(pet.photo)} alt="" loading="lazy" />
                          ) : (
                            <span className="pr-pet-thumb pr-pet-thumb--empty" aria-hidden="true"><PawPrint size={15} /></span>
                          )}
                          <div className="pr-pet-main">
                            <strong>{record.pet_name || pet?.name || '—'}</strong>
                            <span
                              className="pr-pet-sub"
                              title={`${record.pet_code || pet?.pet_code || '—'}${breedLine ? ` · ${breedLine}` : ''}`}
                            >
                              {record.pet_code || pet?.pet_code || '—'}
                              {breedLine ? ` · ${breedLine}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td data-label="Owner">
                        <div className="pr-owner">
                          <span>{record.owner_name || pet?.owner_name || '—'}</span>
                          <span className="pr-owner-meta">{pet?.barangay || 'No barangay'}</span>
                        </div>
                      </td>

                      <td data-label="Consultation">
                        <div className="pr-demographic">
                          <span>{formatDate(record.consultation_date)}</span>
                          {hasValue(record.vet_name) && (
                            <span className="pr-demographic-age">{record.vet_name}</span>
                          )}
                        </div>
                      </td>

                      <td data-label="Findings">
                        <div className="pr-note">
                          {hasValue(record.complaint) && (
                            <span className="pr-note-complaint">{record.complaint}</span>
                          )}
                          <span className="pr-note-text" title={record.diagnosis || ''}>
                            {record.diagnosis || 'No notes yet'}
                          </span>
                        </div>
                      </td>

                      <td data-label="Health Notes">
                        {flags.length === 0 ? (
                          <span className="pr-flag pr-flag--none">None noted</span>
                        ) : (
                          <div className="pr-flags">
                            {shownFlags.map((flag) => (
                              <span key={flag.key} className={`pr-flag pr-flag--${flag.tone}`} title={flag.label}>
                                <flag.Icon size={12} aria-hidden="true" />
                                {flagLabel(flag.key)}
                              </span>
                            ))}
                            {extraFlags > 0 && (
                              <span
                                className="pr-flag pr-flag--more"
                                title={flags.slice(2).map((f) => f.label).join(', ')}
                              >
                                +{extraFlags}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td data-label="Actions">
                        <div className="table-actions">
                          <button type="button" className="btn-primary btn-sm" onClick={() => setSelectedRecord(record)}>
                            <ClipboardList size={14} /> View
                          </button>
                          {hasValue(record.follow_up_date) && (
                            <span className="pr-followup" title={`Follow-up on ${formatDate(record.follow_up_date)}`}>
                              <CalendarClock size={12} aria-hidden="true" />
                              {formatDate(record.follow_up_date)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalRecordPages > 1 && (
          <div className="pr-pagination">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setRecordPage((current) => Math.max(1, current - 1))}
              disabled={safeRecordPage === 1}
            >
              Previous
            </button>
            <span className="pr-pagination-info">
              Page {safeRecordPage} of {totalRecordPages} · {filteredRecords.length} records
            </span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setRecordPage((current) => Math.min(totalRecordPages, current + 1))}
              disabled={safeRecordPage === totalRecordPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="logout-modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div
            className="barangay-pets-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinical-detail-title"
          >
            <div className="barangay-pets-modal-header">
              <div className="barangay-pets-modal-title">
                <div className="barangay-pets-modal-icon"><ClipboardList /></div>
                <div>
                  <h3 id="clinical-detail-title">Consultation Details</h3>
                  <p>{selectedRecord.pet_name} · {selectedRecord.owner_name}</p>
                </div>
              </div>
              <button
                type="button"
                className="barangay-modal-close"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="clinical-detail-grid">
              <div className="clinical-detail-item">
                <span>Consultation Date</span>
                <strong>{formatDate(selectedRecord.consultation_date)}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Follow-up Date</span>
                <strong>{formatDate(selectedRecord.follow_up_date)}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Recorded By</span>
                <strong>{selectedRecord.vet_name || '—'}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Saved On</span>
                <strong>{formatDate(selectedRecord.created_at)}</strong>
              </div>
            </div>

            <div className="clinical-detail-section">
              <h4>Presenting Complaint</h4>
              <p>{selectedRecord.complaint || 'No complaint recorded.'}</p>
            </div>
            <div className="clinical-detail-section">
              <h4>Diagnosis / Notes</h4>
              <p>{selectedRecord.diagnosis || 'No consultation notes recorded.'}</p>
            </div>
            <div className="clinical-detail-section">
              <h4>Treatment Plan</h4>
              <p>{selectedRecord.treatment_plan || 'No treatment plan recorded.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
