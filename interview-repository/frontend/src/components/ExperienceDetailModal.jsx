import {
  X,
  Building,
  Calendar,
  Award,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Clock,
  User,
} from 'lucide-react';

export const ExperienceDetailModal = ({ isOpen, onClose, experience }) => {
  if (!isOpen || !experience) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 className="modal-title">{experience.companyName || 'Company'}</h2>
              <span className={`badge-difficulty badge-diff-${(experience.difficulty || 'medium').toLowerCase()}`}>
                {experience.difficulty || 'Medium'}
              </span>
              <span className={`badge-result badge-res-${(experience.interviewResult || 'pending').toLowerCase().replace(' ', '-')}`}>
                {experience.interviewResult || 'Pending'}
              </span>
              <span className={`badge-status ${(experience.moderationStatus || 'pending').toLowerCase()}`}>
                {experience.moderationStatus || 'PENDING'}
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
              {experience.role} • Interviewed on {experience.interviewDate || 'Recent'}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {experience.submitterName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
              <User size={14} />
              <span>Contributed by <strong>{experience.submitterName}</strong> ({experience.submitterEmail})</span>
            </div>
          )}

          {/* Rounds */}
          {experience.rounds && experience.rounds.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="form-section-title">
                <Building size={16} color="#4f46e5" />
                <span>Interview Rounds & Questions ({experience.rounds.length})</span>
              </div>

              {experience.rounds.map((round, rIdx) => (
                <div key={rIdx} className="round-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Round {round.roundOrder || rIdx + 1}: {round.name}
                    </h4>
                  </div>

                  {round.notes && (
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                      "{round.notes}"
                    </p>
                  )}

                  {round.questions && round.questions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {round.questions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          style={{
                            background: '#f8fafc',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #edf2f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <HelpCircle size={15} color="#6366f1" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                              {q.questionText}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            {q.topic && (
                              <span className="skill-tag" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                                {q.topic}
                              </span>
                            )}
                            {q.difficulty && (
                              <span className={`badge-difficulty badge-diff-${q.difficulty.toLowerCase()}`}>
                                {q.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>No specific questions logged for this round.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Preparation & Resources */}
          {experience.preparation && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="form-section-title">
                <Sparkles size={16} color="#4f46e5" />
                <span>Preparation Strategy</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
                {experience.preparation}
              </div>
            </div>
          )}

          {/* Tips */}
          {experience.tips && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="form-section-title">
                <CheckCircle size={16} color="#16a34a" />
                <span>Advice & Tips for Upcoming Candidates</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
                {experience.tips}
              </div>
            </div>
          )}

          {/* Timeline */}
          {experience.timeline && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="form-section-title">
                <Clock size={16} color="#0284c7" />
                <span>Hiring Timeline & Process</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.875rem', color: '#334155' }}>
                {experience.timeline}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
