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
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Save,
  BookOpen,
  GraduationCap,
  Briefcase,
  Award,
  Upload,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ExperienceModal } from './ExperienceModal';
import { ExperienceDetailModal } from './ExperienceDetailModal';
import { StudentManagement } from './admin/StudentManagement';
import { MentorManagement } from './admin/MentorManagement';
import { AlumniManagement } from './admin/AlumniManagement';
import { BatchUpload } from './admin/BatchUpload';

export const AdminDashboard = ({ user, session, userProfile }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [usersList, setUsersList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [changingRoleId, setChangingRoleId] = useState(null);
  const [moderatingId, setModeratingId] = useState(null);
  const [mentorsList, setMentorsList] = useState([]);
  const [assigningMentorId, setAssigningMentorId] = useState(null);

  // Profile state
  const [adminProfile, setAdminProfile] = useState({
    name: userProfile?.name || '',
    email: userProfile?.email || user?.email || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Modal states
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [viewingExp, setViewingExp] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const refreshAllData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [usersRes, logsRes, profileRes, expRes, mentorsRes] = await Promise.all([
        fetch(`${backendUrl}/api/admin/users`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/admin/moderation-logs`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/admin/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/interviews/moderation?size=50`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/admin/mentors`, {
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
      if (profileRes.ok) {
        const pData = await profileRes.json();
        if (pData) {
          setAdminProfile({
            name: pData.name || '',
            email: pData.email || '',
          });
        }
      }
      if (expRes.ok) {
        const eData = await expRes.json();
        setExperiences(eData.content || eData || []);
      }
      if (mentorsRes.ok) {
        const mData = await mentorsRes.json();
        setMentorsList(mData || []);
      }
    } catch {
      // fallback mock data
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
    refreshAllData();
  }, [session?.access_token, backendUrl]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: adminProfile.name }),
      });
      if (res.ok) {
        setActionMessage('Administrator profile updated successfully');
      } else {
        setActionMessage('Failed to update profile');
      }
    } catch {
      setActionMessage('Network error updating profile');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

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
        setActionMessage(`Role updated to ${updated.role} for ${targetEmail}`);
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMessage(err.message || 'Failed to update user role');
      }
    } catch {
      setActionMessage('Network error while updating role');
    } finally {
      setChangingRoleId(null);
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const handleStatusToggle = async (userId, currentStatus, targetEmail) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${backendUrl}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: !currentStatus,
          reason: currentStatus ? 'Deactivated by admin' : 'Reactivated by admin',
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, active: updated.active } : u))
        );
        setActionMessage(`Status updated to ${updated.active ? 'Active' : 'Inactive'} for ${targetEmail}`);
      } else {
        // Optimistic update
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, active: !currentStatus } : u))
        );
        setActionMessage('Status updated (local preview)');
      }
    } catch {
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, active: !currentStatus } : u))
      );
      setActionMessage('Status updated (local preview)');
    } finally {
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleAssignMentor = async (userId, targetEmail, mentorId) => {
    if (!session?.access_token) return;
    setAssigningMentorId(userId);
    try {
      const res = await fetch(`${backendUrl}/api/admin/users/${userId}/mentor`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mentorId: mentorId ? mentorId : null }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, mentorId: updated.mentorId, mentorName: updated.mentorName }
              : u
          )
        );
        // Refresh mentors list to update mentee counts
        fetch(`${backendUrl}/api/admin/mentors`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((mData) => setMentorsList(mData || []));

        setActionMessage(
          updated.mentorName
            ? `Assigned mentor ${updated.mentorName} to ${targetEmail}`
            : `Unassigned mentor from ${targetEmail}`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMessage(err.message || 'Failed to update mentor assignment');
      }
    } catch {
      setActionMessage('Network error while assigning mentor');
    } finally {
      setAssigningMentorId(null);
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const handleModerate = async (id, status) => {
    setModeratingId(id);
    try {
      const res = await fetch(`${backendUrl}/api/interviews/${id}/moderation`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moderationStatus: status,
          reason: `Marked as ${status} by Administrator`,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setExperiences((prev) =>
          prev.map((exp) => (exp.id === id ? { ...exp, moderationStatus: updated.moderationStatus } : exp))
        );
        setActionMessage(`Experience marked as ${status}`);
        // refresh logs
        fetch(`${backendUrl}/api/admin/moderation-logs`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
          .then((r) => r.json())
          .then((data) => setLogsList(data.content || data));
      } else {
        setActionMessage('Failed to update moderation status');
      }
    } catch {
      setActionMessage('Network error updating status');
    } finally {
      setModeratingId(null);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleDeleteExperience = async (id) => {
    if (!window.confirm('Delete this interview experience completely from the database?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/interviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setExperiences((prev) => prev.filter((exp) => exp.id !== id));
        setActionMessage('Interview experience deleted successfully');
      }
    } catch {
      setActionMessage('Failed to delete experience');
    } finally {
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleModalSuccess = () => {
    refreshAllData();
    setActionMessage('Experience saved successfully!');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingModerations = experiences.filter((e) => e.moderationStatus === 'PENDING').length;

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
            Oversee students, mentors, alumni, interview experiences, and system access policies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={refreshAllData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingExp(null);
              setIsExpModalOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={15} />
            <span>Submit Experience</span>
          </button>
        </div>
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
            <span className="stat-title">Registered Accounts</span>
            <span className="stat-num">{usersList.length || 4}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <Users size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Pending Moderation</span>
            <span className="stat-num" style={{ color: pendingModerations > 0 ? '#d97706' : '#059669' }}>
              {pendingModerations}
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Total Experiences</span>
            <span className="stat-num">{experiences.length}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#faf5ff', color: '#9333ea' }}>
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
          className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <GraduationCap size={16} />
          <span>Students</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'mentors' ? 'active' : ''}`}
          onClick={() => setActiveTab('mentors')}
        >
          <Briefcase size={16} />
          <span>Mentors</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'alumni' ? 'active' : ''}`}
          onClick={() => setActiveTab('alumni')}
        >
          <Award size={16} />
          <span>Alumni</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={16} />
          <span>Batch Upload</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'experiences' ? 'active' : ''}`}
          onClick={() => setActiveTab('experiences')}
        >
          <BookOpen size={16} />
          <span>Experiences ({experiences.length})</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Users ({usersList.length})</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <ShieldCheck size={16} />
          <span>Logs ({logsList.length})</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Sparkles size={16} />
          <span>Admin Profile</span>
        </button>
      </div>

      {/* TAB: STUDENTS */}
      {activeTab === 'students' && <StudentManagement session={session} />}

      {/* TAB: MENTORS */}
      {activeTab === 'mentors' && <MentorManagement session={session} />}

      {/* TAB: ALUMNI */}
      {activeTab === 'alumni' && <AlumniManagement session={session} />}

      {/* TAB: BATCH UPLOAD */}
      {activeTab === 'upload' && <BatchUpload session={session} />}

      {/* TAB: EXPERIENCES CRUD & MODERATION */}
      {activeTab === 'experiences' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Interview Experiences Repository & Moderation</span>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                setEditingExp(null);
                setIsExpModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={14} />
              <span>Submit Experience</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Target Company & Role</th>
                  <th>Submitted By</th>
                  <th>Difficulty & Result</th>
                  <th>Moderation Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {experiences.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No interview experiences submitted yet.
                    </td>
                  </tr>
                ) : (
                  experiences.map((exp) => (
                    <tr key={exp.id}>
                      <td>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                          {exp.companyName || 'Company'}
                        </strong>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{exp.role}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                          {exp.submitterName || exp.submitterEmail || 'User'}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{exp.interviewDate}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span className={`badge-difficulty badge-diff-${(exp.difficulty || 'medium').toLowerCase()}`}>
                            {exp.difficulty || 'Medium'}
                          </span>
                          <span className={`badge-result badge-res-${(exp.interviewResult || 'pending').toLowerCase().replace(' ', '-')}`}>
                            {exp.interviewResult || 'Offered'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-status ${(exp.moderationStatus || 'pending').toLowerCase()}`}>
                          {exp.moderationStatus || 'PENDING'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setViewingExp(exp)}
                            title="View Full Details"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setEditingExp(exp);
                              setIsExpModalOpen(true);
                            }}
                            title="Edit Experience"
                          >
                            <Edit2 size={13} />
                          </button>
                          {exp.moderationStatus !== 'APPROVED' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleModerate(exp.id, 'APPROVED')}
                              disabled={moderatingId === exp.id}
                              style={{ color: '#059669', borderColor: '#a7f3d0' }}
                              title="Approve Experience"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          {exp.moderationStatus !== 'REJECTED' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleModerate(exp.id, 'REJECTED')}
                              disabled={moderatingId === exp.id}
                              style={{ color: '#dc2626', borderColor: '#fecaca' }}
                              title="Reject Experience"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-danger-outline"
                            onClick={() => handleDeleteExperience(exp.id)}
                            title="Delete Experience"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>User Directory & Permission Management</span>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Search users..."
                className="text-input"
                style={{ paddingLeft: '2.25rem', paddingBottom: '0.4rem', paddingTop: '0.4rem', fontSize: '0.85rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User Identity</th>
                  <th>System Role</th>
                  <th>Assigned Mentor</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No matching user records found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = user?.email && u.email?.toLowerCase() === user.email.toLowerCase();
                    return (
                      <tr key={u.id}>
                        <td>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                              {u.name || u.email?.split('@')[0]}
                            </strong>
                            {isSelf && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#e0e7ff', color: '#4338ca', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</span>
                        </td>
                        <td>
                          <div className="role-select-wrapper">
                            <select
                              className={`role-select role-${u.role?.toLowerCase()}`}
                              value={u.role || 'STUDENT'}
                              disabled={changingRoleId === u.id || (isSelf && u.role === 'ADMIN')}
                              onChange={(e) => handleRoleChange(u.id, u.email, e.target.value)}
                              title={isSelf && u.role === 'ADMIN' ? 'You cannot demote your own admin account' : `Change role for ${u.email}`}
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="MENTOR">MENTOR</option>
                              <option value="ALUMNI">ALUMNI</option>
                              <option value="STUDENT">STUDENT</option>
                            </select>
                            {changingRoleId === u.id && (
                              <RefreshCw size={14} className="animate-spin" style={{ color: '#6366f1' }} />
                            )}
                          </div>
                        </td>
                        <td>
                          {u.role === 'STUDENT' ? (
                            <div className="role-select-wrapper">
                              <select
                                className="role-select"
                                style={{
                                  borderColor: u.mentorId ? '#818cf8' : '#cbd5e1',
                                  backgroundColor: u.mentorId ? '#eef2ff' : '#ffffff',
                                  color: u.mentorId ? '#4338ca' : '#475569',
                                  maxWidth: '200px',
                                  fontSize: '0.75rem',
                                }}
                                value={u.mentorId || ''}
                                disabled={assigningMentorId === u.id}
                                onChange={(e) => handleAssignMentor(u.id, u.email, e.target.value)}
                              >
                                <option value="">(No Mentor Assigned)</option>
                                {mentorsList.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.email} ({m.menteeCount || 0} mentees)
                                  </option>
                                ))}
                              </select>
                              {assigningMentorId === u.id && (
                                <RefreshCw size={13} className="animate-spin" style={{ color: '#6366f1' }} />
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={u.active ? 'badge-active' : 'badge-inactive'}>
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleStatusToggle(u.id, u.active, u.email)}
                            disabled={isSelf}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            {u.active ? <UserX size={13} color="#ef4444" /> : <UserCheck size={13} color="#10b981" />}
                            <span>{u.active ? 'Disable' : 'Enable'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: MODERATION AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Audit Trail & Activity Logs</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin Actor</th>
                  <th>Action</th>
                  <th>Target Resource</th>
                  <th>Moderation Reason</th>
                </tr>
              </thead>
              <tbody>
                {logsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No moderation events recorded in system audit logs
                    </td>
                  </tr>
                ) : (
                  logsList.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                          {log.adminName || 'System Admin'}
                        </strong>
                      </td>
                      <td>
                        <code>{log.action}</code>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        <code>
                          {log.entityType ? `${log.entityType}: ` : ''}
                          {log.entityId?.substring(0, 8) ?? 'N/A'}...
                        </code>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#334155' }}>
                        {log.reason || log.details || 'None provided'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ADMIN PROFILE */}
      {activeTab === 'profile' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Administrator Profile Details</span>
          </div>

          <form onSubmit={handleSaveProfile} className="auth-form">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="text-input"
                  value={adminProfile.name}
                  onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Administrator Email (Identity)</label>
                <input
                  type="email"
                  className="text-input"
                  disabled
                  value={adminProfile.email}
                  style={{ background: '#f8fafc', color: '#64748b' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                <Save size={15} />
                <span>{savingProfile ? 'Saving...' : 'Save Admin Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Experience Submit/Edit Modal */}
      <ExperienceModal
        isOpen={isExpModalOpen}
        onClose={() => setIsExpModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialData={editingExp}
        session={session}
        backendUrl={backendUrl}
      />

      {/* Experience Detail Modal */}
      <ExperienceDetailModal
        isOpen={Boolean(viewingExp)}
        onClose={() => setViewingExp(null)}
        experience={viewingExp}
      />
    </DashboardLayout>
  );
};
