import { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Hash,
  Info,
  Package,
  PawPrint,
  Pill,
  RotateCcw,
  Shield,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';

// ─── Helpers ──────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isMedicationActive(record) {
  // A medicine record is "active" if prescribed_date is within the last 30 days
  // or if duration suggests it may still be ongoing. Since we only have prescribed_date
  // and duration (a text field, e.g. "7 days", "2 weeks"), we use a conservative
  // heuristic: prescribed within the last 60 days = potentially active.
  if (!record.prescribed_date) return false;
  const prescribed = new Date(record.prescribed_date);
  const now = new Date();
  const diffDays = Math.ceil((now - prescribed) / (1000 * 60 * 60 * 24));
  return diffDays <= 60;
}

function daysUntilFollowUp(follow_up_date) {
  if (!follow_up_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(follow_up_date);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function followUpStatus(follow_up_date) {
  if (!follow_up_date) return null;
  const days = daysUntilFollowUp(follow_up_date);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'upcoming';
}

// ─── Shared: Pet Selector ─────────────────────────────────────

function PetSelector({ petNames, selected, onChange }) {
  if (petNames.length <= 1) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.65rem',
        marginBottom: '1.75rem',
        padding: '1rem 1.25rem',
        background: 'var(--color-card)',
        borderRadius: 12,
        border: '1px solid var(--color-border)',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}
      >
        <PawPrint size={14} />
        Filter by pet:
      </span>
      <PetPill label="All Pets" active={selected === 'all'} onClick={() => onChange('all')} />
      {petNames.map((name) => (
        <PetPill
          key={name}
          label={name}
          active={selected === name}
          onClick={() => onChange(name)}
          icon
        />
      ))}
    </div>
  );
}

function PetPill({ label, active, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.4rem 1rem',
        borderRadius: 999,
        border: active ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
        background: active ? 'var(--color-primary)' : '#fff',
        color: active ? '#fff' : 'var(--color-ink)',
        fontWeight: 600,
        fontSize: '0.87rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        transition: 'all 0.15s ease',
      }}
    >
      {icon && <PawPrint size={13} />}
      {label}
    </button>
  );
}

// ─── Shared: Info field inside modal ─────────────────────────

function ModalField({ icon, label, value, wide, accent }) {
  return (
    <div
      style={{
        padding: '0.7rem 0.9rem',
        background: accent ? 'var(--color-accent-tint)' : 'var(--color-bg)',
        borderRadius: 10,
        border: `1px solid ${accent ? 'rgba(198,161,91,0.28)' : 'var(--color-border)'}`,
        gridColumn: wide ? '1 / -1' : undefined,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-text-muted)',
          marginBottom: 4,
        }}
      >
        {icon}
        {label}
      </span>
      <span
        style={{
          display: 'block',
          fontSize: '0.92rem',
          fontWeight: 600,
          color: 'var(--color-ink)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

// ─── Shared: Inline chip inside cards ─────────────────────────

function CardChip({ icon, label, value, highlight, color }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.4rem',
        padding: '0.45rem 0.65rem',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        minWidth: 0,
      }}
    >
      <span style={{ color: highlight ? color : 'var(--color-text-muted)', marginTop: 1, flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-muted)',
            marginBottom: 1,
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '0.84rem',
            fontWeight: 600,
            color: highlight ? color : 'var(--color-ink)',
            wordBreak: 'break-word',
          }}
        >
          {value || '—'}
        </span>
      </div>
    </div>
  );
}

// ─── Shared: Verified footer row ──────────────────────────────

function VerifiedRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.65rem 0.9rem',
        borderRadius: 8,
        background: 'var(--color-success-tint)',
        border: '1px solid rgba(30,122,70,0.18)',
      }}
    >
      <CheckCircle2 size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-success)' }}>
        Verified by City Veterinary Office — Cabuyao
      </span>
    </div>
  );
}

// ─── Shared: Empty filter state ───────────────────────────────

