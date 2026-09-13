import { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Hash,
  Info,
  PawPrint,
  RotateCcw,
  Shield,
  ShieldCheck,
  Syringe,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';

// ─── helpers ────────────────────────────────────────────────

function computeStatus(next_due_date) {
  if (!next_due_date) return 'Updated';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(next_due_date);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Overdue';
  if (diffDays <= 30) return 'Due Soon';
  return 'Updated';
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntilDue(next_due_date) {
  if (!next_due_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(next_due_date);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// ─── status icon + color ─────────────────────────────────────

const STATUS_META = {
  Updated: {
    icon: ShieldCheck,
    color: 'var(--color-success)',
    tint: 'var(--color-success-tint)',
    label: 'Up-to-Date',
  },
  'Due Soon': {
    icon: Clock,
    color: 'var(--color-warning)',
    tint: 'var(--color-warning-tint)',
    label: 'Due Soon',
  },
  Overdue: {
    icon: AlertTriangle,
    color: '#DC2626',
    tint: '#FEF2F2',
    label: 'Overdue',
  },
};

function StatusIcon({ status, size = 18 }) {
  const meta = STATUS_META[status] || STATUS_META['Updated'];
  const Icon = meta.icon;
  return <Icon size={size} style={{ color: meta.color, flexShrink: 0 }} />;
}

// ─── View Details Modal ──────────────────────────────────────

function VaccineDetailModal({ record, onClose }) {
  if (!record) return null;

  const status = computeStatus(record.next_due_date);
  const meta = STATUS_META[status] || STATUS_META['Updated'];
  const days = daysUntilDue(record.next_due_date);

  // Close on backdrop click
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="pet-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Vaccination details for ${record.vaccine_name}`}
    >
      <div className="pet-modal" style={{ maxWidth: 560 }}>
        {/* Close button */}
        <button
          type="button"
          className="pet-modal-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={18} />
        </button>

        {/* Modal header */}
        <div
          style={{
            background: `linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))`,
            borderRadius: '14px 14px 0 0',
            margin: '-2rem -2rem 1.5rem',
            padding: '1.75rem 2rem 1.5rem',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(198,161,91,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              marginBottom: '0.85rem',
            }}
          >
            <Syringe size={22} />
          </div>
          <h2 style={{ color: '#fff', margin: '0 0 0.25rem', fontSize: '1.35rem' }}>
            {record.vaccine_name}
          </h2>
          <p style={{ margin: 0, color: '#f3dde1', fontSize: '0.9rem' }}>
            {record.pet_name}
          </p>
        </div>

        {/* Status banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.8rem 1rem',
            borderRadius: 10,
            background: meta.tint,
            border: `1px solid ${meta.color}33`,
            marginBottom: '1.5rem',
          }}
        >
          <StatusIcon status={status} size={20} />
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontWeight: 700,
                color: meta.color,
                fontSize: '0.9rem',
                display: 'block',
              }}
            >
              {meta.label}
            </span>
            {status === 'Updated' && !record.next_due_date && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                No next due date recorded
              </span>
            )}
            {status === 'Updated' && record.next_due_date && days !== null && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Next dose due in {days} day{days !== 1 ? 's' : ''}
              </span>
            )}
            {status === 'Due Soon' && days !== null && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {days === 0 ? 'Due today' : `Due in ${days} day${days !== 1 ? 's' : ''}`}
              </span>
            )}
            {status === 'Overdue' && days !== null && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} overdue
              </span>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Detail fields */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          <DetailField
            icon={<Syringe size={14} />}
            label="Vaccine"
            value={record.vaccine_name}
          />
          <DetailField
            icon={<PawPrint size={14} />}
            label="Pet"
            value={record.pet_name}
          />
          <DetailField
            icon={<Calendar size={14} />}
            label="Date Administered"
            value={fmt(record.date_administered)}
          />
          <DetailField
            icon={<Calendar size={14} />}
            label="Next Due Date"
            value={record.next_due_date ? fmt(record.next_due_date) : 'As soon as possible'}
          />
          {record.vaccine_type && (
            <DetailField
              icon={<Hash size={14} />}
              label="Vaccine Type"
              value={record.vaccine_type}
            />
          )}
          {record.batch_number && (
            <DetailField
              icon={<Hash size={14} />}
              label="Batch No."
              value={record.batch_number}
            />
          )}
        </div>

        {/* Administered by */}
        {record.administered_by_name || record.administered_by ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              background: 'var(--color-bg)',
              borderRadius: 10,
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--color-primary-tint)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={16} />
            </span>
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-muted)',
                  marginBottom: 2,
                }}
              >
                Administered By
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                {record.administered_by_name || `Staff #${record.administered_by}`}
              </span>
            </div>
          </div>
        ) : null}

        {/* Comments */}
        {record.comments && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--color-accent-tint)',
              border: '1px solid rgba(198,161,91,0.28)',
              borderRadius: 10,
              marginBottom: '1rem',
            }}
          >
            <p
              style={{
                margin: '0 0 0.3rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
              }}
            >
              Notes
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '0.92rem',
                lineHeight: 1.55,
                color: 'var(--color-ink)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {record.comments}
            </p>
          </div>
        )}

        {/* Verified badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1rem',
            borderRadius: 10,
            background: 'var(--color-success-tint)',
            border: '1px solid rgba(30,122,70,0.2)',
            marginBottom: '1.25rem',
          }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-success)' }}>
            Verified by City Veterinary Office — Cabuyao
          </span>
        </div>

        {/* Record ID */}
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textAlign: 'right',
          }}
        >
          Record ID: {record.id}
        </p>
      </div>
    </div>
  );
}

