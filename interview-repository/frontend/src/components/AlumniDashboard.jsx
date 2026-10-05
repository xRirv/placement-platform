import { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  Share2,
  Save,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

export const AlumniDashboard = ({ user, session, userProfile }) => {
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    company: 'Leading Tech Co',
    designation: 'Software Development Engineer',
    offerDate: '2024-06-01',
    ctc: 24,
    interviewExperience: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    let ignore = false;
    const fetchProfile = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${backendUrl}/api/alumni/profile`, {
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
      const res = await fetch(`${backendUrl}/api/alumni/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setMessage('Alumni profile saved successfully!');
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
      roleTitle="Placed Alumni"
      roleBadgeClass="role-alumni"
      user={user}
      userProfile={userProfile}
    >
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-header-title">Placed Alumni Portal</h1>
          <p className="dashboard-header-sub">
            Share your offer details, interview questions, and placement tips to guide upcoming junior batches.
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
            <span className="stat-title">Current Company</span>
            <span className="stat-num" style={{ fontSize: '1.35rem' }}>
              {profile.company || 'Tech Corp'}
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Building2 size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Experiences Contributed</span>
            <span className="stat-num">3</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <FileCheck size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Package (LPA)</span>
            <span className="stat-num">{profile.ctc || 24}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <DollarSign size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Junior Mentees</span>
            <span className="stat-num">12</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <Share2 size={20} />
          </div>
        </div>
      </div>

      {/* Alumni Profile Form */}
      <div className="dashboard-card">
        <div className="card-heading">
          <span>Alumni Placement Record</span>
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
              <label className="field-label">Placed Company</label>
              <input
                type="text"
                className="text-input"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Designation / Role</label>
              <input
                type="text"
                className="text-input"
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Offer CTC (LPA)</label>
              <input
                type="number"
                className="text-input"
                value={profile.ctc}
                onChange={(e) => setProfile({ ...profile, ctc: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Interview Experience Overview / Advice for Juniors</label>
              <textarea
                className="text-input"
                rows={4}
                placeholder="Share your interview rounds, questions asked, and key preparation strategies..."
                value={profile.interviewExperience || ''}
                onChange={(e) => setProfile({ ...profile, interviewExperience: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Alumni Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
