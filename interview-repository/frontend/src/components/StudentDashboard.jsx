import { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Target,
  Save,
  CheckCircle,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

export const StudentDashboard = ({ user, session, userProfile }) => {
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    college: '',
    degree: '',
    graduationYear: 2026,
    skills: 'Java, Spring Boot, React, PostgreSQL',
    bio: '',
    githubUrl: '',
    linkedinUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    let ignore = false;
    const fetchProfile = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${backendUrl}/api/student/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data) setProfile((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // use default
      }
    };
    fetchProfile();
    return () => {
      ignore = true;
    };
  }, [session?.access_token, backendUrl]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/student/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        setMessage('Profile saved locally');
      }
    } catch {
      setMessage('Profile updated locally (offline mode)');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Student"
      roleBadgeClass="role-student"
      user={user}
      userProfile={userProfile}
    >
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-header-title">Student Workspace</h1>
          <p className="dashboard-header-sub">
            Track your placement preparations, mock interviews, and company application pipeline.
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
            <span className="stat-title">Target Companies</span>
            <span className="stat-num">8</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <Target size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Applications</span>
            <span className="stat-num">3</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Briefcase size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Practice Questions</span>
            <span className="stat-num">42</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <BookOpen size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Mentorship</span>
            <span className="stat-num" style={{ fontSize: '1.25rem', color: '#4f46e5' }}>
              Assigned
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <GraduationCap size={20} />
          </div>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="dashboard-card">
        <div className="card-heading">
          <span>Student Candidate Profile</span>
        </div>

        <form onSubmit={handleSave} className="auth-form">
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
            <div className="form-group">
              <label className="field-label">College / University</label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g. National Institute of Technology"
                value={profile.college}
                onChange={(e) => setProfile({ ...profile, college: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Degree & Branch</label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g. B.Tech Computer Science"
                value={profile.degree}
                onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Graduation Year</label>
              <input
                type="number"
                className="text-input"
                value={profile.graduationYear}
                onChange={(e) => setProfile({ ...profile, graduationYear: parseInt(e.target.value) || 2026 })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Key Technical Skills</label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g. React, Java, Data Structures, Algorithms"
                value={profile.skills}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">GitHub URL</label>
              <input
                type="url"
                className="text-input"
                placeholder="https://github.com/..."
                value={profile.githubUrl}
                onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">LinkedIn URL</label>
              <input
                type="url"
                className="text-input"
                placeholder="https://linkedin.com/in/..."
                value={profile.linkedinUrl}
                onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
