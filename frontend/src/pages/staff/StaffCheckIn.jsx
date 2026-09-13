import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { UserCheck } from 'lucide-react';

export default function StaffCheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  const registeredName = user?.full_name?.trim() || '';

  async function handleCheckIn(e) {
    e.preventDefault();
    setNameError('');

    if (!staffName.trim()) {
      setNameError('Please enter your name.');
      return;
    }

    // Must match the registered name exactly (case-insensitive)
    if (staffName.trim().toLowerCase() !== registeredName.toLowerCase()) {
      setNameError('This name is not valid. Please enter your registered name.');
      return;
    }

    setLoading(true);
    try {
      sessionStorage.setItem('staff_check_in_name', registeredName);
      sessionStorage.setItem('staff_check_in_time', new Date().toISOString());

      await api.post('/audit/check-in', { staff_name: registeredName });

      toast.success(`Welcome, ${registeredName}!`);

      setTimeout(() => {
        navigate('/staff/dashboard');
      }, 100);
    } catch (err) {
      console.error('Check-in error:', err);
      // Even if backend fails, proceed with local check-in
      toast.success(`Welcome, ${registeredName}! (Local check-in)`);
      setTimeout(() => {
        navigate('/staff/dashboard');
      }, 100);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-graphic">
        <h2>Staff Check-In</h2>
        <p>Please identify yourself before accessing the dashboard.</p>
      </div>

      <div className="auth-box">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <UserCheck size={64} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
          <h3>Who's on duty?</h3>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Enter your registered name to log your session
          </p>
        </div>

        <form onSubmit={handleCheckIn}>
          <label>Your Full Name</label>
          <input
            type="text"
            value={staffName}
            onChange={(e) => {
              setStaffName(e.target.value);
              setNameError('');
            }}
            placeholder={`e.g., ${registeredName || 'Your registered name'}`}
            required
            autoFocus
          />
          {nameError && (
            <p className="form-error" style={{ marginTop: '0.4rem' }}>
              {nameError}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Checking in...' : 'Check In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-warning-tint)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-ink)' }}>
          <strong>Note:</strong> Only your registered name will be accepted. This helps admin track which staff member is currently using the system.
        </div>
      </div>
    </div>
  );
}