function EmptyFilter({ isFiltering, onReset, sectionLabel }) {
  return (
    <div className="draft-empty-filter">
      <div className="draft-empty-icon">
        <FileText size={22} />
      </div>
      <h3>No matching records</h3>
      <p>
        {isFiltering
          ? 'Nothing matches your search or filter. Try adjusting your criteria.'
          : `No ${sectionLabel} for this pet yet.`}
      </p>
      {isFiltering && (
        <button type="button" className="btn-secondary" onClick={onReset}>
          <RotateCcw size={15} />
          Clear Filters
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MEDICINE RECORDS SECTION
// ═══════════════════════════════════════════════════════════════

function MedicineDetailModal({ record, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!record) return null;
  const isActive = isMedicationActive(record);

  return (
    <div
      className="pet-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Medication details — ${record.medicine_name}`}
    >
      <div className="pet-modal" style={{ maxWidth: 560 }}>
        <button type="button" className="pet-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Modal header */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
            borderRadius: '14px 14px 0 0',
            margin: '-2rem -2rem 1.5rem',
            padding: '1.75rem 2rem 1.5rem',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(198,161,91,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-accent)', marginBottom: '0.85rem',
            }}
          >
            <Pill size={22} />
          </div>
          <h2 style={{ color: '#fff', margin: '0 0 0.2rem', fontSize: '1.3rem' }}>
            {record.medicine_name}
          </h2>
          <p style={{ margin: 0, color: '#f3dde1', fontSize: '0.88rem' }}>
            Prescribed for <strong>{record.pet_name}</strong>
          </p>
        </div>

        {/* Active status banner */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1.35rem',
            background: isActive ? 'var(--color-success-tint)' : 'var(--color-bg)',
            border: `1px solid ${isActive ? 'rgba(30,122,70,0.22)' : 'var(--color-border)'}`,
          }}
        >
          {isActive
            ? <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            : <Clock size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isActive ? 'var(--color-success)' : 'var(--color-text-muted)', display: 'block' }}>
              {isActive ? 'Active Medication' : 'Past Medication'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Prescribed on {fmt(record.prescribed_date)}
            </span>
          </div>
        </div>

        {/* Detail grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <ModalField icon={<Pill size={13} />} label="Medicine" value={record.medicine_name} />
          <ModalField icon={<PawPrint size={13} />} label="Pet" value={record.pet_name} />
          <ModalField icon={<Hash size={13} />} label="Dosage" value={record.dosage} />
          <ModalField icon={<Clock size={13} />} label="Frequency" value={record.frequency} />
          <ModalField icon={<Calendar size={13} />} label="Duration" value={record.duration} />
          <ModalField icon={<Package size={13} />} label="Quantity" value={record.quantity ? String(record.quantity) : null} />
          <ModalField icon={<Calendar size={13} />} label="Prescribed Date" value={fmt(record.prescribed_date)} />
          {record.prescription_id && (
            <ModalField icon={<Hash size={13} />} label="Prescription #" value={`RX-${record.prescription_id}`} />
          )}
          {record.instructions && (
            <ModalField
              icon={<ClipboardList size={13} />}
              label="Instructions"
              value={record.instructions}
              wide
              accent
            />
          )}
        </div>

        <VerifiedRow />

        <p style={{ margin: '0.85rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
          Record ID: {record.id}
        </p>
      </div>
    </div>
  );
}

function MedicineCard({ record, onViewDetails }) {
  const isActive = isMedicationActive(record);

  return (
    <div
      style={{
        background: 'var(--color-card)',
        borderRadius: 14,
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${isActive ? 'var(--color-success)' : 'var(--color-border)'}`,
        padding: '1.2rem 1.3rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 4px 14px rgba(36,20,22,0.05)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 22px rgba(36,20,22,0.09)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(36,20,22,0.05)';
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: '50%',
            background: isActive ? 'var(--color-success-tint)' : 'var(--color-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}
          aria-hidden="true"
        >
          <Pill size={20} style={{ color: isActive ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.3 }}>
              {record.medicine_name}
            </h3>
            <span
              style={{
                padding: '0.15rem 0.55rem', borderRadius: 999,
                background: isActive ? 'var(--color-success-tint)' : 'var(--color-bg)',
                color: isActive ? 'var(--color-success)' : 'var(--color-text-muted)',
                border: `1px solid ${isActive ? 'rgba(30,122,70,0.22)' : 'var(--color-border)'}`,
                fontSize: '0.72rem', fontWeight: 700,
              }}
            >
              {isActive ? 'Active' : 'Past'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
            {record.pet_name} · Prescribed {fmt(record.prescribed_date)}
          </p>
        </div>
      </div>

      {/* Chips grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.55rem' }}>
        <CardChip icon={<Hash size={12} />} label="Dosage" value={record.dosage} />
        <CardChip icon={<Clock size={12} />} label="Frequency" value={record.frequency} />
        <CardChip icon={<Calendar size={12} />} label="Duration" value={record.duration} />
        {record.quantity && (
          <CardChip icon={<Package size={12} />} label="Qty" value={String(record.quantity)} />
        )}
      </div>

      {/* Instructions preview */}
      {record.instructions && (
        <p
          style={{
            margin: 0, padding: '0.6rem 0.8rem',
            background: 'var(--color-accent-tint)',
            border: '1px solid rgba(198,161,91,0.25)',
            borderRadius: 8, fontSize: '0.84rem',
            color: 'var(--color-ink)', lineHeight: 1.5,
            display: '-webkit-box', WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2, overflow: 'hidden',
          }}
        >
          {record.instructions}
        </p>
      )}

      {/* Footer row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.75rem', paddingTop: '0.5rem',
          borderTop: '1px solid var(--color-border)', flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
          <CheckCircle2 size={13} />
          Verified
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.85rem', fontSize: '0.84rem', margin: 0 }}
          onClick={() => onViewDetails(record)}
        >
          <Info size={14} />
          View Details
        </button>
      </div>
    </div>
  );
}

function MedicineSection({ records }) {
  const [selectedPet, setSelectedPet] = useState('all');
  const [search, setSearch] = useState('');
  const [detailRecord, setDetailRecord] = useState(null);

  const petNames = useMemo(
    () => [...new Set(records.map((r) => r.pet_name).filter(Boolean))].sort(),
    [records],
  );

  const byPet = useMemo(
    () => (selectedPet === 'all' ? records : records.filter((r) => r.pet_name === selectedPet)),
    [records, selectedPet],
  );

  const active = useMemo(() => byPet.filter(isMedicationActive), [byPet]);
  const history = useMemo(() => byPet.filter((r) => !isMedicationActive(r)), [byPet]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return byPet;
    return byPet.filter((r) => {
      const hay = [r.medicine_name, r.pet_name, r.dosage, r.frequency, r.instructions]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [byPet, q]);

  const filteredActive = useMemo(() => filtered.filter(isMedicationActive), [filtered]);
  const filteredHistory = useMemo(() => filtered.filter((r) => !isMedicationActive(r)), [filtered]);

  const isFiltering = q !== '';

  function resetSearch() { setSearch(''); }

  return (
    <>
      {/* Pet selector */}
      <PetSelector petNames={petNames} selected={selectedPet} onChange={setSelectedPet} />

      {/* Summary cards */}
      <div className="summary-row" style={{ marginBottom: '1.75rem' }}>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-primary)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: '0.6rem' }}>
            <Pill size={18} />
          </div>
          <p className="summary-card-value">{byPet.length}</p>
          <p className="summary-card-label">Total Prescriptions</p>
        </div>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-success)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-success-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)', marginBottom: '0.6rem' }}>
            <CheckCircle2 size={18} />
          </div>
          <p className="summary-card-value">{active.length}</p>
          <p className="summary-card-label">Active Medications</p>
        </div>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-accent)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-accent-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '0.6rem' }}>
            <Clock size={18} />
          </div>
          <p className="summary-card-value">{history.length}</p>
          <p className="summary-card-label">Medication History</p>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="toolbar-row draft-toolbar">
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Search by medicine name, pet, or instructions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search medicine records"
          />
        </div>
        {isFiltering && (
          <button type="button" className="btn-secondary draft-toolbar-reset" onClick={resetSearch}>
            <RotateCcw size={15} />
            Reset
          </button>
        )}
      </div>

      {/* Active Medications */}
      <SectionHeading
        icon={<CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />}
        title="Active Medications"
        count={filteredActive.length}
        accentColor="var(--color-success)"
      />
      {filteredActive.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.1rem', marginBottom: '2rem' }}>
          {filteredActive.map((r) => (
            <MedicineCard key={r.id} record={r} onViewDetails={setDetailRecord} />
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: '2rem' }}>
          <EmptyFilter isFiltering={isFiltering} onReset={resetSearch} sectionLabel="active medications" />
        </div>
      )}

      {/* Medication History */}
      <SectionHeading
        icon={<Clock size={18} style={{ color: 'var(--color-text-muted)' }} />}
        title="Medication History"
        count={filteredHistory.length}
        accentColor="var(--color-text-muted)"
      />
      {filteredHistory.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.1rem', marginBottom: '1rem' }}>
          {filteredHistory.map((r) => (
            <MedicineCard key={r.id} record={r} onViewDetails={setDetailRecord} />
          ))}
        </div>
      ) : (
        <EmptyFilter isFiltering={isFiltering} onReset={resetSearch} sectionLabel="past medication records" />
      )}

      {/* Modal */}
      {detailRecord && (
        <MedicineDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CLINICAL RECORDS SECTION
// ═══════════════════════════════════════════════════════════════

function ClinicalDetailModal({ record, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!record) return null;

  const fuStatus = followUpStatus(record.follow_up_date);
  const fuDays = daysUntilFollowUp(record.follow_up_date);

  const followUpColors = {
    overdue: { color: '#DC2626', tint: '#FEF2F2', icon: <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} /> },
    soon:    { color: 'var(--color-warning)', tint: 'var(--color-warning-tint)', icon: <Clock size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} /> },
    upcoming:{ color: 'var(--color-success)', tint: 'var(--color-success-tint)', icon: <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} /> },
  };
  const fMeta = fuStatus ? followUpColors[fuStatus] : null;

  return (
    <div
      className="pet-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Consultation record — ${fmt(record.consultation_date)}`}
    >
      <div className="pet-modal" style={{ maxWidth: 600 }}>
        <button type="button" className="pet-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
            borderRadius: '14px 14px 0 0',
            margin: '-2rem -2rem 1.5rem',
            padding: '1.75rem 2rem 1.5rem',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(198,161,91,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-accent)', marginBottom: '0.85rem',
            }}
          >
            <Stethoscope size={22} />
          </div>
          <h2 style={{ color: '#fff', margin: '0 0 0.2rem', fontSize: '1.3rem' }}>
            Consultation — {fmt(record.consultation_date)}
          </h2>
          <p style={{ margin: 0, color: '#f3dde1', fontSize: '0.88rem' }}>
            {record.pet_name}
          </p>
        </div>

        {/* Follow-up banner */}
        {record.follow_up_date && fMeta && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1.25rem',
              background: fMeta.tint, border: `1px solid ${fMeta.color}33`,
            }}
          >
            {fMeta.icon}
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.87rem', color: fMeta.color, display: 'block' }}>
                {fuStatus === 'overdue'
                  ? `Follow-up overdue by ${Math.abs(fuDays)} day${Math.abs(fuDays) !== 1 ? 's' : ''}`
                  : fuStatus === 'soon'
                    ? `Follow-up in ${fuDays} day${fuDays !== 1 ? 's' : ''}`
                    : `Follow-up scheduled`}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                {fmt(record.follow_up_date)}
              </span>
            </div>
          </div>
        )}

        {/* Detail grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <ModalField icon={<PawPrint size={13} />} label="Pet" value={record.pet_name} />
          <ModalField icon={<Calendar size={13} />} label="Consultation Date" value={fmt(record.consultation_date)} />
          {record.follow_up_date && (
            <ModalField
              icon={<Calendar size={13} />}
              label="Follow-up Date"
              value={fmt(record.follow_up_date)}
              highlight={!!fuStatus}
            />
          )}
          {record.vet_id && (
            <ModalField icon={<User size={13} />} label="Veterinarian" value={record.vet_name || `Vet #${record.vet_id}`} />
          )}
          {record.diagnosis && (
            <ModalField
              icon={<Stethoscope size={13} />}
              label="Diagnosis / Assessment"
              value={record.diagnosis}
              wide
              accent
            />
          )}
          {record.treatment_plan && (
            <ModalField
              icon={<ClipboardList size={13} />}
              label="Treatment Plan"
              value={record.treatment_plan}
              wide
              accent
            />
          )}
          {record.reason_for_visit && (
            <ModalField
              icon={<FileText size={13} />}
              label="Reason for Visit"
              value={record.reason_for_visit}
              wide
            />
          )}
          {record.findings && (
            <ModalField
              icon={<FileText size={13} />}
              label="Findings"
              value={record.findings}
              wide
            />
          )}
          {record.notes && (
            <ModalField
              icon={<ClipboardList size={13} />}
              label="Notes"
              value={record.notes}
              wide
            />
          )}
        </div>

        <VerifiedRow />

        <p style={{ margin: '0.85rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
          Record ID: {record.id}
        </p>
      </div>
    </div>
  );
}

function ClinicalTimelineCard({ record, onViewDetails, isLast }) {
  const fuStatus = followUpStatus(record.follow_up_date);
  const fuDays = daysUntilFollowUp(record.follow_up_date);

  const followUpMeta = {
    overdue: { color: '#DC2626', tint: '#FEF2F2', label: `Overdue by ${fuDays !== null ? Math.abs(fuDays) : '?'}d` },
    soon:    { color: 'var(--color-warning)', tint: 'var(--color-warning-tint)', label: `Follow-up in ${fuDays}d` },
    upcoming:{ color: 'var(--color-success)', tint: 'var(--color-success-tint)', label: `Follow-up ${fmt(record.follow_up_date)}` },
  };
  const fMeta = fuStatus ? followUpMeta[fuStatus] : null;

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--color-primary-tint)',
            border: '2px solid var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-primary)', flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Stethoscope size={17} />
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--color-border)', marginTop: 4 }} />
        )}
      </div>

      {/* Card body */}
      <div
        style={{
          flex: 1, minWidth: 0,
          background: 'var(--color-card)',
          borderRadius: 14,
          border: '1px solid var(--color-border)',
          padding: '1.15rem 1.3rem',
          marginBottom: isLast ? 0 : '1rem',
          boxShadow: '0 4px 14px rgba(36,20,22,0.05)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 22px rgba(36,20,22,0.09)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(36,20,22,0.05)';
        }}
      >
        {/* Card header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          <div>
            <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)' }}>
              Consultation
            </p>
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              {fmt(record.consultation_date)}
            </h3>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              {record.pet_name}
            </p>
          </div>
          {fMeta && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.7rem', borderRadius: 999,
                background: fMeta.tint,
                border: `1px solid ${fMeta.color}33`,
                fontSize: '0.75rem', fontWeight: 700, color: fMeta.color,
                flexShrink: 0,
              }}
            >
              {fuStatus === 'overdue' ? <AlertTriangle size={12} /> : <Clock size={12} />}
              {fMeta.label}
            </div>
          )}
        </div>

        {/* Diagnosis & treatment */}
        {(record.diagnosis || record.treatment_plan) && (
          <div style={{ display: 'grid', gridTemplateColumns: record.diagnosis && record.treatment_plan ? '1fr 1fr' : '1fr', gap: '0.6rem', marginBottom: '0.85rem' }}>
            {record.diagnosis && (
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  background: 'var(--color-primary-tint)',
                  borderRadius: 8,
                  border: '1px solid rgba(200,16,46,0.1)',
                }}
              >
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                  Diagnosis
                </p>
                <p style={{ margin: 0, fontSize: '0.87rem', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.4, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                  {record.diagnosis}
                </p>
              </div>
            )}
            {record.treatment_plan && (
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  background: 'var(--color-accent-tint)',
                  borderRadius: 8,
                  border: '1px solid rgba(198,161,91,0.2)',
                }}
              >
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5c4a28' }}>
                  Treatment Plan
                </p>
                <p style={{ margin: 0, fontSize: '0.87rem', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.4, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                  {record.treatment_plan}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Meta chips row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          {record.follow_up_date && (
            <CardChip icon={<Calendar size={12} />} label="Follow-up" value={fmt(record.follow_up_date)} highlight={fuStatus === 'overdue' || fuStatus === 'soon'} color={fMeta?.color} />
          )}
          {record.vet_id && (
            <CardChip icon={<User size={12} />} label="Vet" value={record.vet_name || `Vet #${record.vet_id}`} />
          )}
        </div>

        {/* Footer row */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.75rem', paddingTop: '0.65rem',
            borderTop: '1px solid var(--color-border)', flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            Verified
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.85rem', fontSize: '0.84rem', margin: 0 }}
            onClick={() => onViewDetails(record)}
          >
            <Info size={14} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function ClinicalSection({ records }) {
  const [selectedPet, setSelectedPet] = useState('all');
  const [search, setSearch] = useState('');
  const [detailRecord, setDetailRecord] = useState(null);

  const petNames = useMemo(
    () => [...new Set(records.map((r) => r.pet_name).filter(Boolean))].sort(),
    [records],
  );

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (selectedPet !== 'all' && r.pet_name !== selectedPet) return false;
      if (q) {
        const hay = [r.pet_name, r.diagnosis, r.treatment_plan, r.reason_for_visit, r.findings, r.notes]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, selectedPet, q]);

  const isFiltering = q !== '';

  // Overall follow-up summary
  const overdueCount = useMemo(
    () => records.filter((r) => followUpStatus(r.follow_up_date) === 'overdue').length,
    [records],
  );
  const soonCount = useMemo(
    () => records.filter((r) => followUpStatus(r.follow_up_date) === 'soon').length,
    [records],
  );

  const summaryByPet = useMemo(
    () => (selectedPet === 'all' ? records : records.filter((r) => r.pet_name === selectedPet)),
    [records, selectedPet],
  );

  function resetSearch() { setSearch(''); }

  return (
    <>
      {/* Pet selector */}
      <PetSelector petNames={petNames} selected={selectedPet} onChange={setSelectedPet} />

      {/* Summary cards */}
      <div className="summary-row" style={{ marginBottom: '1.75rem' }}>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-primary)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: '0.6rem' }}>
            <Stethoscope size={18} />
          </div>
          <p className="summary-card-value">{summaryByPet.length}</p>
          <p className="summary-card-label">Total Consultations</p>
        </div>
        <div
          className="summary-card"
          style={{ borderTopColor: overdueCount > 0 ? '#DC2626' : soonCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem',
            background: overdueCount > 0 ? '#FEF2F2' : soonCount > 0 ? 'var(--color-warning-tint)' : 'var(--color-success-tint)',
            color: overdueCount > 0 ? '#DC2626' : soonCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
          }}>
            {overdueCount > 0 ? <AlertTriangle size={18} /> : <Calendar size={18} />}
          </div>
          <p className="summary-card-value" style={{
            fontSize: '1.3rem',
            color: overdueCount > 0 ? '#DC2626' : soonCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
          }}>
            {overdueCount > 0 ? 'Action Needed' : soonCount > 0 ? 'Due Soon' : 'All Clear'}
          </p>
          <p className="summary-card-label">Follow-up Status</p>
          {(overdueCount > 0 || soonCount > 0) && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {overdueCount > 0 && `${overdueCount} overdue`}
              {overdueCount > 0 && soonCount > 0 && ' · '}
              {soonCount > 0 && `${soonCount} due soon`}
            </p>
          )}
        </div>
        <div className="summary-card" style={{ borderTopColor: 'var(--color-accent)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-accent-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '0.6rem' }}>
            <Calendar size={18} />
          </div>
          <p className="summary-card-value" style={{ fontSize: '1.3rem' }}>
            {summaryByPet.length > 0 ? fmt(summaryByPet[0].consultation_date) : '—'}
          </p>
          <p className="summary-card-label">Most Recent Visit</p>
          {summaryByPet.length > 0 && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {summaryByPet[0].pet_name}
            </p>
          )}
        </div>
      </div>

      {/* Search toolbar */}
      <div className="toolbar-row draft-toolbar">
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Search by pet, diagnosis, or treatment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search consultation records"
          />
        </div>
        {isFiltering && (
          <button type="button" className="btn-secondary draft-toolbar-reset" onClick={resetSearch}>
            <RotateCcw size={15} />
            Reset
          </button>
        )}
      </div>

      {/* Record count */}
      <p style={{ margin: '0 0 1.15rem', fontSize: '0.87rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
        {filtered.length === records.length
          ? `${records.length} record${records.length !== 1 ? 's' : ''}`
          : `Showing ${filtered.length} of ${records.length} record${records.length !== 1 ? 's' : ''}`}
      </p>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div>
          {filtered.map((record, idx) => (
            <ClinicalTimelineCard
              key={record.id}
              record={record}
              onViewDetails={setDetailRecord}
              isLast={idx === filtered.length - 1}
            />
          ))}
        </div>
      ) : (
        <EmptyFilter isFiltering={isFiltering} onReset={resetSearch} sectionLabel="consultation records" />
      )}

      {/* Modal */}
      {detailRecord && (
        <ClinicalDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SHARED SECTION HEADING
// ═══════════════════════════════════════════════════════════════

function SectionHeading({ icon, title, count, accentColor }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        marginBottom: '1rem',
        paddingBottom: '0.6rem',
        borderBottom: `2px solid ${accentColor || 'var(--color-border)'}`,
      }}
    >
      {icon}
      <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-ink)' }}>
        {title}
      </h2>
      <span
        style={{
          marginLeft: 'auto',
          padding: '0.2rem 0.65rem',
          borderRadius: 999,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB BAR
// ═══════════════════════════════════════════════════════════════

function TabBar({ activeTab, onChange, medicineCount, clinicalCount }) {
  const tabs = [
    { id: 'medicine', label: 'Medicine Records', icon: <Pill size={16} />, count: medicineCount },
    { id: 'clinical', label: 'Consultation Records', icon: <Stethoscope size={16} />, count: clinicalCount },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '2rem',
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '0.35rem',
        width: 'fit-content',
      }}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: 9,
            border: 'none',
            background: activeTab === tab.id
              ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
              : 'transparent',
            color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTab === tab.id ? '0 4px 14px rgba(200,16,46,0.2)' : 'none',
          }}
        >
          {tab.icon}
          {tab.label}
          <span
            style={{
              padding: '0.1rem 0.5rem',
              borderRadius: 999,
              background: activeTab === tab.id ? 'rgba(255,255,255,0.22)' : 'var(--color-bg)',
              color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ClinicalMedicineRecords() {
  const [clinicalRecords, setClinicalRecords] = useState([]);
  const [medicineRecords, setMedicineRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('medicine');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/clinical/my-records'),
      api.get('/medicines/my-records'),
    ])
      .then(([clinicalRes, medRes]) => {
        setClinicalRecords(clinicalRes.data.records || []);
        setMedicineRecords(medRes.data.records || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load records.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner text="Loading records..." />;

  if (error) {
    return <ErrorState title="Unable to load records" message={error} onRetry={load} />;
  }

  return (
    <div className="page">
      {/* Page header */}
      <header className="draft-page-header" style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ marginBottom: '0.35rem' }}>Consultation &amp; Medicine Records</h1>
            <p className="page-intro" style={{ margin: 0 }}>
              View your pet's consultation records and prescribed medications.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.9rem',
              borderRadius: 8,
              background: 'var(--color-accent-tint)',
              border: '1px solid rgba(198,161,91,0.3)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#5c4a28',
              flexShrink: 0,
            }}
          >
            <Shield size={14} />
            Read-only view
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        medicineCount={medicineRecords.length}
        clinicalCount={clinicalRecords.length}
      />

      {/* Tab panels */}
      {activeTab === 'medicine' && (
        <>
          {medicineRecords.length === 0 ? (
            <div className="draft-empty-filter" style={{ minHeight: '45vh', justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="draft-empty-icon"><Pill size={26} /></div>
              <h3>No Medicine Records</h3>
              <p>Prescribed medications will appear here once the veterinary office records them for your pet.</p>
            </div>
          ) : (
            <MedicineSection records={medicineRecords} />
          )}
        </>
      )}

      {activeTab === 'clinical' && (
        <>
          {clinicalRecords.length === 0 ? (
            <div className="draft-empty-filter" style={{ minHeight: '45vh', justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="draft-empty-icon"><Stethoscope size={26} /></div>
              <h3>No Consultation Records</h3>
              <p>Consultation records will appear here once the veterinary office adds them for your pet.</p>
            </div>
          ) : (
            <ClinicalSection records={clinicalRecords} />
          )}
        </>
      )}
    </div>
  );
}
