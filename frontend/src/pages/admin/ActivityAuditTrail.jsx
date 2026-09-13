import { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  Activity,
  Filter,
  Eye,
  X,
  Users,
  CalendarClock,
  FolderOpen,
  Shield,
  RefreshCw,
} from 'lucide-react';

const MODULE_LABELS = {
  auth: { label: 'Authentication' },
  user: { label: 'User & Accounts' },
  pet: { label: 'Pet Registration' },
  payment: { label: 'Payment' },
  official_receipt: { label: 'Official Receipt' },
  vaccination: { label: 'Vaccination' },
  clinical_record: { label: 'Clinical Record' },
  prescription: { label: 'Prescription / Medicine' },
  record_request: { label: 'Record Request' },
  announcement: { label: 'Announcement' },
  outreach_program: { label: 'Outreach Program' },
  transaction: { label: 'Outreach Transaction' },
  qr: { label: 'QR Code' },
  staff: { label: 'Staff' },
};

const ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'VERIFY',
  'REJECT',
  'APPROVE',
  'CANCEL',
  'RESTORE',
  'LOGIN',
  'LOGOUT',
  'CHECK_IN',
  'VIEW',
];

const ACTION_META = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  VERIFY: 'Verified',
  REJECT: 'Rejected',
  APPROVE: 'Approved',
  CANCEL: 'Cancelled',
  RESTORE: 'Restored',
  LOGIN: 'Logged In',
  LOGOUT: 'Logged Out',
  CHECK_IN: 'Checked In',
  VIEW: 'Viewed',
};

function moduleLabel(entityType) {
  return MODULE_LABELS[entityType]?.label || entityType || 'N/A';
}

function actionLabel(action) {
  return ACTION_META[action] || action || 'N/A';
}

function getRoleBadgeClass(role) {
  if (role === 'Veterinarian') return 'aat-role-badge aat-role-badge--vet';
  if (role === 'Admin') return 'aat-role-badge aat-role-badge--admin';
  if (role === 'Owner') return 'aat-role-badge aat-role-badge--owner';
  return 'aat-role-badge aat-role-badge--staff';
}

