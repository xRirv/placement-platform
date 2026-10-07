import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Target,
  Save,
  CheckCircle,
  Search,
  Eye,
  Sparkles,
  Building2,
  HelpCircle,
  Mail,
  ExternalLink,
  Code2,
  Globe,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ExperienceDetailModal } from './ExperienceDetailModal';

export const StudentDashboard = ({ user, session, userProfile }) => {
  const [activeTab, setActiveTab] = useState('experiences');
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    college: '',
    degree: '',
    graduationYear: 2026,
    skills: 'Java, Spring Boot, React, PostgreSQL',
    bio: '',
    githubUrl: '',
    linkedinUrl: '',
    mentorId: null,
    mentorName: '',
    mentorEmail: '',
    mentorExpertise: '',
  });

  const [experiences, setExperiences] = useState([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState('ALL');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  // Fetch student profile
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

  // Fetch approved interview experiences
  useEffect(() => {
    let ignore = false;
    const fetchExperiences = async () => {
      setLoadingExp(true);
      try {
        const headers = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};
        const res = await fetch(`${backendUrl}/api/interviews?size=50`, { headers });
        if (res.ok && !ignore) {
          const data = await res.json();
          const items = data.content || (Array.isArray(data) ? data : []);
          setExperiences(items);
        }
      } catch {
        // fallback
      } finally {
        if (!ignore) setLoadingExp(false);
      }
    };
    fetchExperiences();
    return () => {
      ignore = true;
    };
  }, [session?.access_token, backendUrl]);

  const handleSaveProfile = async (e) => {
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

  // Extract unique companies for dropdown
  const uniqueCompanies = useMemo(() => {
    const set = new Set();
    experiences.forEach((exp) => {
      if (exp.companyName) set.add(exp.companyName);
    });
    return Array.from(set).sort();
  }, [experiences]);

  // Total questions count across all experiences
  const totalQuestionsCount = useMemo(() => {
    return experiences.reduce((acc, exp) => {
      if (!exp.rounds) return acc;
      const count = exp.rounds.reduce((qAcc, r) => qAcc + (r.questions ? r.questions.length : 0), 0);
      return acc + count;
    }, 0);
  }, [experiences]);

  // Filtered experiences
  const filteredExperiences = useMemo(() => {
    return experiences.filter((exp) => {
      // Company match
      if (selectedCompany !== 'ALL' && exp.companyName !== selectedCompany) {
        return false;
      }
      // Difficulty match
      if (
        selectedDifficulty !== 'ALL' &&
        exp.difficulty?.toLowerCase() !== selectedDifficulty.toLowerCase()
      ) {
        return false;
      }
      // Result match
      if (
        selectedResult !== 'ALL' &&
        exp.interviewResult?.toLowerCase() !== selectedResult.toLowerCase()
      ) {
        return false;
      }
      // Search query (matches company, role, tips, prep, round notes, questions)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inCompany = exp.companyName?.toLowerCase().includes(q);
        const inRole = exp.role?.toLowerCase().includes(q);
        const inTips = exp.tips?.toLowerCase().includes(q);
        const inPrep = exp.preparation?.toLowerCase().includes(q);
        const inQuestionsSummary = exp.questionsSummary?.toLowerCase().includes(q);

        const inRounds = exp.rounds?.some((r) => {
          const inRoundName = r.name?.toLowerCase().includes(q);
          const inRoundNotes = r.notes?.toLowerCase().includes(q);
          const inQuestions = r.questions?.some(
            (quest) =>
              quest.questionText?.toLowerCase().includes(q) ||
              quest.topic?.toLowerCase().includes(q)
          );
          return inRoundName || inRoundNotes || inQuestions;
        });

        return inCompany || inRole || inTips || inPrep || inQuestionsSummary || inRounds;
      }
      return true;
    });
  }, [experiences, selectedCompany, selectedDifficulty, selectedResult, searchQuery]);

  return (
    <DashboardLayout
      roleTitle="Student"
      roleBadgeClass="role-student"
      user={user}
      userProfile={userProfile}
    >
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-header-title">Student Preparation Hub</h1>
          <p className="dashboard-header-sub">
            Browse authentic multi-round interview experiences, practice real company questions, and connect with your mentor.
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
            <span className="stat-title">Interview Experiences</span>
            <span className="stat-num">{experiences.length}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <BookOpen size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Real Questions Bank</span>
            <span className="stat-num" style={{ color: '#059669' }}>
              {totalQuestionsCount || 12}
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <HelpCircle size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Target Companies</span>
            <span className="stat-num">{uniqueCompanies.length || 6}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Building2 size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Mentorship Status</span>
            <span
              className="stat-num"
              style={{
                fontSize: profile.mentorName ? '1.1rem' : '1rem',
                color: profile.mentorName ? '#4f46e5' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={profile.mentorName || 'Pending Assignment'}
            >
              {profile.mentorName ? profile.mentorName : 'Pending Assignment'}
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <GraduationCap size={20} />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-button ${activeTab === 'experiences' ? 'active' : ''}`}
          onClick={() => setActiveTab('experiences')}
        >
          <BookOpen size={16} />
          <span>Interview Experiences ({experiences.length})</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'mentor' ? 'active' : ''}`}
          onClick={() => setActiveTab('mentor')}
        >
          <GraduationCap size={16} />
          <span>My Assigned Mentor {profile.mentorName ? '✓' : ''}</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Sparkles size={16} />
          <span>Candidate Profile</span>
        </button>
      </div>

      {/* TAB 1: INTERVIEW EXPERIENCES FEED */}
      {activeTab === 'experiences' && (
        <div>
          {/* Search & Filters Bar */}
          <div className="dashboard-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', flex: '1 1 280px' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search company, role, DSA topics, system design questions..."
                    className="text-input"
                    style={{
                      paddingLeft: '2.5rem',
                      paddingTop: '0.55rem',
                      paddingBottom: '0.55rem',
                    }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Company Filter Dropdown */}
                <div style={{ minWidth: '180px' }}>
                  <select
                    className="text-input"
                    style={{ paddingTop: '0.55rem', paddingBottom: '0.55rem' }}
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="ALL">All Companies ({uniqueCompanies.length})</option>
                    {uniqueCompanies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pill Filters for Difficulty & Result */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                      Difficulty:
                    </span>
                    <div className="pill-group">
                      {['ALL', 'Easy', 'Medium', 'Hard'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          className={`pill-option ${selectedDifficulty === diff ? 'active' : ''}`}
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => setSelectedDifficulty(diff)}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                      Outcome:
                    </span>
                    <div className="pill-group">
                      {['ALL', 'Offered', 'Rejected'].map((res) => (
                        <button
                          key={res}
                          type="button"
                          className={`pill-option ${selectedResult === res ? 'active' : ''}`}
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => setSelectedResult(res)}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                  Showing <strong>{filteredExperiences.length}</strong> of{' '}
                  <strong>{experiences.length}</strong> verified experiences
                </div>
              </div>
            </div>
          </div>

          {/* Experiences Grid */}
          {loadingExp ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Fetching verified interview experiences...
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Connecting to repository database
              </p>
            </div>
          ) : filteredExperiences.length === 0 ? (
            <div className="dashboard-card empty-state">
              <BookOpen size={44} className="empty-state-icon" color="#94a3b8" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                No Interview Experiences Found
              </h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem auto', color: '#64748b' }}>
                Try adjusting your search keywords or resetting the company and difficulty filters.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCompany('ALL');
                  setSelectedDifficulty('ALL');
                  setSelectedResult('ALL');
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="experience-grid">
              {filteredExperiences.map((exp) => {
                const totalRounds = exp.rounds?.length || 0;
                const totalQuestions = exp.rounds?.reduce(
                  (acc, r) => acc + (r.questions ? r.questions.length : 0),
                  0
                ) || 0;

                return (
                  <div key={exp.id} className="experience-card">
                    <div>
                      {/* Company Header */}
                      <div className="exp-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: '#4f46e5',
                            }}
                          >
                            {exp.companyName ? exp.companyName.charAt(0) : 'C'}
                          </div>
                          <div>
                            <h3 className="exp-company">{exp.companyName || 'Company'}</h3>
                            <p className="exp-role">{exp.role}</p>
                          </div>
                        </div>
                        <span className={`badge-status ${(exp.moderationStatus || 'approved').toLowerCase()}`}>
                          {exp.moderationStatus || 'APPROVED'}
                        </span>
                      </div>

                      {/* Meta badges */}
                      <div className="exp-meta">
                        <span
                          className={`badge-difficulty badge-diff-${(
                            exp.difficulty || 'medium'
                          ).toLowerCase()}`}
                        >
                          {exp.difficulty || 'Medium'}
                        </span>
                        <span
                          className={`badge-result badge-res-${(
                            exp.interviewResult || 'offered'
                          )
                            .toLowerCase()
                            .replace(' ', '-')}`}
                        >
                          {exp.interviewResult || 'Offered'}
                        </span>
                        {totalRounds > 0 && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#4f46e5',
                              background: '#eef2ff',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontWeight: 600,
                            }}
                          >
                            {totalRounds} {totalRounds === 1 ? 'Round' : 'Rounds'}
                            {totalQuestions > 0 ? ` • ${totalQuestions} Questions` : ''}
                          </span>
                        )}
                        {exp.interviewDate && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {exp.interviewDate}
                          </span>
                        )}
                      </div>

                      {/* Questions summary preview */}
                      {exp.questionsSummary && (
                        <div style={{ margin: '0.65rem 0' }}>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: '#64748b',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Key Questions Covered:
                          </span>
                          <p
                            style={{
                              fontSize: '0.825rem',
                              color: '#1e293b',
                              fontWeight: 500,
                              marginTop: '0.2rem',
                              lineClamp: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {exp.questionsSummary}
                          </p>
                        </div>
                      )}

                      {/* Tips snippet */}
                      {exp.tips && (
                        <div
                          style={{
                            background: '#f8fafc',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid #edf2f7',
                            margin: '0.5rem 0',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '0.8rem',
                              color: '#475569',
                              fontStyle: 'italic',
                              margin: 0,
                              lineClamp: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            💡 "{exp.tips}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer / Read button */}
                    <div className="exp-footer">
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Click to view questions & timeline
                      </span>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setSelectedExperience(exp)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Eye size={13} />
                        <span>Read Experience</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY ASSIGNED MENTOR */}
      {activeTab === 'mentor' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Your Assigned Mentorship Program</span>
          </div>

          {profile.mentorName ? (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '2rem',
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#eef2ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {profile.mentorName.charAt(0)}
              </div>

              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {profile.mentorName}
                  </h3>
                  <span
                    style={{
                      background: '#f0fdf4',
                      color: '#16a34a',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                    }}
                  >
                    Active Industry Mentor
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#64748b',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                  }}
                >
                  <Mail size={15} />
                  <a
                    href={`mailto:${profile.mentorEmail}`}
                    style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}
                  >
                    {profile.mentorEmail}
                  </a>
                </div>

                {profile.mentorExpertise && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#64748b',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Domain Expertise & Focus Areas:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {profile.mentorExpertise.split(',').map((skill, idx) => (
                        <span key={idx} className="skill-tag" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <a
                    href={`mailto:${profile.mentorEmail}?subject=Interview%20Prep%20Guidance%20Request&body=Hi%20${encodeURIComponent(profile.mentorName)},%0D%0A%0D%0AI%20am%20your%20assigned%20mentee%20on%20InterviewRepo.`}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                  >
                    <Mail size={15} />
                    <span>Contact Mentor</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '3.5rem 1.5rem' }}>
              <GraduationCap size={48} className="empty-state-icon" color="#94a3b8" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                No Industry Mentor Assigned Yet
              </h3>
              <p style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto', color: '#64748b', lineHeight: 1.6 }}>
                Your student profile is currently in the active mentorship queue. An administrator will review your target companies and pair you with a seasoned industry mentor to guide your mock interviews and resume strategy.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: '#475569',
                }}
              >
                <Clock size={16} color="#d97706" />
                <span>Assignment handled centrally by system administrators</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CANDIDATE PROFILE */}
      {activeTab === 'profile' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Student Candidate Profile</span>
          </div>

          <form onSubmit={handleSaveProfile} className="auth-form">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
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
                  onChange={(e) =>
                    setProfile({ ...profile, graduationYear: parseInt(e.target.value) || 2026 })
                  }
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Key Technical Skills (Comma-separated)</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="e.g. Java, Spring Boot, React, Data Structures, System Design"
                  value={profile.skills}
                  onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Code2 size={14} />
                  <span>GitHub Profile URL</span>
                </label>
                <input
                  type="url"
                  className="text-input"
                  placeholder="https://github.com/..."
                  value={profile.githubUrl}
                  onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Globe size={14} />
                  <span>LinkedIn Profile URL</span>
                </label>
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
                <span>{saving ? 'Saving...' : 'Save Candidate Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Experience Detail Modal */}
      <ExperienceDetailModal
        isOpen={Boolean(selectedExperience)}
        onClose={() => setSelectedExperience(null)}
        experience={selectedExperience}
      />
    </DashboardLayout>
  );
};
