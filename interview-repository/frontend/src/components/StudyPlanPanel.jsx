import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Trash2, Plus, Target } from 'lucide-react';
import { createApi } from '../lib/api';

const STATUSES = ['Not Started', 'In Progress', 'Completed'];
const STATUS_COLORS = {
  'Not Started': { background: '#f1f5f9', color: '#475569' },
  'In Progress': { background: '#fef3c7', color: '#854d0e' },
  Completed: { background: '#dcfce7', color: '#166534' },
};

const ProgressBar = ({ percent }) => (
  <div
    style={{
      background: '#e2e8f0',
      borderRadius: '999px',
      height: '8px',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        width: `${percent}%`,
        background: '#4f46e5',
        height: '100%',
        transition: 'width 0.3s',
      }}
    />
  </div>
);

const TopicRow = ({ item, onSave, onDelete }) => {
  const [score, setScore] = useState(item.score ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const dirty = String(score) !== String(item.score ?? '') || notes !== (item.notes ?? '');

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.9rem 1rem',
        display: 'grid',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>
            {item.priority ? `#${item.priority} ` : ''}
            {item.topic}
          </div>
          {item.category && <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.category}</div>}
        </div>
        <div className="inline-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="text-input"
            value={item.status}
            onChange={(e) => onSave(item.id, { status: e.target.value })}
            style={{
              ...STATUS_COLORS[item.status],
              width: 'auto',
              fontWeight: 600,
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={() => onDelete(item.id)} title="Remove topic">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {item.sampleQuestions?.length > 0 && (
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>Practice: {item.sampleQuestions.join(' · ')}</div>
      )}
      <div className="inline-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          className="text-input"
          type="number"
          min="0"
          max="100"
          placeholder="Score %"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          style={{ width: '110px', paddingLeft: '1rem' }}
        />
        <input
          className="text-input"
          type="text"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ flex: 1, minWidth: '180px', paddingLeft: '1rem' }}
        />
        {dirty && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() =>
              onSave(item.id, {
                score: score === '' ? null : Number(score),
                notes,
              })
            }
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
};

