import { useState, useEffect } from 'react';
import {
  Users,
  Award,
  CheckCircle,
  MessageSquare,
  Save,
  Clock,
  Sparkles,
  BookOpen,
  UserCheck,
  UserPlus,
  Eye,
  ExternalLink,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { MenteeDetailModal } from './MenteeDetailModal';

export const MentorDashboard = ({ user, session, userProfile }) => {
  const [activeTab, setActiveTab] = useState('mentees');
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    bio: '',
    expertise: 'System Design, Backend Microservices, Distributed Systems',
  });
  const [mentees, setMentees] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const fetchProfile = async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${backendUrl}/api/mentor/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setProfile({
            name: data.name || userProfile?.name || '',
            bio: data.bio || '',
            expertise: data.expertise || '',
          });
        }
      }
    } catch {
      // offline fallback
    }
  };

  const fetchMentees = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [menteesRes, availRes] = await Promise.all([
        fetch(`${backendUrl}/api/mentor/mentees`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/mentor/available-students`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (menteesRes.ok) {
        const data = await menteesRes.json();
        setMentees(data || []);
      }
      if (availRes.ok) {
        const aData = await availRes.json();
        setAvailableStudents(aData || []);
      }
    } catch {
      setMentees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchMentees();
  }, [session?.access_token, backendUrl]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${backendUrl}/api/mentor/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setMessage('Mentor profile saved successfully!');
      } else {
        setMessage('Failed to update mentor profile');
      }
    } catch {
      setMessage('Network error while saving profile');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAssignMentee = async (studentId, studentName) => {
    setAssigningId(studentId);
    try {
      const res = await fetch(`${backendUrl}/api/mentor/mentees/${studentId}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const assignedStudent = await res.json();
        setMessage(`Assigned ${studentName || 'student'} as your mentee!`);
        fetchMentees();
      } else {
        setMessage('Failed to assign mentee');
      }
    } catch {
      setMessage('Network error assigning mentee');
    } finally {
      setAssigningId(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Mentor"
      roleBadgeClass="role-mentor"
      user={user}
      userProfile={userProfile}
    >
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-header-title">Mentor Hub</h1>
          <p className="dashboard-header-sub">
            Monitor assigned mentees, inspect their academic profiles and interview experiences, and guide their career progress.
          </p>
        </div>
      </div>

      {message && (
        <div className="auth-alert auth-alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Active Mentees</span>
            <span className="stat-num">{mentees.length}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <Users size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Available Candidates</span>
            <span className="stat-num">{availableStudents.length}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <GraduationCap size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Core Focus</span>
            <span className="stat-num" style={{ fontSize: '1.05rem', color: '#334155' }}>
              {profile.expertise?.split(',')[0] || 'System Design'}
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Award size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Guidance Rating</span>
            <span className="stat-num" style={{ fontSize: '1.35rem', color: '#16a34a' }}>
              4.9 / 5.0
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <MessageSquare size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-button ${activeTab === 'mentees' ? 'active' : ''}`}
          onClick={() => setActiveTab('mentees')}
        >
          <Users size={16} />
          <span>My Mentees ({mentees.length})</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'assign' ? 'active' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          <UserPlus size={16} />
          <span>Assign / Connect Mentees ({availableStudents.length})</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Sparkles size={16} />
          <span>Mentor Profile</span>
        </button>
      </div>

      {/* TAB 1: MY MENTEES */}
      {activeTab === 'mentees' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Mentees Assigned Under Your Guidance</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading assigned mentees...
            </div>
          ) : mentees.length === 0 ? (
            <div className="empty-state">
              <Users size={40} className="empty-state-icon" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                No Mentees Currently Assigned
              </h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
                You have not been assigned any mentees yet. Switch to the "Assign / Connect Mentees" tab to connect with prospective candidates.
              </p>
              <button className="btn btn-primary" onClick={() => setActiveTab('assign')}>
                <UserPlus size={15} />
                <span>Browse Available Candidates</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {mentees.map((mentee) => {
                const skills = mentee.skills
                  ? mentee.skills.split(',').map((s) => s.trim()).filter(Boolean)
                  : [];
                return (
                  <div key={mentee.id} className="mentee-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div className="mentee-avatar">
                          {(mentee.name || mentee.email || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            {mentee.name || 'Student Candidate'}
                          </h3>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{mentee.email}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.4, margin: '0.5rem 0' }}>
                        <div><strong>Degree:</strong> {mentee.degree || 'B.Tech CS'}</div>
                        <div><strong>College:</strong> {mentee.college || 'Engineering College'}</div>
                        <div><strong>Batch:</strong> Class of {mentee.graduationYear || '2025'}</div>
                      </div>

                      {skills.length > 0 && (
                        <div className="skills-wrap">
                          {skills.slice(0, 4).map((s, i) => (
                            <span key={i} className="skill-tag">
                              {s}
                            </span>
                          ))}
                          {skills.length > 4 && (
                            <span className="skill-tag" style={{ background: '#e2e8f0' }}>
                              +{skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setSelectedMentee(mentee)}
                      >
                        <Eye size={14} />
                        <span>Inspect Full Details & Experiences</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGN MENTEES */}
      {activeTab === 'assign' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Candidates Directory</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Candidate</th>
                  <th>College & Degree</th>
                  <th>Graduation Year</th>
                  <th>Skills</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {availableStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No registered students found in the database.
                    </td>
                  </tr>
                ) : (
                  availableStudents.map((st) => {
                    const isMyMentee = mentees.some((m) => m.id === st.id);
                    return (
                      <tr key={st.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div className="mentee-avatar" style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
                              {(st.name || st.email || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                                {st.name || st.email?.split('@')[0]}
                              </strong>
                              <div style={{ fontSize: '0.785rem', color: '#64748b' }}>{st.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{st.degree || 'B.Tech'}</div>
                          <div style={{ fontSize: '0.785rem', color: '#64748b' }}>{st.college || 'University'}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                          {st.graduationYear || 2025}
                        </td>
                        <td>
                          <div className="skills-wrap" style={{ marginTop: 0 }}>
                            {(st.skills || 'DSA, Web').split(',').slice(0, 3).map((sk, i) => (
                              <span key={i} className="skill-tag">
                                {sk.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {isMyMentee ? (
                            <span className="badge-active" style={{ fontSize: '0.75rem' }}>
                              <CheckCircle size={12} />
                              <span>Your Mentee</span>
                            </span>
                          ) : (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleAssignMentee(st.id, st.name || st.email)}
                              disabled={assigningId === st.id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <UserPlus size={13} color="#4f46e5" />
                              <span>{assigningId === st.id ? 'Connecting...' : 'Connect as Mentee'}</span>
                            </button>
                          )}
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

      {/* TAB 3: MENTOR PROFILE */}
      {activeTab === 'profile' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Mentor Professional Profile</span>
          </div>

          <form onSubmit={handleSaveProfile} className="auth-form">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="text-input"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Areas of Technical Expertise & Focus</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="e.g. Distributed Systems, Machine Learning, System Design, DSA"
                  value={profile.expertise}
                  onChange={(e) => setProfile({ ...profile, expertise: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Mentor Bio & Coaching Philosophy</label>
                <textarea
                  className="text-input"
                  rows={4}
                  placeholder="Share your industry journey, mentoring approach, and how you assist mentees with mock interviews..."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                <Save size={15} />
                <span>{savingProfile ? 'Saving...' : 'Save Mentor Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mentee Deep Inspection Modal */}
      <MenteeDetailModal
        isOpen={Boolean(selectedMentee)}
        onClose={() => setSelectedMentee(null)}
        mentee={selectedMentee}
        session={session}
        backendUrl={backendUrl}
      />
    </DashboardLayout>
  );
};
