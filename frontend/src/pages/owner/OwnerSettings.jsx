import { useEffect, useState } from 'react';
import { KeyRound, Save, User } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';

// Barangay list (mirrors backend constant — read-only on frontend)
const CABUYAO_BARANGAYS = [
  'Baclaran','Banaybanay','Banlic','Bigaa','Butong','Casile','Diezmo',
  'Gulod','Mamatid','Marinig','Niugan','Pittland','Pulo','Sala','San Isidro',
  'Barangay Uno (Pob.)','Barangay Dos (Pob.)','Barangay Tres (Pob.)',
];

// ─── Reusable profile form ─────────────────────────────────────

export function ProfileForm({ compact = false, onSaved }) {
  const { user, setUser } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState({ text: '', ok: true });

  const [form, setForm] = useState({
    full_name: '', email: '', contact_number: '', address: '', barangay: '',
  });

  function load() {
    setLoading(true);
    setError('');
    api.get('/owner/profile')
      .then((res) => {
        const p = res.data.profile;
        setProfile(p);
        setForm({
          full_name:      p.full_name      || '',
          email:          p.email          || '',
          contact_number: p.contact_number || '',
          address:        p.address        || '',
          barangay:       p.barangay       || '',
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load profile.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMsg({ text: '', ok: true });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', ok: true });
    try {
      await api.put('/owner/profile', form);
      // Sync AuthContext so topbar greeting updates immediately
      if (setUser) setUser((prev) => ({ ...prev, full_name: form.full_name, email: form.email }));
      setMsg({ text: 'Profile saved successfully.', ok: true });
      if (onSaved) onSaved();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Could not save profile.', ok: false });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner text="Loading profile…" fullPage={false} />;
  if (error)   return <ErrorState title="Could not load profile" message={error} onRetry={load} />;

  return (
    <form onSubmit={handleSave} noValidate>
      <div className="settings-field">
        <label htmlFor="sf-name">Full Name</label>
        <input
          id="sf-name"
          type="text"
          value={form.full_name}
          onChange={(e) => set('full_name', e.target.value)}
          placeholder="Your full name"
          required
        />
      </div>

      <div className="settings-field">
        <label htmlFor="sf-email">Email Address</label>
        <input
          id="sf-email"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>

      <div className="settings-field">
        <label htmlFor="sf-contact">Contact Number</label>
        <input
          id="sf-contact"
          type="tel"
          value={form.contact_number}
          onChange={(e) => set('contact_number', e.target.value)}
          placeholder="09XXXXXXXXX"
        />
      </div>

      {!compact && (
        <div className="settings-field">
          <label htmlFor="sf-address">Address</label>
          <input
            id="sf-address"
            type="text"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="House / Street / Subdivision"
          />
        </div>
      )}

      <div className="settings-field">
        <label htmlFor="sf-barangay">Barangay</label>
        <select
          id="sf-barangay"
          value={form.barangay}
          onChange={(e) => set('barangay', e.target.value)}
        >
          <option value="">— Select Barangay —</option>
          {CABUYAO_BARANGAYS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {msg.text && (
        <p className={`settings-msg settings-msg--${msg.ok ? 'ok' : 'err'}`}>
          {msg.text}
        </p>
      )}

      <div className="settings-actions">
        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{ marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Save size={15} />
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}

// ─── Password change form ──────────────────────────────────────

export function PasswordForm({ onSaved }) {
  const [form, setForm]   = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState({ text: '', ok: true });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMsg({ text: '', ok: true });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setMsg({ text: 'New passwords do not match.', ok: false });
      return;
    }
    if (form.new_password.length < 8) {
      setMsg({ text: 'New password must be at least 8 characters.', ok: false });
      return;
    }
    setSaving(true);
    setMsg({ text: '', ok: true });
    try {
      await api.put('/owner/password', form);
      setMsg({ text: 'Password changed successfully.', ok: true });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      if (onSaved) onSaved();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Could not change password.', ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <div className="settings-field">
        <label htmlFor="pw-current">Current Password</label>
        <input
          id="pw-current"
          type="password"
          value={form.current_password}
          onChange={(e) => set('current_password', e.target.value)}
          placeholder="Enter current password"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="settings-field">
        <label htmlFor="pw-new">New Password</label>
        <input
          id="pw-new"
          type="password"
          value={form.new_password}
          onChange={(e) => set('new_password', e.target.value)}
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
        />
      </div>

      <div className="settings-field">
        <label htmlFor="pw-confirm">Confirm New Password</label>
        <input
          id="pw-confirm"
          type="password"
          value={form.confirm_password}
          onChange={(e) => set('confirm_password', e.target.value)}
          placeholder="Repeat new password"
          required
          autoComplete="new-password"
        />
      </div>

      {msg.text && (
        <p className={`settings-msg settings-msg--${msg.ok ? 'ok' : 'err'}`}>
          {msg.text}
        </p>
      )}

      <div className="settings-actions">
        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{ marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <KeyRound size={15} />
          {saving ? 'Saving…' : 'Change Password'}
        </button>
      </div>
    </form>
  );
}

// ─── Settings page ─────────────────────────────────────────────

export default function OwnerSettings() {
  return (
    <div className="page owner-settings">
      <header className="draft-page-header" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ marginBottom: '0.35rem' }}>Account Settings</h1>
            <p className="page-intro" style={{ margin: 0 }}>
              Manage your profile information and password.
            </p>
          </div>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.5rem 0.9rem', borderRadius: 8,
              background: 'var(--color-accent-tint)',
              border: '1px solid rgba(198,161,91,0.3)',
              fontSize: '0.8rem', fontWeight: 600, color: '#5c4a28', flexShrink: 0,
            }}
          >
            <User size={14} />
            Pet Owner Account
          </div>
        </div>
      </header>

      <div className="settings-grid">
        {/* Profile card */}
        <div className="settings-card">
          <h2>Profile Information</h2>
          <p className="settings-card-desc">Update your name, email, contact details, and barangay.</p>
          <ProfileForm />
        </div>

        {/* Password card */}
        <div className="settings-card" style={{ borderTopColor: 'var(--color-accent)' }}>
          <h2>Change Password</h2>
          <p className="settings-card-desc">Choose a strong password with at least 8 characters.</p>
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
