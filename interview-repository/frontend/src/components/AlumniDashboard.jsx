import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  DollarSign,
  Share2,
  Save,
  CheckCircle,
  FileCheck,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Clock,
  Sparkles,
  ExternalLink,
  BookOpen,
  Search,
  HelpCircle,
  Globe,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ExperienceModal } from './ExperienceModal';
import { ExperienceDetailModal } from './ExperienceDetailModal';

export const AlumniDashboard = ({ user, session, userProfile }) => {
  const [activeTab, setActiveTab] = useState('community');
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    position: 'Software Development Engineer',
    graduationYear: 2024,
    experienceYears: 1,
    linkedinUrl: '',
    advice: '',
  });

  const [myExperiences, setMyExperiences] = useState([]);
  const [communityExperiences, setCommunityExperiences] = useState([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState('');

  // Search & Filter state for community feed
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [viewingExp, setViewingExp] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const fetchProfile = async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${backendUrl}/api/alumni/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setProfile({
            name: data.name || userProfile?.name || '',
            position: data.position || '',
            graduationYear: data.graduationYear || 2024,
            experienceYears: data.experienceYears || 0,
            linkedinUrl: data.linkedinUrl || '',
            advice: data.advice || '',
          });
        }
      }
    } catch {
      // offline fallback
    }
  };

  const fetchMyExperiences = async () => {
    if (!session?.access_token) return;
    setLoadingExp(true);
    try {
      const res = await fetch(`${backendUrl}/api/interviews/my`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyExperiences(data || []);
      }
    } catch {
      setMyExperiences([]);
    } finally {
      setLoadingExp(false);
    }
  };

  const fetchCommunityExperiences = async () => {
    setLoadingCommunity(true);
    try {
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const res = await fetch(`${backendUrl}/api/interviews?size=50`, { headers });
      if (res.ok) {
        const data = await res.json();
        const items = data.content || (Array.isArray(data) ? data : []);
        setCommunityExperiences(items);
      }
    } catch {
      setCommunityExperiences([]);
    } finally {
      setLoadingCommunity(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchMyExperiences();
    fetchCommunityExperiences();
  }, [session?.access_token, backendUrl]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
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
        setMessage('Failed to update profile');
      }
    } catch {
      setMessage('Network error while saving profile');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteExperience = async (id) => {
    if (!window.confirm('Are you sure you want to delete this interview experience submission?'))
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`${backendUrl}/api/interviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setMyExperiences((prev) => prev.filter((exp) => exp.id !== id));
        setCommunityExperiences((prev) => prev.filter((exp) => exp.id !== id));
        setMessage('Interview experience deleted successfully');
      } else {
        setMessage('Failed to delete experience');
      }
    } catch {
      setMessage('Network error while deleting experience');
    } finally {
      setDeletingId(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleOpenCreate = () => {
    setEditingExp(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExp(exp);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchMyExperiences();
    fetchCommunityExperiences();
    setMessage(
      editingExp ? 'Experience updated successfully!' : 'Experience submitted successfully!'
    );
    setTimeout(() => setMessage(''), 3000);
  };

  // Extract unique companies for community dropdown
  const uniqueCompanies = useMemo(() => {
    const set = new Set();
    communityExperiences.forEach((exp) => {
      if (exp.companyName) set.add(exp.companyName);
    });
    return Array.from(set).sort();
  }, [communityExperiences]);

  // Filtered community experiences
  const filteredCommunity = useMemo(() => {
    return communityExperiences.filter((exp) => {
      if (selectedCompany !== 'ALL' && exp.companyName !== selectedCompany) return false;
      if (
        selectedDifficulty !== 'ALL' &&
        exp.difficulty?.toLowerCase() !== selectedDifficulty.toLowerCase()
      )
        return false;
      if (
        selectedResult !== 'ALL' &&
        exp.interviewResult?.toLowerCase() !== selectedResult.toLowerCase()
      )
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inCompany = exp.companyName?.toLowerCase().includes(q);
        const inRole = exp.role?.toLowerCase().includes(q);
        const inTips = exp.tips?.toLowerCase().includes(q);
        const inPrep = exp.preparation?.toLowerCase().includes(q);
        const inQuestionsSummary = exp.questionsSummary?.toLowerCase().includes(q);
        const inRounds = exp.rounds?.some((r) => {
          const inRoundName = r.name?.toLowerCase().includes(q);
          const inQuestions = r.questions?.some((quest) =>
            quest.questionText?.toLowerCase().includes(q)
          );
          return inRoundName || inQuestions;
        });
        return inCompany || inRole || inTips || inPrep || inQuestionsSummary || inRounds;
      }
      return true;
    });
  }, [communityExperiences, selectedCompany, selectedDifficulty, selectedResult, searchQuery]);

  const approvedCount = myExperiences.filter((e) => e.moderationStatus === 'APPROVED').length;
  const pendingCount = myExperiences.filter((e) => e.moderationStatus === 'PENDING').length;

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
            Browse candidate preparation libraries, review peer experiences, and submit authentic interview journeys to guide upcoming batches.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOpenCreate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={16} />
          <span>Submit Experience</span>
        </button>
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
            <span className="stat-title">Community Experiences</span>
            <span className="stat-num">{communityExperiences.length}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#F2E1FF', color: '#9230E3' }}>
            <BookOpen size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">My Contributions</span>
            <span className="stat-num">{myExperiences.length}</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#F2E1FF', color: '#9230E3' }}>
            <FileCheck size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Live & Approved</span>
            <span className="stat-num" style={{ color: '#3d8c74' }}>
              {approvedCount}
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#3d8c74' }}>
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-title">Designation</span>
            <span className="stat-num" style={{ fontSize: '1.15rem' }}>
              {profile.position || 'Software Engineer'}
            </span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#f6eedb', color: '#9a7a3a' }}>
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <BookOpen size={16} />
          <span>Browse Community Experiences ({communityExperiences.length})</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'my_submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('my_submissions')}
        >
          <FileCheck size={16} />
          <span>My Submissions History ({myExperiences.length})</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Sparkles size={16} />
          <span>Alumni Profile & Guidance</span>
        </button>
      </div>

      {/* TAB 1: BROWSE COMMUNITY EXPERIENCES */}
      {activeTab === 'community' && (
        <div>
          {/* Search & Filter Bar */}
          <div className="dashboard-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 280px' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6766B7',
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

                <button
                  className="btn btn-primary"
                  onClick={handleOpenCreate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                >
                  <Plus size={15} />
                  <span>Submit Experience</span>
                </button>
              </div>

              {/* Pill Filters */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderTop: '1px solid #EAEAF7',
                  paddingTop: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#353454' }}>
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
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#353454' }}>
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

                <div style={{ fontSize: '0.8rem', color: '#353454', fontWeight: 500 }}>
                  Showing <strong>{filteredCommunity.length}</strong> of{' '}
                  <strong>{communityExperiences.length}</strong> verified experiences
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          {loadingCommunity ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: '#353454' }}>
              Loading community experiences...
            </div>
          ) : filteredCommunity.length === 0 ? (
            <div className="dashboard-card empty-state">
              <BookOpen size={44} className="empty-state-icon" color="#6766B7" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#23304D', marginBottom: '0.35rem' }}>
                No Experiences Found
              </h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem auto', color: '#353454' }}>
                Try adjusting your search criteria or contribute the first experience for this company!
              </p>
              <button className="btn btn-primary" onClick={handleOpenCreate}>
                <Plus size={15} />
                <span>Submit Experience</span>
              </button>
            </div>
          ) : (
            <div className="experience-grid">
              {filteredCommunity.map((exp) => {
                const totalRounds = exp.rounds?.length || 0;
                const totalQuestions =
                  exp.rounds?.reduce(
                    (acc, r) => acc + (r.questions ? r.questions.length : 0),
                    0
                  ) || 0;

                return (
                  <div key={exp.id} className="experience-card">
                    <div>
                      <div className="exp-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: '#F2E1FF',
                              border: '1px solid #F2E1FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: '#9230E3',
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
                              color: '#9230E3',
                              background: '#F2E1FF',
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
                          <span style={{ fontSize: '0.75rem', color: '#353454' }}>
                            {exp.interviewDate}
                          </span>
                        )}
                      </div>

                      {exp.questionsSummary && (
                        <div style={{ margin: '0.65rem 0' }}>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: '#353454',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Key Questions:
                          </span>
                          <p
                            style={{
                              fontSize: '0.825rem',
                              color: '#23304D',
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

                      {exp.tips && (
                        <div
                          style={{
                            background: '#EAEAF7',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid #C8C7EB',
                            margin: '0.5rem 0',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '0.8rem',
                              color: '#353454',
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

                    <div className="exp-footer">
                      <span style={{ fontSize: '0.75rem', color: '#6766B7' }}>
                        Verified placement review
                      </span>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setViewingExp(exp)}
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

      {/* TAB 2: MY SUBMISSIONS & HISTORY */}
      {activeTab === 'my_submissions' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>My Submitted Interview Experiences</span>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleOpenCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={14} />
              <span>Submit New Experience</span>
            </button>
          </div>

          {loadingExp ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#353454' }}>
              Loading your submitted experiences...
            </div>
          ) : myExperiences.length === 0 ? (
            <div className="empty-state">
              <FileCheck size={40} className="empty-state-icon" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#23304D', marginBottom: '0.35rem' }}>
                No Interview Experiences Submitted Yet
              </h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
                Pay it forward! Share your interview rounds, questions asked, and placement preparation tips to guide junior students.
              </p>
              <button className="btn btn-primary" onClick={handleOpenCreate}>
                <Plus size={15} />
                <span>Submit Your First Experience</span>
              </button>
            </div>
          ) : (
            <div className="experience-grid">
              {myExperiences.map((exp) => (
                <div key={exp.id} className="experience-card">
                  <div>
                    <div className="exp-header">
                      <div>
                        <h3 className="exp-company">{exp.companyName || 'Company'}</h3>
                        <p className="exp-role">{exp.role}</p>
                      </div>
                      <span className={`badge-status ${(exp.moderationStatus || 'pending').toLowerCase()}`}>
                        {exp.moderationStatus || 'PENDING'}
                      </span>
                    </div>

                    <div className="exp-meta">
                      <span className={`badge-difficulty badge-diff-${(exp.difficulty || 'medium').toLowerCase()}`}>
                        {exp.difficulty || 'Medium'}
                      </span>
                      <span className={`badge-result badge-res-${(exp.interviewResult || 'pending').toLowerCase().replace(' ', '-')}`}>
                        {exp.interviewResult || 'Offered'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#353454' }}>
                        {exp.interviewDate ? `Date: ${exp.interviewDate}` : ''}
                      </span>
                    </div>

                    {exp.rounds && exp.rounds.length > 0 && (
                      <p style={{ fontSize: '0.8rem', color: '#353454', margin: '0.5rem 0' }}>
                        Includes <strong>{exp.rounds.length} rounds</strong> with specific questions.
                      </p>
                    )}

                    {exp.tips && (
                      <p
                        style={{
                          fontSize: '0.825rem',
                          color: '#353454',
                          fontStyle: 'italic',
                          margin: '0.5rem 0',
                          lineClamp: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        "{exp.tips}"
                      </p>
                    )}
                  </div>

                  <div className="exp-footer">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setViewingExp(exp)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleOpenEdit(exp)}
                        title="Edit Experience"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="btn btn-sm btn-danger-outline"
                        onClick={() => handleDeleteExperience(exp.id)}
                        disabled={deletingId === exp.id}
                        title="Delete Experience"
                      >
                        <Trash2 size={13} />
                        <span>{deletingId === exp.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALUMNI PROFILE */}
      {activeTab === 'profile' && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Alumni Placement & Mentor Details</span>
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

              <div className="form-group">
                <label className="field-label">Current Designation / Role</label>
                <input
                  type="text"
                  className="text-input"
                  value={profile.position}
                  onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Graduation Year</label>
                <input
                  type="number"
                  className="text-input"
                  value={profile.graduationYear}
                  onChange={(e) => setProfile({ ...profile, graduationYear: parseInt(e.target.value) || 2024 })}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Years of Industry Experience</label>
                <input
                  type="number"
                  className="text-input"
                  value={profile.experienceYears}
                  onChange={(e) => setProfile({ ...profile, experienceYears: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Globe size={14} />
                  <span>LinkedIn Profile URL</span>
                </label>
                <input
                  type="url"
                  className="text-input"
                  placeholder="https://linkedin.com/in/yourname"
                  value={profile.linkedinUrl}
                  onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Strategic Advice for Upcoming Batches</label>
                <textarea
                  className="text-input"
                  rows={4}
                  placeholder="Share insights on resume preparation, coding contests, cold outreach, and what hiring managers look for..."
                  value={profile.advice}
                  onChange={(e) => setProfile({ ...profile, advice: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                <Save size={15} />
                <span>{savingProfile ? 'Saving...' : 'Save Alumni Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Experience Submit/Edit Modal */}
      <ExperienceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialData={editingExp}
        session={session}
        backendUrl={backendUrl}
      />

      {/* Experience Detail View Modal */}
      <ExperienceDetailModal
        isOpen={Boolean(viewingExp)}
        onClose={() => setViewingExp(null)}
        experience={viewingExp}
      />
    </DashboardLayout>
  );
};
