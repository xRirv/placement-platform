import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  PageHeader,
  SectionHeader,
  CompanyAvatar,
  StatusBadge,
  Tag,
  SearchBar,
  EmptyState,
  ErrorState,
  CardGridSkeleton,
  Skeleton,
  Button,
} from '../ui/ui';
import { formatDate } from '../../lib/format';
import { useStudentData } from './StudentData';

/** Unique topics (falling back to question text) for a compact "what was asked" preview. */
const keyTopics = (exp, limit = 3) => {
  const seen = new Set();
  const out = [];
  for (const r of exp.rounds || []) {
    for (const q of r.questions || []) {
      const t = (q.topic && q.topic !== 'General' ? q.topic : q.questionText || '').trim();
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        out.push(t);
      }
      if (out.length >= limit) return out;
    }
  }
  return out;
};

export const InterviewCard = ({ exp }) => {
  const navigate = useNavigate();
  const topics = keyTopics(exp);
  const rounds = exp.rounds?.length || 0;
  return (
    <button
      type="button"
      className="ws-card ws-card-interactive ws-interview-card"
      onClick={() => navigate(`/student/experiences/${exp.id}`)}
      aria-label={`View ${exp.companyName || 'company'} ${exp.role || ''} interview experience`}
    >
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
        <CompanyAvatar name={exp.companyName} />
        <div style={{ minWidth: 0 }}>
          <div className="ws-row-title">{exp.companyName || 'Unknown company'}</div>
          <div className="ws-row-sub">{exp.role}</div>
        </div>
      </div>

      <dl className="ws-kv" style={{ margin: 0 }}>
        <div>
          <dt>Difficulty</dt>
          <dd>{exp.difficulty || '—'}</dd>
        </div>
        <div>
          <dt>Outcome</dt>
          <dd>{exp.interviewResult || '—'}</dd>
        </div>
      </dl>

      {topics.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {topics.map((t) => (
            <span className="ws-chip" key={t} title={t}>
              {t.length > 38 ? `${t.slice(0, 36)}…` : t}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span className="ws-meta">
          {[formatDate(exp.interviewDate), rounds ? `${rounds} round${rounds === 1 ? '' : 's'}` : null]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span className="ws-card-cta">
          View experience <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </button>
  );
};

export const ExperiencesPage = () => {
  const { experiences } = useStudentData();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [company, setCompany] = useState(params.get('company') || 'ALL');
  const [difficulty, setDifficulty] = useState('ALL');
  const [outcome, setOutcome] = useState('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const items = useMemo(() => experiences.data || [], [experiences.data]);
  const companies = useMemo(() => [...new Set(items.map((e) => e.companyName).filter(Boolean))].sort(), [items]);
  const outcomes = useMemo(() => [...new Set(items.map((e) => e.interviewResult).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((e) => {
      if (company !== 'ALL' && e.companyName !== company) return false;
      if (difficulty !== 'ALL' && e.difficulty?.toLowerCase() !== difficulty.toLowerCase()) return false;
      if (outcome !== 'ALL' && e.interviewResult !== outcome) return false;
      if (!q) return true;
      const hay = [
        e.companyName,
        e.role,
        e.tips,
        e.preparation,
        e.questionsSummary,
        ...(e.rounds || []).flatMap((r) => [
          r.name,
          r.notes,
          ...(r.questions || []).flatMap((x) => [x.questionText, x.topic]),
        ]),
      ];
      return hay.some((v) => v?.toLowerCase().includes(q));
    });
  }, [items, query, company, difficulty, outcome]);

  const activeFilters = [company, difficulty, outcome].filter((v) => v !== 'ALL').length;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Interview Experiences"
        subtitle="Real, multi-round interviews shared by students and alumni — reviewed before they're published."
      />

      <div className="ws-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search company, role, topic or question…" />
        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          className="ws-filter-toggle"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          Filters{activeFilters ? ` (${activeFilters})` : ''}
        </Button>
        <div className={`ws-filters-collapsible ${filtersOpen ? 'open' : ''}`}>
          <select
            className="ws-select"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            aria-label="Company"
          >
            <option value="ALL">All companies</option>
            {companies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            className="ws-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            aria-label="Difficulty"
          >
            <option value="ALL">Any difficulty</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <select
            className="ws-select"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            aria-label="Outcome"
          >
            <option value="ALL">Any outcome</option>
            {outcomes.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      {experiences.loading && !experiences.data ? (
        <CardGridSkeleton />
      ) : experiences.error && !experiences.data ? (
        <ErrorState message={experiences.error} onRetry={experiences.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No interview experiences yet"
          description="Approved experiences will appear here. You can be the first to share one."
          action={
            <Link className="ws-btn ws-btn-primary" to="/student/submissions">
              Share an experience
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No matches"
          description="Try a different search or clear the filters."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setCompany('ALL');
                setDifficulty('ALL');
                setOutcome('ALL');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="ws-meta" style={{ marginBottom: '0.85rem' }}>
            Showing {filtered.length} of {items.length}
          </p>
          <div className="ws-grid">
            {filtered.map((e) => (
              <InterviewCard key={e.id} exp={e} />
            ))}
          </div>
        </>
      )}
    </>
  );
};

export const ExperienceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, experiences, submissions } = useStudentData();
  const cached = useMemo(
    () => [...(experiences.data || []), ...(submissions.data || [])].find((e) => e.id === id),
    [experiences.data, submissions.data, id],
  );
  const [fetched, setFetched] = useState({ loading: !cached, error: null, data: null, attempt: 0 });

  useEffect(() => {
    if (cached) return undefined;
    let ignore = false;
    api
      .get(`/api/interviews/${id}`)
      .then((data) => !ignore && setFetched((f) => ({ ...f, loading: false, data })))
      .catch((err) => !ignore && setFetched((f) => ({ ...f, loading: false, error: err.message })));
    return () => {
      ignore = true;
    };
  }, [api, id, cached, fetched.attempt]);

  const exp = cached || fetched.data;

  if (!exp && fetched.loading) {
    return (
      <div aria-busy="true">
        <Skeleton width={120} height={14} />
        <Skeleton width="45%" height={34} style={{ marginTop: 24 }} />
        <Skeleton width="30%" height={16} style={{ marginTop: 12 }} />
        <Skeleton height={220} style={{ marginTop: 40, borderRadius: 16 }} />
      </div>
    );
  }
  if (!exp) {
    return (
      <ErrorState
        title="Experience not available"
        message={fetched.error}
        onRetry={() => setFetched((f) => ({ ...f, loading: true, error: null, attempt: f.attempt + 1 }))}
      />
    );
  }

  const rounds = [...(exp.rounds || [])].sort((a, b) => a.roundOrder - b.roundOrder);
  const questions = rounds.flatMap((r) => (r.questions || []).map((q) => ({ ...q, round: r.name })));
  const topics = [...new Set(questions.map((q) => q.topic).filter((t) => t && t !== 'General'))];

  return (
    <>
      <button type="button" className="ws-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </button>

      <header style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <CompanyAvatar name={exp.companyName} size={56} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="ws-page-title" style={{ marginTop: 0 }}>
            {exp.companyName || 'Unknown company'}
          </h1>
          <p className="ws-page-sub" style={{ marginTop: '0.25rem' }}>
            {exp.role}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {exp.difficulty && <Tag>Difficulty · {exp.difficulty}</Tag>}
            {exp.interviewResult && <Tag tone="accent">Outcome · {exp.interviewResult}</Tag>}
            {exp.interviewDate && <Tag>{formatDate(exp.interviewDate)}</Tag>}
            {exp.moderationStatus && exp.moderationStatus !== 'APPROVED' && (
              <StatusBadge status={exp.moderationStatus} />
            )}
          </div>
        </div>
        <Link
          className="ws-btn ws-btn-secondary"
          to={`/student/assistant?prompt=${encodeURIComponent(
            `Help me prepare for a ${exp.role || ''} interview at ${exp.companyName || 'this company'}.`,
          )}`}
        >
          <Sparkles size={16} aria-hidden="true" /> Prepare with AI
        </Link>
      </header>

      <div className="ws-two-col ws-section">
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {rounds.length > 0 && (
            <section className="ws-card ws-card-pad" aria-labelledby="process">
              <SectionHeader title="Interview process" id="process" />
              <ol className="ws-timeline">
                {rounds.map((r, i) => (
                  <li key={r.id || i}>
                    <span className="ws-timeline-dot">{i + 1}</span>
                    <div style={{ fontWeight: 600 }}>
                      Round {i + 1} — {r.name}
                    </div>
                    {r.notes && (
                      <p className="ws-muted" style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                        {r.notes}
                      </p>
                    )}
                    {r.questions?.length > 0 && (
                      <div className="ws-meta" style={{ marginTop: '0.25rem' }}>
                        {r.questions.length} question{r.questions.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {questions.length > 0 && (
            <section className="ws-card ws-card-pad" aria-labelledby="asked">
              <SectionHeader title={`Questions asked (${questions.length})`} id="asked" />
              {questions.map((q, i) => (
                <div className="ws-qa" key={q.id || i}>
                  <span className="ws-qa-num">{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{q.questionText}</div>
                    <div className="ws-meta" style={{ marginTop: '0.3rem' }}>
                      {[q.round, q.topic, q.difficulty].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {exp.experience && (
            <section className="ws-card ws-card-pad" aria-labelledby="story">
              <SectionHeader title="The experience" id="story" />
              <p className="ws-prose">{exp.experience}</p>
            </section>
          )}
        </div>

        <aside style={{ display: 'grid', gap: '1.25rem' }}>
          {(topics.length > 0 || exp.preparation) && (
            <section className="ws-card ws-card-pad" aria-labelledby="prep">
              <SectionHeader title="What to prepare" id="prep" />
              {topics.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                    marginBottom: exp.preparation ? '1rem' : 0,
                  }}
                >
                  {topics.map((t) => (
                    <span className="ws-chip" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {exp.preparation && <p className="ws-prose ws-muted">{exp.preparation}</p>}
            </section>
          )}
          {exp.tips && (
            <section className="ws-card ws-card-pad" aria-labelledby="tips">
              <SectionHeader title="Tips" id="tips" />
              <p className="ws-prose ws-muted">{exp.tips}</p>
            </section>
          )}
          {exp.questionsSummary && (
            <section className="ws-card ws-card-pad" aria-labelledby="summary">
              <SectionHeader title="Summary" id="summary" />
              <p className="ws-prose ws-muted">{exp.questionsSummary}</p>
            </section>
          )}
          {exp.timeline && (
            <section className="ws-card ws-card-pad" aria-labelledby="timeline">
              <SectionHeader title="Timeline" id="timeline" />
              <p className="ws-prose ws-muted">{exp.timeline}</p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
};
