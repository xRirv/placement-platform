import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Sparkles, SlidersHorizontal } from 'lucide-react';
import { PageHeader, SearchBar, EmptyState, ErrorState, ListSkeleton, Button } from '../ui/ui';
import { useStudentData } from './StudentData';

const PAGE_SIZE = 20;

export const QuestionBankPage = () => {
  const navigate = useNavigate();
  const { api, experiences } = useStudentData();
  const [draft, setDraft] = useState('');
  const [filters, setFilters] = useState({ q: '', topic: '', difficulty: '', companyId: '' });
  const [page, setPage] = useState(0);
  const [topics, setTopics] = useState([]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const companies = useMemo(() => {
    const map = new Map();
    (experiences.data || []).forEach((e) => e.companyId && e.companyName && map.set(e.companyId, e.companyName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [experiences.data]);

  useEffect(() => {
    let ignore = false;
    api
      .get('/api/questions/topics')
      .then((t) => !ignore && setTopics(Array.isArray(t) ? t : []))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [api]);

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    api
      .get(`/api/questions?${params}`)
      .then((data) => !ignore && setState({ loading: false, error: null, data }))
      .catch((err) => !ignore && setState((s) => ({ loading: false, error: err.message, data: s.data })));
    return () => {
      ignore = true;
    };
  }, [api, filters, page, attempt]);

  // Debounce free-text search.
  useEffect(() => {
    if (draft === filters.q) return undefined;
    const t = setTimeout(() => {
      setState((s) => ({ ...s, loading: true }));
      setPage(0);
      setFilters((f) => ({ ...f, q: draft.trim() }));
    }, 350);
    return () => clearTimeout(t);
  }, [draft, filters.q]);

  const update = (key, value) => {
    setState((s) => ({ ...s, loading: true }));
    setPage(0);
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const goTo = (p) => {
    setState((s) => ({ ...s, loading: true }));
    setPage(p);
  };

  const questions = state.data?.content || [];
  const total = state.data?.totalElements ?? state.data?.page?.totalElements ?? questions.length;
  const totalPages = state.data?.totalPages ?? state.data?.page?.totalPages ?? 1;
  const activeFilters = [filters.topic, filters.difficulty, filters.companyId].filter(Boolean).length;

  const practice = (q) =>
    navigate(
      `/student/assistant?prompt=${encodeURIComponent(
        `Help me practise this interview question${q.companyName ? ` asked at ${q.companyName}` : ''}: "${q.questionText}". Explain how to approach it, then give me a model answer.`,
      )}`,
    );

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Question Bank"
        subtitle="Practice questions collected from real, approved interview experiences."
      />

      <div className="ws-toolbar">
        <SearchBar value={draft} onChange={setDraft} placeholder="Search questions…" />
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
            value={filters.companyId}
            onChange={(e) => update('companyId', e.target.value)}
            aria-label="Company"
          >
            <option value="">All companies</option>
            {companies.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="ws-select"
            value={filters.difficulty}
            onChange={(e) => update('difficulty', e.target.value)}
            aria-label="Difficulty"
          >
            <option value="">Any difficulty</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <select
            className="ws-select"
            value={filters.topic}
            onChange={(e) => update('topic', e.target.value)}
            aria-label="Topic"
          >
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {state.loading && !state.data ? (
        <ListSkeleton rows={6} />
      ) : state.error && !state.data ? (
        <ErrorState
          title="Couldn't load questions"
          message={state.error}
          onRetry={() => {
            setState((s) => ({ ...s, loading: true, error: null }));
            setAttempt((a) => a + 1);
          }}
        />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={filters.q || activeFilters ? 'No questions match' : 'No questions yet'}
          description={
            filters.q || activeFilters
              ? 'Try a broader search or clear the filters.'
              : 'Questions appear here once interview experiences are approved.'
          }
          action={
            (filters.q || activeFilters) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft('');
                  setState((s) => ({ ...s, loading: true }));
                  setPage(0);
                  setFilters({ q: '', topic: '', difficulty: '', companyId: '' });
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="ws-meta" style={{ marginBottom: '0.85rem' }} aria-live="polite">
            {state.loading ? 'Updating…' : `${total} question${total === 1 ? '' : 's'}`}
          </p>
          <div className="ws-list" style={{ opacity: state.loading ? 0.6 : 1, transition: 'opacity .15s' }}>
            {questions.map((q) => (
              <div className="ws-row" key={q.id}>
                <div className="ws-row-main">
                  <div style={{ fontWeight: 550 }}>{q.questionText}</div>
                  <div className="ws-meta" style={{ marginTop: '0.3rem' }}>
                    {[q.topic, q.difficulty].filter(Boolean).join(' · ')}
                    {q.companyName && (
                      <>
                        {q.topic || q.difficulty ? ' · ' : ''}Asked at{' '}
                        <strong style={{ color: 'var(--ws-text-2)' }}>{q.companyName}</strong>
                        {q.role ? ` (${q.role})` : ''}
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Sparkles}
                  onClick={() => practice(q)}
                  aria-label={`Practice: ${q.questionText}`}
                >
                  Practice
                </Button>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="ws-actions" style={{ marginTop: '1rem', alignItems: 'center' }}>
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => goTo(page - 1)}>
                Previous
              </Button>
              <span className="ws-meta">
                Page {page + 1} of {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => goTo(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
};