export const StudyPlanPanel = ({ session, backendUrl }) => {
  const api = useMemo(() => createApi(backendUrl, session?.access_token), [backendUrl, session?.access_token]);
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    company: '',
    role: '',
    daysAvailable: 14,
  });
  const [newTopic, setNewTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(
    () => Promise.all([api.get('/api/study-plans'), api.get('/api/progress/summary')]),
    [api],
  );

  const apply = ([planList, progressSummary]) => {
    setPlans(planList);
    setSummary(progressSummary);
    setSelectedId((current) => current ?? planList[0]?.id ?? null);
    setError('');
  };

  // Reload after a change made by the user.
  const refresh = async () => {
    try {
      apply(await fetchAll());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!session?.access_token) return undefined;
    let ignore = false;
    fetchAll()
      .then((data) => !ignore && apply(data))
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [fetchAll, session?.access_token]);

  const selected = plans.find((p) => p.id === selectedId) || null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || generating) return;
    setGenerating(true);
    setError('');
    try {
      const plan = await api.post('/api/study-plans/generate', {
        company: form.company.trim(),
        role: form.role.trim() || null,
        daysAvailable: Number(form.daysAvailable) || 14,
      });
      setSelectedId(plan.id);
      setForm({ company: '', role: '', daysAvailable: 14 });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateTopic = async (id, changes) => {
    try {
      await api.patch(`/api/progress/${id}`, changes);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTopic = async (id) => {
    try {
      await api.del(`/api/progress/${id}`);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const addTopic = async (e) => {
    e.preventDefault();
    if (!newTopic.trim() || !selected) return;
    try {
      await api.post('/api/progress', {
        studyPlanId: selected.id,
        topic: newTopic.trim(),
      });
      setNewTopic('');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const deletePlan = async (id) => {
    if (!window.confirm('Delete this study plan and its progress?')) return;
    try {
      await api.del(`/api/study-plans/${id}`);
      setSelectedId(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const plan = selected?.plan || {};

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div className="dashboard-card">
        <div className="card-heading">
          <span>Generate an AI Study Plan</span>
        </div>
        <form className="inline-row" onSubmit={handleGenerate} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="text-input"
            placeholder="Company (e.g. Amazon)"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            disabled={generating}
            style={{ flex: 2, minWidth: '180px', paddingLeft: '1rem' }}
            required
          />
          <input
            className="text-input"
            placeholder="Role (e.g. SDE-1)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            disabled={generating}
            style={{ flex: 2, minWidth: '140px', paddingLeft: '1rem' }}
          />
          <input
            className="text-input"
            type="number"
            min="1"
            max="180"
            title="Days available"
            value={form.daysAvailable}
            onChange={(e) => setForm({ ...form, daysAvailable: e.target.value })}
            disabled={generating}
            style={{ width: '100px', paddingLeft: '1rem' }}
          />
          <button className="btn btn-primary" type="submit" disabled={generating || !form.company.trim()}>
            <Sparkles size={16} />
            <span>{generating ? 'Generating… (up to a minute)' : 'Generate plan'}</span>
          </button>
        </form>
        {error && <p style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{error}</p>}
      </div>

      {summary && summary.totalTopics > 0 && (
        <div className="dashboard-card">
          <div className="card-heading">
            <span>Overall Progress</span>
          </div>
          <ProgressBar percent={summary.completionPercent} />
          <p style={{ color: '#475569', marginTop: '0.5rem' }}>
            {summary.completed} of {summary.totalTopics} topics completed ({summary.completionPercent}%) ·{' '}
            {summary.inProgress} in progress
            {summary.averageScore != null ? ` · average score ${summary.averageScore}%` : ''}
          </p>
        </div>
      )}

      {loading && plans.length === 0 && <p style={{ color: '#64748b' }}>Loading study plans…</p>}
      {!loading && plans.length === 0 && (
        <div className="dashboard-card empty-state">
          <Target size={28} />
          <p>No study plans yet. Generate one above to get a personalised, AI-built plan.</p>
        </div>
      )}

      {plans.length > 0 && (
        <div className="inline-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn ${p.id === selectedId ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedId(p.id)}
            >
              {p.title} · {p.completionPercent}%
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="dashboard-card" style={{ display: 'grid', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>{selected.title}</h3>
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {selected.status} · {selected.startDate} → {selected.targetDate}
                {plan.evidence_source ? ` · source: ${plan.evidence_source}` : ''}
              </div>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => deletePlan(selected.id)}>
              <Trash2 size={14} />
              <span>Delete plan</span>
            </button>
          </div>
          <ProgressBar percent={selected.completionPercent} />
          {selected.description && <p style={{ margin: 0 }}>{selected.description}</p>}
          {plan.schedule_suggestion && (
            <div>
              <strong>Schedule</strong>
              <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{plan.schedule_suggestion}</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <strong>Topics</strong>
            {selected.progress.map((item) => (
              <TopicRow key={`${item.id}-${item.updatedAt}`} item={item} onSave={updateTopic} onDelete={deleteTopic} />
            ))}
            <form className="inline-row" onSubmit={addTopic} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="text-input"
                placeholder="Add your own topic"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                style={{ flex: '1 1 240px', width: 'auto', minWidth: '200px', paddingLeft: '1rem' }}
              />
              <button className="btn btn-secondary" type="submit" disabled={!newTopic.trim()}>
                <Plus size={14} />
                <span>Add</span>
              </button>
            </form>
          </div>

          {plan.rounds?.length > 0 && (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <strong>Interview rounds</strong>
              {plan.rounds.map((r, i) => (
                <details
                  key={i}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.6rem 0.9rem',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                    {r.ordinal ? `${r.ordinal}. ` : ''}
                    {r.round_type?.replaceAll('_', ' ')}
                  </summary>
                  <p>{r.description}</p>
                  {r.key_topics?.length > 0 && <p>Key topics: {r.key_topics.join(', ')}</p>}
                  {r.preparation_tips?.length > 0 && (
                    <ul>
                      {r.preparation_tips.map((t, j) => (
                        <li key={j}>{t}</li>
                      ))}
                    </ul>
                  )}
                </details>
              ))}
            </div>
          )}

          {plan.overall_tips?.length > 0 && (
            <div>
              <strong>Tips</strong>
              <ul style={{ margin: '0.25rem 0 0' }}>
                {plan.overall_tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
