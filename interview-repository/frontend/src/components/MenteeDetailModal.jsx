import { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  ExternalLink,
  Code2,
  Globe,
  FileText,
  Briefcase,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const MenteeDetailModal = ({
  isOpen,
  onClose,
  mentee,
  session,
  backendUrl = 'http://localhost:8080',
}) => {
  const [experiences, setExperiences] = useState([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [expandedExpId, setExpandedExpId] = useState(null);

  useEffect(() => {
    if (!isOpen || !mentee?.id || !session?.access_token) return;
    let ignore = false;
    const fetchExperiences = async () => {
      setLoadingExp(true);
      try {
        const res = await fetch(`${backendUrl}/api/mentor/mentees/${mentee.id}/experiences`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !ignore) {
          const data = await res.json();
          setExperiences(data || []);
        }
      } catch {
        if (!ignore) setExperiences([]);
      } finally {
        if (!ignore) setLoadingExp(false);
      }
    };
    fetchExperiences();
    return () => {
      ignore = true;
    };
  }, [isOpen, mentee?.id, session?.access_token, backendUrl]);

  if (!isOpen || !mentee) return null;

  const skillsList = mentee.skills
    ? mentee.skills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const toggleExpand = (id) => {
    setExpandedExpId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="mentee-avatar" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
              {(mentee.name || mentee.email || 'M').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="modal-title">{mentee.name || 'Mentee Profile'}</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>
                {mentee.email} {mentee.phone ? `• ${mentee.phone}` : ''}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Academic & Background Info */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  College / Institute
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginTop: '0.2rem' }}>
                  {mentee.college || 'Not specified'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Degree & Major
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginTop: '0.2rem' }}>
                  {mentee.degree || 'Not specified'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Graduation Year
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginTop: '0.2rem' }}>
                  {mentee.graduationYear || '2025'}
                </p>
              </div>
            </div>

            {/* Links Row */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              {mentee.linkedinURL && (
                <a
                  href={mentee.linkedinURL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#0a66c2', fontWeight: 600, textDecoration: 'none' }}
                >
                  <Globe size={15} />
                  <span>LinkedIn Profile</span>
                  <ExternalLink size={12} />
                </a>
              )}
              {mentee.githubURL && (
                <a
                  href={mentee.githubURL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#24292f', fontWeight: 600, textDecoration: 'none' }}
                >
                  <Code2 size={15} />
                  <span>GitHub Profile</span>
                  <ExternalLink size={12} />
                </a>
              )}
              {mentee.resumeURL && (
                <a
                  href={mentee.resumeURL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
                >
                  <FileText size={15} />
                  <span>Resume Document</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {/* Skills */}
            {skillsList.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Technical Skills
                </span>
                <div className="skills-wrap" style={{ marginTop: '0.35rem' }}>
                  {skillsList.map((skill, i) => (
                    <span key={i} className="skill-tag" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.775rem' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {mentee.bio && (
              <div style={{ marginTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Candidate Summary
                </span>
                <p style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  {mentee.bio}
                </p>
              </div>
            )}
          </div>

          {/* Mentee's Submitted Experiences */}
          <div>
            <div className="form-section-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={16} color="#4f46e5" />
                <span>Submitted Interview Experiences ({experiences.length})</span>
              </div>
            </div>

            {loadingExp ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Loading mentee experiences...
              </div>
            ) : experiences.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Briefcase size={28} className="empty-state-icon" />
                <p style={{ margin: 0 }}>This mentee has not submitted any interview experiences yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {experiences.map((exp) => {
                  const isExpanded = expandedExpId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        onClick={() => toggleExpand(exp.id)}
                        style={{
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isExpanded ? '#f8fafc' : '#ffffff',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                              {exp.companyName || 'Company'}
                            </strong>
                            <span className={`badge-difficulty badge-diff-${(exp.difficulty || 'medium').toLowerCase()}`}>
                              {exp.difficulty || 'Medium'}
                            </span>
                            <span className={`badge-result badge-res-${(exp.interviewResult || 'pending').toLowerCase().replace(' ', '-')}`}>
                              {exp.interviewResult || 'Offered'}
                            </span>
                            <span className={`badge-status ${(exp.moderationStatus || 'pending').toLowerCase()}`}>
                              {exp.moderationStatus}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                            {exp.role} • {exp.interviewDate || 'Recent'} • {exp.rounds ? `${exp.rounds.length} rounds` : 'Rounds available'}
                          </span>
                        </div>

                        <div style={{ color: '#64748b' }}>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                          {exp.rounds && exp.rounds.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                                Interview Rounds & Questions Logged:
                              </h5>
                              {exp.rounds.map((round, rIdx) => (
                                <div key={rIdx} style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                                    Round {round.roundOrder || rIdx + 1}: {round.name}
                                  </div>
                                  {round.notes && (
                                    <div style={{ fontSize: '0.785rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.2rem' }}>
                                      {round.notes}
                                    </div>
                                  )}
                                  {round.questions && round.questions.length > 0 && (
                                    <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0, fontSize: '0.825rem', color: '#1e293b' }}>
                                      {round.questions.map((q, qIdx) => (
                                        <li key={qIdx} style={{ marginBottom: '0.25rem' }}>
                                          {q.questionText} {q.topic && <span style={{ color: '#6366f1' }}>({q.topic})</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {exp.preparation && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.785rem', fontWeight: 600, color: '#64748b' }}>Preparation Strategy:</span>
                              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: '#334155', lineHeight: 1.5 }}>
                                {exp.preparation}
                              </p>
                            </div>
                          )}

                          {exp.tips && (
                            <div>
                              <span style={{ fontSize: '0.785rem', fontWeight: 600, color: '#64748b' }}>Tips & Advice:</span>
                              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: '#334155', lineHeight: 1.5 }}>
                                {exp.tips}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
