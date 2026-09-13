import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import FieldError from '../../components/ui/FieldError';
import PasswordChecklist from '../../components/PasswordChecklist';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SuccessModal from '../../components/ui/SuccessModal';
import { validateStaffUserCreation } from '../../utils/validation';

export default function UserDirectory() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role_name: 'Staff' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });

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
      await api.post('/users', form);
      setMessage(`${form.role_name} account created.`);
      setForm({ full_name: '', email: '', password: '', role_name: 'Staff' });
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account.');
    } finally {
      setSaving(false);
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
        message: `${pendingDelete.full_name || pendingDelete.email} has been permanently removed from the system.`,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete user.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  async function toggleStatus(user) {
    setError('');

    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await api.put(`/users/${user.id}/status`, { status: newStatus });
      await loadUsers();
    } catch (err) {
      setError('Unable to update user status.');
    }
  }

  return (
    <div className="page">
      <h1>User Directory</h1>
      <p>System Users — everyone in the system, from pet owners to clinic staff and admin.</p>

      <div className="page-intro">Manage system users and create new staff, veterinarian, or admin accounts.</div>

      <div className="form-card user-directory-card">
        <div className="form-card-header">
          <h2>User Account Setup</h2>
          <p>Use a temporary password and choose the correct role. New accounts will appear in the table below.</p>
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
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Temporary Password" required />
            <PasswordChecklist password={form.password} />
            <FieldError message={fieldErrors.password} />
          </div>
          <div className="validated-field">
            <select name="role_name" value={form.role_name} onChange={handleChange}>
              <option>Staff</option>
              <option>Veterinarian</option>
              <option>Admin</option>
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
          <div className="table-meta">{loading ? 'Loading users...' : `${users.length} users`}</div>
        </div>

        <table className="data-table">
        <thead>
          <tr><th>Name / Email</th><th>Role</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="4">Loading users...</td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan="4">No users found.</td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name || u.email}</td>
                <td>{u.role_name}</td>
                <td><StatusBadge status={u.status === 'active' ? 'Active' : 'Inactive'} /></td>
                <td className="user-directory-actions">
                  <button className="btn-secondary" onClick={() => toggleStatus(u)}>
                    {u.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="danger-btn" onClick={() => requestDelete(u)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this account?"
        message={`You are about to permanently delete the account of ${pendingDelete?.full_name || pendingDelete?.email}. This action cannot be undone.`}
        confirmText="Delete Account"
        cancelText="Keep Account"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <SuccessModal
        open={successModal.open}
        title="Account Deleted"
        message={successModal.message}
        confirmText="Done"
        onConfirm={() => setSuccessModal({ open: false, message: '' })}
      />
    </div>
  );
}
