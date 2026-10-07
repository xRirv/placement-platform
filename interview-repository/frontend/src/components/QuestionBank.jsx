import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { createApi } from '../lib/api';

const PAGE_SIZE = 20;

export const QuestionBank = ({ session, backendUrl }) => {
  const api = useMemo(() => createApi(backendUrl, session?.access_token), [backendUrl, session?.access_token]);
  const [filters, setFilters] = useState({ q: '', topic: '', difficulty: '' });
  const [applied, setApplied] = useState(filters);
  const [topics, setTopics] = useState([]);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    api
      .get('/api/questions/topics')
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [api, session?.access_token]);

  // Callers set loading=true before changing page/filters.
  useEffect(() => {
    if (!session?.access_token) return undefined;
    let ignore = false;
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
    Object.entries(applied).forEach(([k, v]) => v && params.set(k, v));
    api
      .get(`/api/questions?${params}`)
      .then((data) => {
        if (ignore) return;
        setResult(data);
        setError('');
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [api, applied, page, session?.access_token]);

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setPage(0);
    setApplied(filters);
  };

  const questions = result?.content || [];
  const totalPages = result?.totalPages ?? result?.page?.totalPages ?? 1;

  return (
    <div className="dashboard-card">
      <div className="card-heading">
        <span>Question Bank</span>
      </div>
      <p style={{ color: '#64748b', marginTop: 0 }}>Questions from approved interview experiences.</p>
      <form className="inline-row"
        onSubmit={submit}
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <input
          className="text-input"
          placeholder="Search question text"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          style={{ flex: 2, minWidth: '180px', paddingLeft: '1rem' }}
        />
        <select
          className="text-input"
          value={filters.topic}
          onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
          style={{ flex: 1, minWidth: '140px', paddingLeft: '1rem' }}
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="text-input"
          value={filters.difficulty}
          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
          style={{ width: '140px', paddingLeft: '1rem' }}
        >
          <option value="">Any difficulty</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <button className="btn btn-primary" type="submit">
          <Search size={16} />
          <span>Search</span>
        </button>
      </form>

      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>Loading…</p>}
      {!loading && !error && questions.length === 0 && <p style={{ color: '#64748b' }}>No questions found.</p>}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {questions.map((q) => (
          <div
            key={q.id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
            }}
          >
            <div style={{ fontWeight: 600 }}>{q.questionText}</div>
            <div
              style={{
                color: '#64748b',
                fontSize: '0.85rem',
                marginTop: '0.25rem',
              }}
            >
              {[q.companyName, q.role, q.roundName, q.topic, q.difficulty].filter(Boolean).join(' · ')}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            marginTop: '1rem',
          }}
        >
          <button
            className="btn btn-secondary"
            type="button"
            disabled={page === 0}
            onClick={() => {
              setLoading(true);
              setPage(page - 1);
            }}
          >
            Previous
          </button>
          <span style={{ color: '#64748b' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => {
              setLoading(true);
              setPage(page + 1);
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
