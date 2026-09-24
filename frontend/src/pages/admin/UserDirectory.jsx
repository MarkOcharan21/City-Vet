import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import useMinLoading from '../../hooks/useMinLoading';
import { validateStaffUserCreation, CREATABLE_STAFF_ROLES } from '../../utils/validation';
import {
  Search, Eye, UserX, UserCheck, X, UserRound, CheckCircle2, Clock, Trash2,
} from 'lucide-react';
import FieldError from '../../components/ui/FieldError';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SuccessModal from '../../components/ui/SuccessModal';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(status) {
  if (status === 'pending') return 'Pending Setup';
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  return status || '—';
}

export default function UserDirectory() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', role_name: 'Staff' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [pendingDeactivate, setPendingDeactivate] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [pendingResend, setPendingResend] = useState(null);
  const [resending, setResending] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [successModal, setSuccessModal] = useState({ open: false, title: '', message: '' });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { user: currentUser } = useAuth();

  async function loadUsers() {
    setLoading(true);
    setError('');

    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      setError('Unable to load users. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  const roleOptions = useMemo(() => Array.from(new Set(users.map((u) => u.role_name).filter(Boolean))), [users]);
  const statusOptions = useMemo(() => Array.from(new Set(users.map((u) => u.status).filter(Boolean))), [users]);

  const shownUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        `${u.full_name || ''} ${u.email || ''} ${u.account_id || ''}`.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'All' || `${u.role_name}s` === roleFilter;
      const matchesStatus = statusFilter === 'All' || statusLabel(u.status) === statusFilter;
      let matchesDate = true;
      if (u.last_login) {
        const loginDate = new Date(u.last_login);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (loginDate < fromDate) matchesDate = false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (loginDate > toDate) matchesDate = false;
        }
      } else if (dateFrom || dateTo) {
        matchesDate = false;
      }
      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });
  }, [users, search, roleFilter, statusFilter, dateFrom, dateTo]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    setFieldErrors({});

    const validation = validateStaffUserCreation(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }

    setSaving(true);

    try {
      const res = await api.post('/users', form);
      setCreatedAccount({
        account_id: res.data.account_id || '—',
        email: res.data.email || form.email,
        role: form.role_name,
      });
      setForm({ full_name: '', email: '', role_name: 'Staff' });
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account.');
    } finally {
      setSaving(false);
    }
  }

  function requestDeactivate(user) {
    setError('');
    setPendingDeactivate(user);
  }

  async function confirmDeactivate() {
    if (!pendingDeactivate) return;
    setUpdating(true);
    setError('');

    try {
      await api.put(`/users/${pendingDeactivate.id}/status`, { status: 'inactive' });
      await loadUsers();
      setSuccessModal({
        open: true,
        title: 'Account Deactivated',
        message: `${pendingDeactivate.full_name || pendingDeactivate.email} can no longer sign in until reactivated.`,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to deactivate account.');
    } finally {
      setUpdating(false);
      setPendingDeactivate(null);
    }
  }

  async function reactivate(user) {
    setError('');
    setUpdating(true);

    try {
      await api.put(`/users/${user.id}/status`, { status: 'active' });
      await loadUsers();
      setSuccessModal({
        open: true,
        title: 'Account Reactivated',
        message: `${user.full_name || user.email} can sign in again.`,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to activate account.');
    } finally {
      setUpdating(false);
    }
  }

  async function resendSetup(user) {
    setError('');
    setResending(true);

    try {
      const res = await api.post(`/users/${user.id}/resend-setup`);
      setSuccessModal({
        open: true,
        title: 'Setup Email Resent',
        message:
          'A fresh one-time setup link was sent to ' +
          (res.data.email || user.email) +
          '. The new link expires in 10 minutes and the previous link is now invalid.',
      });
      setPendingResend(null);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to resend the setup email.');
      setPendingResend(null);
    } finally {
      setResending(false);
    }
  }

  function requestDelete(user) {
    setError('');
    setPendingDelete(user);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');

    try {
      await api.delete(`/users/${pendingDelete.id}`);
      await loadUsers();
      setSuccessModal({
        open: true,
        title: 'Account Deleted',
        message: `${pendingDelete.full_name || pendingDelete.email}'s account has been deleted. Their pet and medical records are retained for the clinic.`,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete account.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const dateFilterLabel = (dateFrom || dateTo) ? ` · ${dateFrom ? dateFrom : 'start'} to ${dateTo ? dateTo : 'now'}` : '';
  const countLabel = loading ? 'Loading users...' : `${shownUsers.length} of ${users.length} users${dateFilterLabel}`;
  const allUsersCount = users.length;

  return (
    <div className="page">
      <h1>User Directory</h1>
      <p>System Users — everyone in the system, from pet owners to clinic staff and admin.</p>

      <div className="form-card user-directory-card">
        <div className="form-card-header">
          <h2>User Account Setup</h2>
          <p>
            Create a Staff or Veterinarian account. A one-time setup link will be emailed automatically — no
            temporary password is set here.
          </p>
        </div>

        <form onSubmit={handleCreate} className="inline-form user-directory-form validated-form">
          <div className="validated-field">
            <input name="full_name" type="text" value={form.full_name} onChange={handleChange} placeholder="Full Name" required />
            <FieldError message={fieldErrors.full_name} />
          </div>
          <div className="validated-field">
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" required />
            <FieldError message={fieldErrors.email} />
          </div>
          <div className="validated-field">
            <select name="role_name" value={form.role_name} onChange={handleChange}>
              {CREATABLE_STAFF_ROLES.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <FieldError message={fieldErrors.role_name} />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>

      <div className="page-card user-directory-table-card">
        <div className="table-header-row">
          <div>
            <h2>User Directory</h2>
            <p className="page-intro">All accounts in the system, including staff, veterinarians, and admins.</p>
          </div>
          <div className="table-meta">{countLabel}</div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search name, email, or account ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="toolbar-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All</option>
            {roleOptions.map((role) => (
              <option key={role}>{role}s</option>
            ))}
          </select>
          <select className="toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            {statusOptions.map((status) => (
              <option key={status}>{statusLabel(status)}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="date"
              className="toolbar-select"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '140px', padding: '0.4rem 0.75rem' }}
              title="From date"
            />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>to</span>
            <input
              type="date"
              className="toolbar-select"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '140px', padding: '0.4rem 0.75rem' }}
              title="To date"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Account ID</th><th>Name / Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6"><LoadingSpinner text="Loading users..." fullPage={false} /></td>
                </tr>
              ) : shownUsers.length === 0 ? (
                <tr>
                  <td colSpan="6">No users match your filters.</td>
                </tr>
              ) : (
                shownUsers.map((u) => (
                  <tr key={u.id}>
                    <td><span className="account-id-cell">{u.account_id || '—'}</span></td>
                    <td>
                      <div>{u.full_name || '—'}</div>
                      <div className="table-subtext">{u.email}</div>
                    </td>
                    <td>{u.role_name}</td>
                    <td><StatusBadge status={statusLabel(u.status)} /></td>
                    <td>{formatDate(u.last_login)}</td>
                      <td className="user-directory-actions" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                        <button className="btn-icon-action" onClick={() => setDetailUser(u)} title="View" style={{ width: '32px', height: '32px', padding: 0 }}>
                          <Eye size={14} />
                        </button>
                        {u.status === 'pending' ? (
                          <button className="btn-icon-action" onClick={() => setPendingResend(u)} title="Resend Setup" style={{ width: '32px', height: '32px', padding: 0 }}>
                            <Clock size={14} />
                          </button>
                        ) : u.status === 'active' ? (
                          <button className="btn-icon-action btn-icon-action--danger" onClick={() => requestDeactivate(u)} title="Deactivate" style={{ width: '32px', height: '32px', padding: 0 }}>
                            <UserX size={14} />
                          </button>
                        ) : (
                          <button className="btn-icon-action" onClick={() => reactivate(u)} title="Activate" style={{ width: '32px', height: '32px', padding: 0 }}>
                            <UserCheck size={14} />
                          </button>
                        )}
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account details modal */}
      <div className={`account-detail-modal ${detailUser ? 'open' : ''}`}>
        <div className="account-detail-modal-box">
          <button className="account-detail-close" onClick={() => setDetailUser(null)} aria-label="Close">
            <X size={18} />
          </button>
          {detailUser && (
            <>
              <div className="account-detail-title">
                <UserRound size={20} />
                <h3>Account Details</h3>
              </div>
              <div className="account-details">
                <div className="account-details-row"><span>Full Name</span><strong>{detailUser.full_name || '—'}</strong></div>
                <div className="account-details-row"><span>Email</span><strong>{detailUser.email}</strong></div>
                <div className="account-details-row"><span>User ID</span><strong>{detailUser.account_id || '—'}</strong></div>
                <div className="account-details-row"><span>Role</span><strong>{detailUser.role_name}</strong></div>
                <div className="account-details-row"><span>Account Status</span><strong><StatusBadge status={statusLabel(detailUser.status)} /></strong></div>
                <div className="account-details-row"><span>Created Date</span><strong>{formatDate(detailUser.created_at)}</strong></div>
                <div className="account-details-row"><span>Last Login</span><strong>{formatDate(detailUser.last_login)}</strong></div>
              </div>
              <div className="account-details-actions">
                {detailUser.status === 'pending' ? (
                  <button className="btn-secondary" onClick={() => { setPendingResend(detailUser); setDetailUser(null); }}>
                    Resend Setup Email
                  </button>
                ) : detailUser.status === 'active' ? (
                  <button className="danger-btn" onClick={() => { requestDeactivate(detailUser); setDetailUser(null); }}>
                    Deactivate Account
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => { reactivate(detailUser); setDetailUser(null); }}>
                    Reactivate Account
                  </button>
                )}
                <button className="btn-secondary" onClick={() => setDetailUser(null)}>
                  Close
                </button>
                {detailUser.id !== currentUser?.id && (
                  <button
                    className="btn-icon-action btn-icon-action--danger"
                    onClick={() => { requestDelete(detailUser); setDetailUser(null); }}
                    title="Delete Account"
                    aria-label="Delete Account"
                    style={{ width: '34px', height: '34px', padding: 0 }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Created-account success modal */}
      <div className={`account-detail-modal ${createdAccount ? 'open' : ''}`}>
        <div className="account-detail-modal-box account-created-modal">
          <button className="account-detail-close" onClick={() => setCreatedAccount(null)} aria-label="Close">
            <X size={18} />
          </button>
          {createdAccount && (
            <>
              <div className="account-detail-title">
                <CheckCircle2 size={20} color="#15803d" />
                <h3>{createdAccount.role} Account Created</h3>
              </div>
              <p className="account-created-desc">
                The account is now pending setup. A one-time setup link was sent to the email below. The link
                expires in 10 minutes.
              </p>
              <div className="account-id-box">
                <span className="account-id-label">Assigned Account ID</span>
                <span className="account-id-cell account-id-large">{createdAccount.account_id}</span>
              </div>
              <p className="account-created-email">{createdAccount.email}</p>
              <button className="btn-primary account-created-done" onClick={() => setCreatedAccount(null)}>
                Done
              </button>
            </>
          )}
        </div>
      </div>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={Boolean(pendingDeactivate)}
        title="Deactivate this account?"
        message={`${pendingDeactivate?.full_name || pendingDeactivate?.email} will no longer be able to sign in until the account is reactivated.`}
        confirmText="Deactivate"
        cancelText="Keep Active"
        variant="danger"
        loading={updating}
        onConfirm={confirmDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />

      {/* Resend setup confirmation */}
      <ConfirmDialog
        open={Boolean(pendingResend)}
        title="Resend setup email?"
        message={`Send a new one-time setup link to ${pendingResend?.email || ''}? The previous link will stop working.`}
        confirmText="Resend Setup Email"
        cancelText="Cancel"
        loading={resending}
        onConfirm={() => resendSetup(pendingResend)}
        onCancel={() => setPendingResend(null)}
      />

      {/* Delete account confirmation */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this account?"
        message={`${pendingDelete?.full_name || pendingDelete?.email}'s login account will be permanently removed. Their pet and medical records are kept for the clinic. This cannot be undone.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        confirmText="Done"
        onConfirm={() => setSuccessModal({ open: false, title: '', message: '' })}
      />
    </div>
  );
}