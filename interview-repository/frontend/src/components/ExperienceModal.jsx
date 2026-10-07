import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Building,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export const ExperienceModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  session,
  backendUrl = 'http://localhost:8080',
}) => {
  const isEditing = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    companyName: '',
    role: '',
    interviewDate: new Date().toISOString().split('T')[0],
    difficulty: 'Medium',
    interviewResult: 'Offered',
    questionsSummary: '',
    tips: '',
    preparation: '',
    timeline: '',
    consentGiven: true,
    rounds: [
      {
        roundOrder: 1,
        name: 'Technical Round 1: Coding & Core CS',
        notes: '',
        questions: [
          {
            questionOrder: 1,
            questionText: '',
            topic: 'DSA',
            difficulty: 'Medium',
          },
        ],
      },
    ],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName || '',
        role: initialData.role || '',
        interviewDate: initialData.interviewDate || new Date().toISOString().split('T')[0],
        difficulty: initialData.difficulty || 'Medium',
        interviewResult: initialData.interviewResult || 'Offered',
        questionsSummary: initialData.questionsSummary || '',
        tips: initialData.tips || '',
        preparation: initialData.preparation || '',
        timeline: initialData.timeline || '',
        consentGiven: initialData.consentGiven !== undefined ? initialData.consentGiven : true,
        rounds: initialData.rounds && initialData.rounds.length > 0
          ? initialData.rounds.map((r, rIdx) => ({
              roundOrder: r.roundOrder || rIdx + 1,
              name: r.name || `Round ${rIdx + 1}`,
              notes: r.notes || '',
              questions: r.questions && r.questions.length > 0
                ? r.questions.map((q, qIdx) => ({
                    questionOrder: q.questionOrder || qIdx + 1,
                    questionText: q.questionText || '',
                    topic: q.topic || 'General',
                    difficulty: q.difficulty || 'Medium',
                  }))
                : [
                    {
                      questionOrder: 1,
                      questionText: '',
                      topic: 'DSA',
                      difficulty: 'Medium',
                    },
                  ],
            }))
          : [
              {
                roundOrder: 1,
                name: 'Technical Round 1',
                notes: '',
                questions: [
                  {
                    questionOrder: 1,
                    questionText: '',
                    topic: 'DSA',
                    difficulty: 'Medium',
                  },
                ],
              },
            ],
      });
    } else {
      setFormData({
        companyName: '',
        role: '',
        interviewDate: new Date().toISOString().split('T')[0],
        difficulty: 'Medium',
        interviewResult: 'Offered',
        questionsSummary: '',
        tips: '',
        preparation: '',
        timeline: '',
        consentGiven: true,
        rounds: [
          {
            roundOrder: 1,
            name: 'Technical Round 1: Coding & Core CS',
            notes: '',
            questions: [
              {
                questionOrder: 1,
                questionText: '',
                topic: 'DSA',
                difficulty: 'Medium',
              },
            ],
          },
        ],
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddRound = () => {
    setFormData((prev) => ({
      ...prev,
      rounds: [
        ...prev.rounds,
        {
          roundOrder: prev.rounds.length + 1,
          name: `Round ${prev.rounds.length + 1}: Technical / Managerial`,
          notes: '',
          questions: [
            {
              questionOrder: 1,
              questionText: '',
              topic: 'System Design',
              difficulty: 'Medium',
            },
          ],
        },
      ],
    }));
  };

  const handleRemoveRound = (roundIdx) => {
    if (formData.rounds.length <= 1) return;
    setFormData((prev) => {
      const filtered = prev.rounds.filter((_, i) => i !== roundIdx);
      return {
        ...prev,
        rounds: filtered.map((r, i) => ({ ...r, roundOrder: i + 1 })),
      };
    });
  };

  const handleRoundChange = (roundIdx, field, val) => {
    setFormData((prev) => {
      const nextRounds = [...prev.rounds];
      nextRounds[roundIdx] = { ...nextRounds[roundIdx], [field]: val };
      return { ...prev, rounds: nextRounds };
    });
  };

  const handleAddQuestion = (roundIdx) => {
    setFormData((prev) => {
      const nextRounds = [...prev.rounds];
      const curQuestions = nextRounds[roundIdx].questions || [];
      nextRounds[roundIdx] = {
        ...nextRounds[roundIdx],
        questions: [
          ...curQuestions,
          {
            questionOrder: curQuestions.length + 1,
            questionText: '',
            topic: 'Problem Solving',
            difficulty: 'Medium',
          },
        ],
      };
      return { ...prev, rounds: nextRounds };
    });
  };

  const handleRemoveQuestion = (roundIdx, qIdx) => {
    setFormData((prev) => {
      const nextRounds = [...prev.rounds];
      const filtered = nextRounds[roundIdx].questions.filter((_, i) => i !== qIdx);
      nextRounds[roundIdx] = {
        ...nextRounds[roundIdx],
        questions: filtered.map((q, i) => ({ ...q, questionOrder: i + 1 })),
      };
      return { ...prev, rounds: nextRounds };
    });
  };

  const handleQuestionChange = (roundIdx, qIdx, field, val) => {
    setFormData((prev) => {
      const nextRounds = [...prev.rounds];
      const nextQ = [...nextRounds[roundIdx].questions];
      nextQ[qIdx] = { ...nextQ[qIdx], [field]: val };
      nextRounds[roundIdx] = { ...nextRounds[roundIdx], questions: nextQ };
      return { ...prev, rounds: nextRounds };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setError('Please provide the company name');
      return;
    }
    if (!formData.role.trim()) {
      setError('Please specify the role or position interviewed for');
      return;
    }
    if (!formData.consentGiven) {
      setError('You must give consent to publish this experience for student reference');
      return;
    }

    setLoading(true);
    setError('');

    // Filter out completely empty questions from rounds
    const sanitizedRounds = formData.rounds.map((r, rIdx) => ({
      roundOrder: rIdx + 1,
      name: r.name || `Round ${rIdx + 1}`,
      notes: r.notes || '',
      questions: (r.questions || [])
        .filter((q) => q.questionText && q.questionText.trim())
        .map((q, qIdx) => ({
          questionOrder: qIdx + 1,
          questionText: q.questionText.trim(),
          topic: q.topic || 'General',
          difficulty: q.difficulty || 'Medium',
        })),
    }));

    const payload = {
      companyName: formData.companyName.trim(),
      role: formData.role.trim(),
      interviewDate: formData.interviewDate,
      difficulty: formData.difficulty,
      interviewResult: formData.interviewResult,
      experience: formData.preparation || formData.tips || 'Interview experience details provided.',
      questionsSummary: formData.questionsSummary,
      tips: formData.tips,
      preparation: formData.preparation,
      timeline: formData.timeline,
      consentGiven: formData.consentGiven,
      rounds: sanitizedRounds,
    };

    try {
      const url = isEditing
        ? `${backendUrl}/api/interviews/${initialData.id}`
        : `${backendUrl}/api/interviews`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to submit experience (HTTP ${res.status})`);
      }

      const result = await res.json();
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while saving the experience');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isEditing ? 'Edit Interview Experience' : 'Submit Interview Experience'}
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#353454', marginTop: '0.2rem' }}>
              Share authentic questions, rounds, and preparation guidance for prospective candidates.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            {error && (
              <div className="auth-alert auth-alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Target Organization & Role */}
            <div className="form-section-title">
              <Building size={16} color="#9230E3" />
              <span>Target Organization & Role</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="field-label">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, Microsoft, Adobe..."
                  className="text-input"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Role / Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SDE 1, Frontend Developer..."
                  className="text-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Interview Date</label>
                <input
                  type="date"
                  className="text-input"
                  value={formData.interviewDate}
                  onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
                />
              </div>
            </div>

            {/* Selectors for Difficulty and Result */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="field-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                  Interview Difficulty
                </label>
                <div className="pill-group">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      className={`pill-option ${formData.difficulty === diff ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, difficulty: diff })}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                  Interview Outcome
                </label>
                <div className="pill-group">
                  {['Offered', 'Rejected', 'In Progress'].map((res) => (
                    <button
                      key={res}
                      type="button"
                      className={`pill-option ${formData.interviewResult === res ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, interviewResult: res })}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Rounds & Questions */}
            <div className="form-section-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={16} color="#9230E3" />
                <span>Interview Rounds & Questions</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleAddRound}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={14} />
                <span>Add Round</span>
              </button>
            </div>

            {formData.rounds.map((round, rIdx) => (
              <div key={rIdx} className="round-card">
                <div className="round-header">
                  <span className="round-title">Round {rIdx + 1}</span>
                  {formData.rounds.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => handleRemoveRound(rIdx)}
                      title="Remove round"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label className="field-label">Round Name</label>
                    <input
                      type="text"
                      className="text-input"
                      value={round.name}
                      onChange={(e) => handleRoundChange(rIdx, 'name', e.target.value)}
                      placeholder="e.g. Coding Round, Managerial"
                    />
                  </div>
                  <div>
                    <label className="field-label">Round Notes / Focus</label>
                    <input
                      type="text"
                      className="text-input"
                      value={round.notes}
                      onChange={(e) => handleRoundChange(rIdx, 'notes', e.target.value)}
                      placeholder="Key topics tested, platform used, interviewer demeanor..."
                    />
                  </div>
                </div>

                {/* Questions in Round */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#353454' }}>
                      Questions Asked in this Round
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion(rIdx)}
                      className="btn btn-sm"
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        background: '#F2E1FF',
                        color: '#461F65',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Plus size={12} />
                      <span>Add Question</span>
                    </button>
                  </div>

                  {round.questions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 110px auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                        background: '#ffffff',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #C8C7EB',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="e.g. Invert a binary tree, implement LRU cache..."
                        className="text-input"
                        style={{ fontSize: '0.825rem', padding: '0.4rem 0.6rem' }}
                        value={q.questionText}
                        onChange={(e) => handleQuestionChange(rIdx, qIdx, 'questionText', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Topic (DSA/SQL)"
                        className="text-input"
                        style={{ fontSize: '0.825rem', padding: '0.4rem 0.6rem' }}
                        value={q.topic}
                        onChange={(e) => handleQuestionChange(rIdx, qIdx, 'topic', e.target.value)}
                      />
                      <select
                        className="text-input"
                        style={{ fontSize: '0.825rem', padding: '0.4rem 0.5rem' }}
                        value={q.difficulty}
                        onChange={(e) => handleQuestionChange(rIdx, qIdx, 'difficulty', e.target.value)}
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                      {round.questions.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => handleRemoveQuestion(rIdx, qIdx)}
                          title="Remove question"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Section 3: Preparation, Tips & Advice */}
            <div className="form-section-title">
              <Sparkles size={16} color="#9230E3" />
              <span>Preparation Strategy & Tips for Juniors</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="field-label">How did you prepare? (Resources, leetcode count, courses)</label>
                <textarea
                  className="text-input"
                  rows={3}
                  placeholder="e.g. Striver's SDE sheet, NeetCode 150, Designing Data-Intensive Applications..."
                  value={formData.preparation}
                  onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Do's and Don'ts / Interview Day Tips</label>
                <textarea
                  className="text-input"
                  rows={3}
                  placeholder="e.g. Think out loud, clarify edge cases before coding, ask good questions at the end..."
                  value={formData.tips}
                  onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Hiring Timeline & Process Duration</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="e.g. Applied via referral, OA in 2 weeks, 3 rounds in 1 day, offer in 4 days"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                />
              </div>
            </div>

            {/* Consent Checkbox */}
            <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#EAEAF7', borderRadius: '10px', border: '1px solid #C8C7EB' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', color: '#353454' }}>
                <input
                  type="checkbox"
                  checked={formData.consentGiven}
                  onChange={(e) => setFormData({ ...formData, consentGiven: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#9230E3' }}
                />
                <span>
                  I confirm that this experience record is accurate and give consent for it to be indexed and shared for candidate interview preparation.
                </span>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isEditing ? 'Save Changes' : 'Submit Experience'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
