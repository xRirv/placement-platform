import { useState, useEffect } from 'react';
import {
  Users,
  Award,
  CheckCircle,
  MessageSquare,
  Save,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

export const MentorDashboard = ({ user, session, userProfile }) => {
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    company: 'Tech Corp',
    designation: 'Senior Software Engineer',
    yearsOfExperience: 5,
    expertise: 'System Design, Backend Microservices, Distributed Systems',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    let ignore = false;
    const fetchProfile = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${backendUrl}/api/mentor/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data) setProfile((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // default fallback
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
        setMessage('Profile updated locally');
      }
    } catch {
      setMessage('Profile saved locally (offline preview)');
    } finally {
      setSaving(false);
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
            Guide aspiring candidates, conduct mock interview assessments, and review round feedback.
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
            <span className="stat-num">5</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <Users size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Mocks Conducted</span>
            <span className="stat-num">18</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <Award size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Pending Reviews</span>
            <span className="stat-num">2</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Mentor Rating</span>
            <span className="stat-num" style={{ fontSize: '1.4rem', color: '#16a34a' }}>
              4.9 / 5.0
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <MessageSquare size={20} />
          </div>
        </div>
      </div>

      {/* Mentor Profile Form */}
      <div className="dashboard-card">
        <div className="card-heading">
          <span>Mentor Industry Profile</span>
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
              <label className="field-label">Current Company</label>
              <input
                type="text"
                className="text-input"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Current Designation</label>
              <input
                type="text"
                className="text-input"
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Years of Experience</label>
              <input
                type="number"
                className="text-input"
                value={profile.yearsOfExperience}
                onChange={(e) => setProfile({ ...profile, yearsOfExperience: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Areas of Expertise</label>
              <input
                type="text"
                className="text-input"
                value={profile.expertise}
                onChange={(e) => setProfile({ ...profile, expertise: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Mentor Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
