import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Trash2,
  Plus,
  Minus,
  Target,
  Check,
  Circle,
  CircleDot,
  ChevronDown,
  CalendarDays,
} from 'lucide-react';
import { PageHeader, SectionHeader, ProgressBar, Tag, EmptyState, ErrorState, Skeleton, Button } from '../ui/ui';
import { formatDate } from '../../lib/format';
import { useStudentData } from './StudentData';

const STEPS = [
  { value: 'Not Started', label: 'Not started', icon: Circle },
  { value: 'In Progress', label: 'In progress', icon: CircleDot },
  { value: 'Completed', label: 'Done', icon: Check },
];

const DAY_PRESETS = [7, 14, 30];

/** Status as a 3-step toggle instead of a dropdown. */
const StatusSteps = ({ value, onChange, topic }) => (
  <div className="ws-segmented" role="radiogroup" aria-label={`Status of ${topic}`}>
    {STEPS.map(({ value: v, label, icon: Icon }) => (
      <button
        key={v}
        type="button"
        role="radio"
        aria-checked={value === v}
        aria-pressed={value === v}
        onClick={() => value !== v && onChange(v)}
      >
        <Icon size={13} aria-hidden="true" /> {label}
      </button>
    ))}
  </div>
);

const TopicRow = ({ item, onUpdate, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(item.score ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const dirty = String(score) !== String(item.score ?? '') || notes !== (item.notes ?? '');
  const done = item.status === 'Completed';

  return (
    <div className="ws-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="ws-row-main" style={{ minWidth: 200 }}>
          <div
            className="ws-row-title"
            style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--ws-text-3)' : undefined }}
          >
            {item.topic}
          </div>
          <div className="ws-meta" style={{ marginTop: '0.15rem' }}>
            {[
              item.priority ? `Priority ${item.priority}` : null,
              item.category,
              item.sampleQuestions?.length
                ? `${item.sampleQuestions.length} practice question${item.sampleQuestions.length === 1 ? '' : 's'}`
                : null,
              item.score != null ? `Score ${item.score}%` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <StatusSteps value={item.status} topic={item.topic} onChange={(status) => onUpdate(item.id, { status })} />
        <button
          type="button"
          className="ws-btn ws-btn-ghost ws-btn-icon"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} details for ${item.topic}`}
        >
          <ChevronDown size={17} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
      </div>

      {open && (
        <div style={{ display: 'grid', gap: '0.85rem', paddingTop: '0.25rem' }}>
          {item.sampleQuestions?.length > 0 && (
            <div>
              <div className="ws-label">Practice questions</div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--ws-text-2)' }}>
                {item.sampleQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem' }}>
            <div>
              <label className="ws-label" htmlFor={`score-${item.id}`}>
                Self-score (%)
              </label>
              <input
                id={`score-${item.id}`}
                className="ws-input"
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
            <div>
              <label className="ws-label" htmlFor={`notes-${item.id}`}>
                Notes
              </label>
              <input
                id={`notes-${item.id}`}
                className="ws-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you practise?"
              />
            </div>
          </div>
          <div className="ws-actions">
            <Button
              size="sm"
              disabled={!dirty}
              onClick={() => onUpdate(item.id, { score: score === '' ? null : Number(score), notes })}
            >
              Save notes
            </Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onDelete(item.id)}>
              Remove topic
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Completed topics per weekday of the current week (by last update time). */
const weekStats = (plan) => {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { name, date: d, count: 0, today: d.toDateString() === now.toDateString() };
  });
  (plan?.progress || [])
    .filter((t) => t.status === 'Completed' && t.updatedAt)
    .forEach((t) => {
      const d = new Date(t.updatedAt);
      const idx = Math.floor((d - monday) / 86400000);
      if (idx >= 0 && idx < 7) days[idx].count += 1;
    });
  return days;
};

export const StudyPlanPage = () => {
  const { api, plans } = useStudentData();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ company: params.get('company') || '', role: params.get('role') || '', days: 14 });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [newTopic, setNewTopic] = useState('');

  const list = useMemo(() => plans.data?.plans || [], [plans.data]);
  const summary = plans.data?.summary;
  const selected = list.find((p) => p.id === selectedId) || list[0] || null;
  const plan = selected?.plan || {};
  const week = useMemo(() => weekStats(selected), [selected]);
  const focus = (selected?.progress || [])
    .filter((t) => t.status !== 'Completed')
    .sort(
      (a, b) =>
        (a.status === 'In Progress' ? -1 : 0) - (b.status === 'In Progress' ? -1 : 0) ||
        (a.priority ?? 99) - (b.priority ?? 99),
    )
    .slice(0, 3);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      plans.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const generate = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || generating) return;
    setGenerating(true);
    setError('');
    try {
      const created = await api.post('/api/study-plans/generate', {
        company: form.company.trim(),
        role: form.role.trim() || null,
        daysAvailable: form.days,
      });
      setSelectedId(created.id);
      setForm({ company: '', role: '', days: 14 });
      plans.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const setDays = (d) => setForm((f) => ({ ...f, days: Math.max(1, Math.min(180, d || 1)) }));

  return (
    <>
      <PageHeader
        eyebrow="Preparation"
        title="Study Plan"
        subtitle="AI-built preparation plans for a specific company and role. Mark each topic as you go — your progress is saved to your account."
      />

      {error && (
        <div className="ws-alert ws-alert-error" role="alert">
          {error}
        </div>
      )}

      <form className="ws-card ws-card-pad" onSubmit={generate} aria-labelledby="gen-h">
        <SectionHeader title="Create a new plan" id="gen-h" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          <div>
            <label className="ws-label" htmlFor="plan-company">
              Company
            </label>
            <input
              id="plan-company"
              className="ws-input"
              placeholder="e.g. Amazon"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              disabled={generating}
              required
            />
          </div>
          <div>
            <label className="ws-label" htmlFor="plan-role">
              Role <span className="ws-meta">(optional)</span>
            </label>
            <input
              id="plan-role"
              className="ws-input"
              placeholder="e.g. SDE-1"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              disabled={generating}
            />
          </div>
          <div>
            <label className="ws-label" htmlFor="plan-days">
              Days to prepare
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                type="button"
                className="ws-btn ws-btn-secondary ws-btn-icon"
                onClick={() => setDays(form.days - 1)}
                aria-label="One day less"
                disabled={generating}
              >
                <Minus size={15} />
              </button>
              <input
                id="plan-days"
                className="ws-input"
                type="number"
                min="1"
                max="180"
                value={form.days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{ textAlign: 'center', width: 70 }}
                disabled={generating}
              />
              <button
                type="button"
                className="ws-btn ws-btn-secondary ws-btn-icon"
                onClick={() => setDays(form.days + 1)}
                aria-label="One day more"
                disabled={generating}
              >
                <Plus size={15} />
              </button>
              <span className="ws-meta">days</span>
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginTop: '1.1rem',
          }}
        >
          <div className="ws-segmented" role="group" aria-label="Quick pick days">
            {DAY_PRESETS.map((d) => (
              <button key={d} type="button" aria-pressed={form.days === d} onClick={() => setDays(d)}>
                {d} days
              </button>
            ))}
          </div>
          <Button type="submit" icon={Sparkles} disabled={generating || !form.company.trim()}>
            {generating ? 'Building your plan… (up to a minute)' : 'Generate plan'}
          </Button>
        </div>
      </form>

      {plans.loading && !plans.data ? (
        <div className="ws-section">
          <Skeleton height={60} style={{ borderRadius: 12 }} />
          <Skeleton height={260} style={{ borderRadius: 16, marginTop: 16 }} />
        </div>
      ) : plans.error && !plans.data ? (
        <div className="ws-section">
          <ErrorState title="Couldn't load your study plans" message={plans.error} onRetry={plans.reload} />
        </div>
      ) : list.length === 0 ? (
        <div className="ws-section">
          <EmptyState
            icon={Target}
            title="No study plans yet"
            description="Enter a company above and the AI will build a day-by-day plan with priority topics drawn from real interviews."
          />
        </div>
      ) : (
        <>
          {list.length > 1 && (
            <section className="ws-section" aria-label="Your plans">
              <div className="ws-segmented" role="group" aria-label="Choose a plan">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={p.id === selected?.id}
                    onClick={() => setSelectedId(p.id)}
                  >
                    {p.targetCompanyName || p.title} <span className="ws-count">{p.completionPercent}%</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {selected && (
            <>
              <section className="ws-section ws-card ws-card-pad" aria-labelledby="plan-title">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                      {selected.targetCompanyName && <Tag tone="accent">{selected.targetCompanyName}</Tag>}
                      {selected.targetRole && <Tag tone="violet">{selected.targetRole}</Tag>}
                      {selected.daysAvailable && (
                        <Tag>
                          <CalendarDays size={12} aria-hidden="true" /> {selected.daysAvailable} days
                        </Tag>
                      )}
                      <Tag>{selected.status}</Tag>
                    </div>
                    <h2 id="plan-title" style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {selected.title}
                    </h2>
                    <div className="ws-meta" style={{ marginTop: '0.2rem' }}>
                      {formatDate(selected.startDate)} → {formatDate(selected.targetDate)}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() =>
                      window.confirm('Delete this study plan and its progress?') &&
                      run(() => api.del(`/api/study-plans/${selected.id}`)).then(() => setSelectedId(null))
                    }
                  >
                    Delete plan
                  </Button>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <ProgressBar value={selected.completionPercent} label="Plan completion" />
                  <div className="ws-meta" style={{ marginTop: '0.45rem' }}>
                    {selected.completedTopics} of {selected.totalTopics} topics done · {selected.completionPercent}%
                    {summary && summary.averageScore != null ? ` · average self-score ${summary.averageScore}%` : ''}
                  </div>
                </div>
                {selected.description && (
                  <p className="ws-muted" style={{ marginTop: '1.1rem' }}>
                    {selected.description}
                  </p>
                )}
              </section>

              <div className="ws-two-col ws-section">
                <section aria-labelledby="focus-h">
                  <SectionHeader title="Today's focus" id="focus-h" />
                  {focus.length === 0 ? (
                    <EmptyState
                      icon={Check}
                      title="Every topic is done"
                      description="Great work. Add your own topic below or create a plan for another company."
                    />
                  ) : (
                    <div
                      className="ws-grid-3"
                      style={{ gridTemplateColumns: `repeat(${focus.length}, minmax(0, 1fr))` }}
                    >
                      {focus.map((t) => (
                        <div key={t.id} className="ws-card ws-card-pad" style={{ padding: '1.1rem' }}>
                          <div className="ws-meta">{t.category || 'Topic'}</div>
                          <div style={{ fontWeight: 650, marginTop: '0.25rem' }}>{t.topic}</div>
                          <div className="ws-meta" style={{ marginTop: '0.35rem' }}>
                            {t.sampleQuestions?.length
                              ? `${t.sampleQuestions.length} practice question${t.sampleQuestions.length === 1 ? '' : 's'}`
                              : 'Review concepts'}
                          </div>
                          <div style={{ marginTop: '0.85rem' }}>
                            {t.status === 'In Progress' ? (
                              <Button
                                size="sm"
                                icon={Check}
                                onClick={() => run(() => api.patch(`/api/progress/${t.id}`, { status: 'Completed' }))}
                              >
                                Mark done
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => run(() => api.patch(`/api/progress/${t.id}`, { status: 'In Progress' }))}
                              >
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section aria-labelledby="week-h">
                  <SectionHeader title="This week" id="week-h" />
                  <div className="ws-week">
                    {week.map((d) => (
                      <div
                        key={d.name}
                        className={`ws-day ${d.today ? 'ws-day-today' : ''}`}
                        aria-label={`${d.name}: ${d.count} topic${d.count === 1 ? '' : 's'} completed`}
                      >
                        <div className="ws-day-name">{d.name}</div>
                        <div className="ws-day-value">{d.count}</div>
                        <div className={`ws-day-bar ${d.count ? 'on' : ''}`} />
                      </div>
                    ))}
                  </div>
                  <p className="ws-meta" style={{ marginTop: '0.6rem' }}>
                    Topics completed per day this week.
                  </p>
                </section>
              </div>

              <section className="ws-section" aria-labelledby="topics-h">
                <SectionHeader title={`Topics (${selected.progress.length})`} id="topics-h" />
                <div className="ws-list">
                  {selected.progress.map((item) => (
                    <TopicRow
                      key={`${item.id}-${item.updatedAt}`}
                      item={item}
                      onUpdate={(id, body) => run(() => api.patch(`/api/progress/${id}`, body))}
                      onDelete={(id) => run(() => api.del(`/api/progress/${id}`))}
                    />
                  ))}
                  <form
                    className="ws-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTopic.trim()) return;
                      run(() => api.post('/api/progress', { studyPlanId: selected.id, topic: newTopic.trim() })).then(
                        () => setNewTopic(''),
                      );
                    }}
                  >
                    <input
                      className="ws-input"
                      placeholder="Add your own topic…"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      aria-label="New topic"
                    />
                    <Button type="submit" variant="secondary" icon={Plus} disabled={!newTopic.trim()}>
                      Add
                    </Button>
                  </form>
                </div>
              </section>

              {plan.schedule_suggestion && (
                <section className="ws-section ws-card ws-card-pad" aria-labelledby="sched-h">
                  <SectionHeader title="Suggested schedule" id="sched-h" />
                  <p className="ws-prose ws-muted">{plan.schedule_suggestion}</p>
                </section>
              )}

              {plan.rounds?.length > 0 && (
                <section className="ws-section" aria-labelledby="rounds-h">
                  <SectionHeader title="What the interview looks like" id="rounds-h" />
                  <div className="ws-list">
                    {plan.rounds.map((r, i) => (
                      <details key={i} className="ws-row" style={{ display: 'block' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                          {r.ordinal ? `Round ${r.ordinal} — ` : ''}
                          {r.round_type
                            ?.replaceAll('_', ' ')
                            .toLowerCase()
                            .replace(/^\w/, (c) => c.toUpperCase())}
                        </summary>
                        <div style={{ paddingTop: '0.75rem', display: 'grid', gap: '0.6rem' }}>
                          {r.description && <p className="ws-muted">{r.description}</p>}
                          {r.key_topics?.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {r.key_topics.map((t) => (
                                <span key={t} className="ws-chip">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {r.preparation_tips?.length > 0 && (
                            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--ws-text-2)' }}>
                              {r.preparation_tips.map((t, j) => (
                                <li key={j}>{t}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {plan.overall_tips?.length > 0 && (
                <section className="ws-section ws-card ws-card-pad" aria-labelledby="tips-h">
                  <SectionHeader title="Tips" id="tips-h" />
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.4rem' }}>
                    {plan.overall_tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};