function getActionBadgeClass(action) {
  const map = {
    CREATE: 'aat-action-badge aat-action-badge--create',
    UPDATE: 'aat-action-badge aat-action-badge--update',
    DELETE: 'aat-action-badge aat-action-badge--delete',
    VERIFY: 'aat-action-badge aat-action-badge--verify',
    APPROVE: 'aat-action-badge aat-action-badge--approve',
    RESTORE: 'aat-action-badge aat-action-badge--approve',
    REJECT: 'aat-action-badge aat-action-badge--reject',
    CANCEL: 'aat-action-badge aat-action-badge--reject',
    LOGIN: 'aat-action-badge aat-action-badge--login',
    CHECK_IN: 'aat-action-badge aat-action-badge--login',
    LOGOUT: 'aat-action-badge aat-action-badge--logout',
    VIEW: 'aat-action-badge aat-action-badge--view',
  };
  return map[action] || 'aat-action-badge aat-action-badge--view';
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function parseJsonValue(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getChangePairs(log) {
  const oldVal = parseJsonValue(log.old_value);
  const newVal = parseJsonValue(log.new_value);
  if (!oldVal && !newVal) return [];

  const keys = new Set([
    ...(oldVal && typeof oldVal === 'object' ? Object.keys(oldVal) : []),
    ...(newVal && typeof newVal === 'object' ? Object.keys(newVal) : []),
  ]);

  return [...keys]
    .filter((key) => {
      if (!oldVal || !newVal) return true;
      const a = oldVal[key];
      const b = newVal[key];
      return JSON.stringify(a) !== JSON.stringify(b);
    })
    .map((key) => ({
      key,
      old: oldVal && typeof oldVal === 'object' ? oldVal[key] : undefined,
      new: newVal && typeof newVal === 'object' ? newVal[key] : undefined,
    }));
}

function formatValue(value) {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function ActivityAuditTrail() {
  const [tab, setTab] = useState('all');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    staff_name: '',
    entity_type: '',
    action: '',
    start_date: '',
    end_date: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [viewTarget, setViewTarget] = useState(null);

  const buildParams = (page = 1, useFilters = filters, useTab = tab) => {
    const params = new URLSearchParams({
      page,
      limit: pagination.limit,
    });
    if (useTab !== 'all') params.set('tab', useTab);
    Object.entries(useFilters).forEach(([key, value]) => {
      if (value !== '' && value != null) params.set(key, value);
    });
    return params;
  };

  const loadLogs = async (page = 1, useFilters = filters, useTab = tab) => {
    setLoading(true);
    try {
      const params = buildParams(page, useFilters, useTab);
      const res = await api.get(`/audit/comprehensive?${params}`);
      setLogs(res.data.logs || []);
      setPagination(
        res.data.pagination || { page, limit: pagination.limit, total: 0, pages: 0 }
      );
    } catch (err) {
      console.error('Error loading audit logs:', err);
      toast.error(err.response?.data?.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/audit/stats/comprehensive');
      setStats(res.data.stats);
    } catch (err) {
      console.error('Error loading audit stats:', err);
    }
  };

  useEffect(() => {
    loadLogs(1, filters, tab);
  }, [tab]);

  useEffect(() => {
    loadStats();
  }, []);

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadLogs(1, filters, tab);
  };

  const resetFilters = () => {
    const cleared = {
      search: '',
      staff_name: '',
      entity_type: '',
      action: '',
      start_date: '',
      end_date: '',
    };
    setFilters(cleared);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadLogs(1, cleared, tab);
  };

  useEffect(() => {
    if (!viewTarget) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setViewTarget(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [viewTarget]);

  const topUsers = stats?.top_users || [];
  const modulesInvolved = stats?.by_entity?.length || 0;

  return (
    <div className="page">
      <div>
        <h1>Activity & Audit Trail</h1>
        <p className="page-intro">
          Monitor system activity and review complete audit records across every module.
        </p>
      </div>

      <div className="aat-tabs" role="tablist" aria-label="Audit views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={`aat-tab${tab === 'all' ? ' aat-tab--active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <Activity size={15} />
          All Activity
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'system'}
          className={`aat-tab${tab === 'system' ? ' aat-tab--active' : ''}`}
          onClick={() => handleTabChange('system')}
        >
          <Shield size={15} />
          System Activity
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'audit'}
          className={`aat-tab${tab === 'audit' ? ' aat-tab--active' : ''}`}
          onClick={() => handleTabChange('audit')}
        >
          <FolderOpen size={15} />
          Audit Trail
        </button>
      </div>

      {stats && (
        <div className="summary-row">
          <div className="summary-card">
            <Activity size={24} className="summary-card-icon" />
            <p className="summary-card-value">{stats.total_last_30_days}</p>
            <p className="summary-card-label">Activities (30 days)</p>
          </div>
          <div className="summary-card">
            <CalendarClock size={24} className="summary-card-icon" />
            <p className="summary-card-value">{stats.today_activities}</p>
            <p className="summary-card-label">Today</p>
          </div>
          <div className="summary-card">
            <Users size={24} className="summary-card-icon" />
            <p className="summary-card-value">{topUsers.length}</p>
            <p className="summary-card-label">Top Users</p>
          </div>
          <div className="summary-card">
            <FolderOpen size={24} className="summary-card-icon" />
            <p className="summary-card-value">{modulesInvolved}</p>
            <p className="summary-card-label">Modules Involved</p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
        >
          <Filter size={16} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {showFilters && (
          <div className="form-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              <div>
                <label>Search</label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Description, name, module…"
                />
              </div>
              <div>
                <label>User / Staff</label>
                <input
                  type="text"
                  name="staff_name"
                  value={filters.staff_name}
                  onChange={handleFilterChange}
                  placeholder="Name or email"
                />
              </div>
              <div>
                <label>Module</label>
                <select name="entity_type" value={filters.entity_type} onChange={handleFilterChange}>
                  <option value="">All modules</option>
                  {Object.entries(MODULE_LABELS).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Action</label>
                <select name="action" value={filters.action} onChange={handleFilterChange}>
                  <option value="">All actions</option>
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {actionLabel(a)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Start Date</label>
                <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
              </div>
              <div>
                <label>End Date</label>
                <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={applyFilters} className="btn-primary">
                Apply Filters
              </button>
              <button onClick={resetFilters} className="btn-secondary">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading activity log…" fullPage={false} />
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '80px', margin: 0 }}>🧾</p>
          <h2>No Activity Found</h2>
          <p>
            System activity and audit records will appear here as actions are performed
            across the portals.
          </p>
        </div>
      ) : (
        <>
          <div className="aat-table-card">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>User</th>
                    <th>Module</th>
                    <th>Record</th>
                    <th>Date &amp; Time</th>
                    <th>IP Address</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="aat-cell-activity">
                          <span className={getActionBadgeClass(log.action)}>
                            {actionLabel(log.action)}
                          </span>
                          <span className="aat-cell-description">{log.description || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="aat-cell-user">
                          <strong>{log.staff_name || log.full_name || log.display_name || 'System'}</strong>
                          {log.role && (
                            <span className={getRoleBadgeClass(log.role)}>{log.role}</span>
                          )}
                        </div>
                      </td>
                      <td>{moduleLabel(log.entity_type)}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {log.entity_id ? `#${log.entity_id}` : '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDateTime(log.created_at)}</td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {log.ip_address || '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="aat-view-btn"
                          onClick={() => setViewTarget(log)}
                          aria-label="View activity details"
                          title="View details"
                        >
                          <Eye size={15} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => loadLogs(pagination.page - 1, filters, tab)}
                disabled={pagination.page === 1}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Previous
              </button>
              <span style={{ fontWeight: '600' }}>
                Page {pagination.page} of {pagination.pages} · {pagination.total} records
              </span>
              <button
                onClick={() => loadLogs(pagination.page + 1, filters, tab)}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {viewTarget && (
        <div className="logout-modal-overlay" onClick={() => setViewTarget(null)}>
          <div className="aat-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="aat-modal-header">
              <div>
                <h3>Activity Details</h3>
                <p>
                  <span className={getActionBadgeClass(viewTarget.action)}>
                    {actionLabel(viewTarget.action)}
                  </span>{' '}
                  <span>{moduleLabel(viewTarget.entity_type)}</span>
                  {viewTarget.entity_id ? ` · Record #${viewTarget.entity_id}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="aat-modal-close"
                onClick={() => setViewTarget(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aat-modal-body">
              <div className="aat-detail-grid">
                <div>
                  <label>User</label>
                  <p>{viewTarget.staff_name || viewTarget.full_name || viewTarget.display_name || 'System'}</p>
                </div>
                <div>
                  <label>Role</label>
                  <p>
                    {viewTarget.role ? (
                      <span className={getRoleBadgeClass(viewTarget.role)}>{viewTarget.role}</span>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
                <div>
                  <label>Account</label>
                  <p>{viewTarget.email || '—'}</p>
                </div>
                <div>
                  <label>Date &amp; Time</label>
                  <p>{formatDateTime(viewTarget.created_at)}</p>
                </div>
                <div>
                  <label>IP Address</label>
                  <p style={{ fontFamily: 'monospace' }}>{viewTarget.ip_address || '—'}</p>
                </div>
                <div>
                  <label>Description</label>
                  <p>{viewTarget.description || '—'}</p>
                </div>
              </div>

              {getChangePairs(viewTarget).length > 0 ? (
                <div className="aat-diff">
                  <h4>Changes</h4>
                  <table className="data-table aat-diff-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Previous</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getChangePairs(viewTarget).map((pair) => (
                        <tr key={pair.key}>
                          <td>
                            <strong>{pair.key}</strong>
                          </td>
                          <td className="aat-diff-old">{formatValue(pair.old)}</td>
                          <td className="aat-diff-new">{formatValue(pair.new)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                viewTarget.old_value || viewTarget.new_value ? (
                  <div className="aat-diff">
                    <h4>Data Snapshot</h4>
                    <pre className="aat-diff-json">
                      {JSON.stringify(parseJsonValue(viewTarget.new_value || viewTarget.old_value), null, 2)}
                    </pre>
                  </div>
                ) : null
              )}

              {viewTarget.user_agent && (
                <p className="aat-ua">
                  <RefreshCw size={13} /> {viewTarget.user_agent}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}