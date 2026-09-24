import toast from 'react-hot-toast';

export const OFFLINE_TOAST_ID = 'offline-status';

const TONES = {
  offline: {
    color: '#b45309',
    background: '#fef3c7',
    border: '#f59e0b',
  },
  online: {
    color: '#15803d',
    background: '#dcfce7',
    border: '#22c55e',
  },
  info: {
    color: '#1f2937',
    background: '#ffffff',
    border: '#e5e7eb',
  },
};

export function showPersistentToast(message, { tone = 'info', id = OFFLINE_TOAST_ID } = {}) {
  const colors = TONES[tone] || TONES.info;
  toast.custom(
    (t) => (
      <div
        role="alert"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          background: colors.background,
          color: colors.color,
          borderLeft: `4px solid ${colors.border}`,
          borderRadius: '10px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.14)',
          maxWidth: '360px',
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateX(0)' : 'translateX(16px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          fontFamily: 'inherit',
          fontSize: '14px',
          lineHeight: '1.4',
          fontWeight: 500,
        }}
      >
        <div style={{ flex: '1', minWidth: 0 }}>{message}</div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          style={{
            flexShrink: 0,
            padding: '6px 16px',
            borderRadius: '9999px',
            border: 'none',
            background: colors.border,
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Okay
        </button>
      </div>
    ),
    { id, duration: Infinity, position: 'top-right' }
  );
}