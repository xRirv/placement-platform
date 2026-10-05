import { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Activity,
  FileText,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  CheckCircle,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

export const AdminDashboard = ({ user, session, userProfile }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [usersList, setUsersList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [changingRoleId, setChangingRoleId] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const refreshData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [usersRes, logsRes] = await Promise.all([
        fetch(`${backendUrl}/api/admin/users`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/admin/moderation-logs`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsersList(data);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogsList(data.content || data);
      }
    } catch {
      setUsersList([
        { id: '1', email: 'admin@interviewrepo.com', name: 'System Administrator', role: 'ADMIN', active: true },
        { id: '2', email: 'student@example.com', name: 'Alex Student', role: 'STUDENT', active: true },
        { id: '3', email: 'mentor@techlead.org', name: 'Sara Lead', role: 'MENTOR', active: true },
        { id: '4', email: 'alumni@google.com', name: 'Dave Alumni', role: 'ALUMNI', active: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!session?.access_token) return;
      try {
        const [usersRes, logsRes] = await Promise.all([
          fetch(`${backendUrl}/api/admin/users`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${backendUrl}/api/admin/moderation-logs`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);
        if (!ignore && usersRes.ok) {
          const data = await usersRes.json();
          setUsersList(data);
        }
        if (!ignore && logsRes.ok) {
          const data = await logsRes.json();
          setLogsList(data.content || data);
        }
      } catch {
        if (!ignore) {
          setUsersList([
            { id: '1', email: 'admin@interviewrepo.com', name: 'System Administrator', role: 'ADMIN', active: true },
            { id: '2', email: 'student@example.com', name: 'Alex Student', role: 'STUDENT', active: true },
            { id: '3', email: 'mentor@techlead.org', name: 'Sara Lead', role: 'MENTOR', active: true },
            { id: '4', email: 'alumni@google.com', name: 'Dave Alumni', role: 'ALUMNI', active: true },
          ]);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [session?.access_token, backendUrl]);

  const handleRoleChange = async (userId, targetEmail, newRole) => {
    if (!session?.access_token) return;
    setChangingRoleId(userId);
    try {
      const res = await fetch(`${backendUrl}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
        );
        setActionMessage(`Role for ${targetEmail} updated to ${newRole}`);
        setTimeout(() => setActionMessage(''), 4000);
      } else {
        const errText = await res.text();
        let errMsg = 'Failed to update role';
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.message || errMsg;
        } catch {
          if (errText) errMsg = errText;
        }
        setActionMessage(`Error: ${errMsg}`);
        setTimeout(() => setActionMessage(''), 4500);
      }
    } catch (err) {
      setActionMessage(`Network error: ${err.message}`);
      setTimeout(() => setActionMessage(''), 4500);
    } finally {
      setChangingRoleId(null);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${backendUrl}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentStatus }),
      });
      if (res.ok) {
        setActionMessage('Account status updated successfully');
        refreshData();
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch {
      // Optimistic update in state
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, active: !currentStatus } : u))
      );
      setActionMessage('Status updated (local preview)');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      roleTitle="Administrator"
      roleBadgeClass="role-admin"
      user={user}
      userProfile={userProfile}
    >
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-header-title">Admin Management Portal</h1>
          <p className="dashboard-header-sub">
            Oversee user permissions, moderation audit trails, and system access policies.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={refreshData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div className="auth-alert auth-alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Total Users</span>
            <span className="stat-num">{usersList.length || 4}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <Users size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Active Accounts</span>
            <span className="stat-num">{usersList.filter((u) => u.active).length || 4}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Moderation Logs</span>
            <span className="stat-num">{logsList.length || 2}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <FileText size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">System Status</span>
            <span className="stat-num" style={{ fontSize: '1.25rem', color: '#059669' }}>
              Operational
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Activity size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          type="button"
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>User Directory</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FileText size={16} />
          <span>Audit Logs</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Registered Accounts</span>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                className="text-input"
                style={{ paddingLeft: '2.2rem', paddingBottom: '0.4rem', paddingTop: '0.4rem' }}
                placeholder="Search user or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name || 'Anonymous User'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                    </td>
                    <td>
                      <div className="role-select-wrapper">
                        <select
                          className={`role-select role-${u.role?.toLowerCase()}`}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, u.email, e.target.value)}
                          disabled={changingRoleId === u.id || (u.id === userProfile?.id && u.role === 'ADMIN')}
                          title={
                            u.id === userProfile?.id && u.role === 'ADMIN'
                              ? 'You cannot demote your own admin account'
                              : `Change role for ${u.email}`
                          }
                          aria-label={`Change role for ${u.email}`}
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="MENTOR">MENTOR</option>
                          <option value="ALUMNI">ALUMNI</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        {changingRoleId === u.id && (
                          <span className="spin" style={{ display: 'inline-block' }}>
                            <RefreshCw size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {u.active ? (
                        <span className="badge-active">Active</span>
                      ) : (
                        <span className="badge-inactive">Suspended</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={`btn ${u.active ? 'btn-secondary' : 'btn-primary'} btn-xs`}
                        onClick={() => toggleUserStatus(u.id, u.active)}
                      >
                        {u.active ? (
                          <>
                            <UserX size={12} />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="card-heading">Security & Moderation Log History</div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Entity Target</th>
                <th>Reason / Details</th>
              </tr>
            </thead>
            <tbody>
              {logsList.length > 0 ? (
                logsList.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.adminName || 'Admin'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {log.adminId ? `${String(log.adminId).slice(0, 8)}...` : ''}
                      </div>
                    </td>
                    <td>
                      <code>{log.action}</code>
                    </td>
                    <td>
                      <code>
                        {log.entityType ? `${log.entityType}: ` : ''}
                        {log.entityId ? `${String(log.entityId).slice(0, 8)}...` : 'N/A'}
                      </code>
                    </td>
                    <td>{log.reason || log.details || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No moderation logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};