function DetailField({ icon, label, value }) {
  return (
    <div
      style={{
        padding: '0.7rem 0.85rem',
        background: 'var(--color-bg)',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.7rem',
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
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

// ─── Vaccination Record Card ─────────────────────────────────

function VaccineRecordCard({ record, onViewDetails }) {
  const status = computeStatus(record.next_due_date);
  const meta = STATUS_META[status] || STATUS_META['Updated'];
  const days = daysUntilDue(record.next_due_date);

  let dueLabel = null;
  if (status === 'Overdue') {
    dueLabel = `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  } else if (status === 'Due Soon') {
    dueLabel = days === 0 ? 'Due today' : `Due in ${days} day${days !== 1 ? 's' : ''}`;
  } else if (record.next_due_date && days !== null) {
    dueLabel = `Next in ${days} day${days !== 1 ? 's' : ''}`;
  }

  return (
    <div
      style={{
        background: 'var(--color-card)',
        borderRadius: 14,
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${meta.color}`,
        padding: '1.25rem 1.35rem',
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
      {/* Card top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Status icon circle */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: meta.tint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
          aria-hidden="true"
        >
          <StatusIcon status={status} size={20} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '0.15rem',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-ink)',
                lineHeight: 1.3,
              }}
            >
              {record.vaccine_name}
            </h3>
            <StatusBadge status={status} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.84rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {record.pet_name}
          </p>
        </div>
      </div>

      {/* Info chips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.6rem',
        }}
      >
        <InfoChip
          icon={<Calendar size={13} />}
          label="Date Given"
          value={fmt(record.date_administered)}
        />
        <InfoChip
          icon={<Calendar size={13} />}
          label="Next Due"
          value={record.next_due_date ? fmt(record.next_due_date) : 'As soon as possible'}
          highlight={status !== 'Updated'}
          highlightColor={meta.color}
        />
        {(record.administered_by_name || record.administered_by) && (
          <InfoChip
            icon={<User size={13} />}
            label="Vet / Office"
            value={record.administered_by_name || `Staff #${record.administered_by}`}
          />
        )}
      </div>

      {/* Due label + CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--color-border)',
          flexWrap: 'wrap',
        }}
      >
        {/* Due pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.7rem',
              borderRadius: 999,
              background: meta.tint,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: meta.color,
            }}
          >
            <StatusIcon status={status} size={13} />
            {dueLabel || 'No upcoming dose'}
          </div>
          {/* Verified check */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              color: 'var(--color-success)',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={13} />
            Verified
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.85rem',
            margin: 0,
          }}
          onClick={() => onViewDetails(record)}
        >
          <Info size={14} />
          View Details
        </button>
      </div>
    </div>
  );
}

function InfoChip({ icon, label, value, highlight, highlightColor }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.45rem',
        padding: '0.5rem 0.7rem',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
      }}
    >
      <span
        style={{
          color: highlight ? highlightColor : 'var(--color-text-muted)',
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-muted)',
            marginBottom: 2,
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: highlight ? highlightColor : 'var(--color-ink)',
            wordBreak: 'break-word',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ─── Pet Selector ─────────────────────────────────────────────

function PetSelector({ pets, selectedPet, onChange }) {
  if (pets.length <= 1) return null;

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

      {/* All pets button */}
      <button
        type="button"
        onClick={() => onChange('all')}
        style={{
          padding: '0.45rem 1rem',
          borderRadius: 999,
          border: selectedPet === 'all'
            ? '2px solid var(--color-primary)'
            : '1.5px solid var(--color-border)',
          background: selectedPet === 'all' ? 'var(--color-primary)' : '#fff',
          color: selectedPet === 'all' ? '#fff' : 'var(--color-ink)',
          fontWeight: 600,
          fontSize: '0.88rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        All Pets
      </button>

      {pets.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 999,
            border: selectedPet === name
              ? '2px solid var(--color-primary)'
              : '1.5px solid var(--color-border)',
            background: selectedPet === name ? 'var(--color-primary)' : '#fff',
            color: selectedPet === name ? '#fff' : 'var(--color-ink)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <PawPrint size={13} />
          {name}
        </button>
      ))}
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────

function SummaryCards({ records }) {
  const total = records.length;
  const overdue = records.filter((r) => computeStatus(r.next_due_date) === 'Overdue').length;
  const dueSoon = records.filter((r) => computeStatus(r.next_due_date) === 'Due Soon').length;
  const upToDate = records.filter((r) => computeStatus(r.next_due_date) === 'Updated').length;

  // Overall status label
  let overallStatus = 'Up-to-Date';
  let overallColor = 'var(--color-success)';
  let overallTint = 'var(--color-success-tint)';
  let OverallIcon = ShieldCheck;
  if (overdue > 0) {
    overallStatus = 'Action Required';
    overallColor = '#DC2626';
    overallTint = '#FEF2F2';
    OverallIcon = AlertTriangle;
  } else if (dueSoon > 0) {
    overallStatus = 'Due Soon';
    overallColor = 'var(--color-warning)';
    overallTint = 'var(--color-warning-tint)';
    OverallIcon = Clock;
  }

  // Nearest upcoming due date
  const upcoming = records
    .filter((r) => r.next_due_date)
    .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date))[0];
  const nextDueDisplay = upcoming ? fmt(upcoming.next_due_date) : '—';
  const nextDuePet = upcoming ? upcoming.pet_name : null;

  return (
    <div className="summary-row" style={{ marginBottom: '1.75rem' }}>
      {/* Total Vaccines */}
      <div
        className="summary-card"
        style={{ borderTopColor: 'var(--color-primary)' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.6rem',
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'var(--color-primary-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <Syringe size={18} />
          </span>
        </div>
        <p className="summary-card-value">{total}</p>
        <p className="summary-card-label">Total Vaccines</p>
        {total > 0 && (
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {upToDate} up-to-date · {dueSoon} due soon · {overdue} overdue
          </p>
        )}
      </div>

      {/* Vaccination Status */}
      <div
        className="summary-card"
        style={{ borderTopColor: overallColor }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.6rem',
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: overallTint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: overallColor,
            }}
          >
            <OverallIcon size={18} />
          </span>
        </div>
        <p
          className="summary-card-value"
          style={{ fontSize: '1.35rem', color: overallColor }}
        >
          {overallStatus}
        </p>
        <p className="summary-card-label">Overall Status</p>
        {total > 0 && (
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {overdue > 0 ? `${overdue} vaccine${overdue !== 1 ? 's' : ''} need attention` : 'All vaccines recorded'}
          </p>
        )}
      </div>

      {/* Next Due Date */}
      <div
        className="summary-card"
        style={{ borderTopColor: 'var(--color-accent)' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.6rem',
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'var(--color-accent-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <Calendar size={18} />
          </span>
        </div>
        <p className="summary-card-value" style={{ fontSize: '1.4rem' }}>
          {nextDueDisplay}
        </p>
        <p className="summary-card-label">Next Due Date</p>
        {nextDuePet && (
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
            }}
          >
            for {nextDuePet}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Legend strip ─────────────────────────────────────────────

function StatusLegend() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.65rem',
        marginBottom: '1.25rem',
        alignItems: 'center',
      }}
    >
      {Object.entries(STATUS_META).map(([key, meta]) => {
        const Icon = meta.icon;
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.75rem',
              borderRadius: 999,
              background: meta.tint,
              border: `1px solid ${meta.color}33`,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: meta.color,
            }}
          >
            <Icon size={13} />
            {meta.label}
          </div>
        );
      })}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.75rem',
          borderRadius: 999,
          background: 'var(--color-success-tint)',
          border: '1px solid rgba(30,122,70,0.2)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--color-success)',
        }}
      >
        <CheckCircle2 size={13} />
        Verified
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function VaccinationHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedPet, setSelectedPet] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailRecord, setDetailRecord] = useState(null);

  const loadRecords = () => {
    setLoading(true);
    setError('');
    api
      .get('/vaccinations/my-history')
      .then((res) => setRecords(res.data.records || []))
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load vaccination records.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Unique sorted pet names for selector
  const petNames = useMemo(
    () => [...new Set(records.map((r) => r.pet_name).filter(Boolean))].sort(),
    [records],
  );

  // Filtered records based on pet, search, status
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (selectedPet !== 'all' && r.pet_name !== selectedPet) return false;
      if (statusFilter !== 'all' && computeStatus(r.next_due_date) !== statusFilter) return false;
      if (q) {
        const hay = [r.vaccine_name, r.pet_name, r.comments].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, selectedPet, search, statusFilter]);

  // Summary card records: filtered by pet only (not search/status)
  const summaryRecords = useMemo(
    () => (selectedPet === 'all' ? records : records.filter((r) => r.pet_name === selectedPet)),
    [records, selectedPet],
  );

  const isFiltering = search.trim() !== '' || statusFilter !== 'all';

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  // ── Render states ──────────────────────────────────────────

  if (loading) return <LoadingSpinner text="Loading vaccination records..." />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load records"
        message={error}
        onRetry={loadRecords}
      />
    );
  }

  if (records.length === 0) {
    return (
      <div className="page">
        <header className="draft-page-header">
          <div>
            <h1>Vaccination History</h1>
            <p className="page-intro">View your pet's vaccination records and upcoming due dates.</p>
          </div>
        </header>
        <div className="draft-empty-filter" style={{ minHeight: '55vh', justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="draft-empty-icon">
            <Syringe size={26} />
          </div>
          <h3>No Vaccination Records</h3>
          <p>Your vaccination history will appear here once the veterinary office records a vaccine for your pet.</p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────

  return (
    <>
      <div className="page">
        {/* Page header */}
        <header className="draft-page-header">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h1 style={{ marginBottom: '0.35rem' }}>Vaccination History</h1>
              <p className="page-intro" style={{ margin: 0 }}>
                View your pet's vaccination records and upcoming due dates.
              </p>
            </div>
            {/* Read-only notice */}
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

        {/* Pet selector (only shown if multiple pets) */}
        <PetSelector
          pets={petNames}
          selectedPet={selectedPet}
          onChange={setSelectedPet}
        />

        {/* Summary cards */}
        <SummaryCards records={summaryRecords} />

        {/* Toolbar */}
        <div className="toolbar-row draft-toolbar">
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Search by vaccine name or pet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search vaccination records"
            />
          </div>

          <div className="toolbar-select">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="Updated">Up-to-Date</option>
              <option value="Due Soon">Due Soon</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {isFiltering && (
            <button
              type="button"
              className="btn-secondary draft-toolbar-reset"
              onClick={resetFilters}
            >
              <RotateCcw size={16} />
              Reset
            </button>
          )}
        </div>

        {/* Status legend */}
        <StatusLegend />

        {/* Record count */}
        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '0.88rem',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
          }}
        >
          {filteredRecords.length === records.length
            ? `${records.length} record${records.length !== 1 ? 's' : ''}`
            : `Showing ${filteredRecords.length} of ${records.length} record${records.length !== 1 ? 's' : ''}`}
        </p>

        {/* Records grid / empty filter state */}
        {filteredRecords.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '1.15rem',
            }}
          >
            {filteredRecords.map((record) => (
              <VaccineRecordCard
                key={record.id}
                record={record}
                onViewDetails={setDetailRecord}
              />
            ))}
          </div>
        ) : (
          <div className="draft-empty-filter">
            <div className="draft-empty-icon">
              <FileText size={22} />
            </div>
            <h3>No matching records</h3>
            <p>
              {isFiltering
                ? 'Nothing matches your search or filter. Try adjusting your criteria.'
                : 'No vaccination records for this pet yet.'}
            </p>
            {isFiltering && (
              <button type="button" className="btn-secondary" onClick={resetFilters}>
                <RotateCcw size={16} />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {detailRecord && (
        <VaccineDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </>
  );
}
