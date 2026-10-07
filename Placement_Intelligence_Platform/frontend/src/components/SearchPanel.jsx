import { useState } from 'react'
import { searchKnowledge } from '../services/api'

const CATEGORIES = ['', 'DSA', 'SQL', 'OPERATING_SYSTEMS', 'DBMS', 'NETWORKING', 'OOP', 'HR', 'SYSTEM_DESIGN', 'OTHER']
const DIFFICULTIES = ['', 'EASY', 'MEDIUM', 'HARD']

export default function SearchPanel() {
  const [form, setForm] = useState({
    query: '', company: '', role: '', topic: '', category: '', difficulty: '',
  })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const upd = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  async function handleSearch(e) {
    e.preventDefault()
    setLoading(true); setError(''); setResults(null)
    try {
      const data = await searchKnowledge({
        query: form.query || `questions ${form.company} ${form.role} ${form.topic}`.trim() || 'questions',
        filters: {
          company: form.company || null,
          role: form.role || null,
          topic: form.topic || null,
          category: form.category || null,
          difficulty: form.difficulty || null,
        },
        strategy: 'auto',
        limit: 30,
      })
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel search-panel">
      <header className="panel-header">
        <p className="eyebrow">Institutional knowledge base</p>
        <h2>Search interview questions</h2>
      </header>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-row">
          <input
            className="search-input"
            placeholder="Free-text query (optional)"
            value={form.query}
            onChange={e => upd('query', e.target.value)}
          />
        </div>
        <div className="search-filters">
          <input className="filter-input" placeholder="Company (e.g. Infosys)" value={form.company} onChange={e => upd('company', e.target.value)} />
          <input className="filter-input" placeholder="Role (e.g. SDE)" value={form.role} onChange={e => upd('role', e.target.value)} />
          <input className="filter-input" placeholder="Topic (e.g. Arrays)" value={form.topic} onChange={e => upd('topic', e.target.value)} />
          <select className="filter-select" value={form.category} onChange={e => upd('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All categories'}</option>)}
          </select>
          <select className="filter-select" value={form.difficulty} onChange={e => upd('difficulty', e.target.value)}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d || 'All difficulties'}</option>)}
          </select>
        </div>
        <button className="search-btn" type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="alert" role="alert">
          <span className="alert-icon">!</span>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="search-results">
          <p className="results-meta">
            {results.total_found} question{results.total_found !== 1 ? 's' : ''} found
            {' · '}strategy: {results.strategy_used}
          </p>
          {results.questions.length === 0 ? (
            <p className="no-results">
              No questions found. Try different filters or submit more experiences to build the knowledge base.
            </p>
          ) : (
            results.questions.map((q, i) => (
              <div key={q.question_id || i} className="question-card">
                <p className="question-text">{q.canonical_text}</p>
                <div className="question-tags">
                  {q.category && <span className="tag tag-category">{q.category}</span>}
                  {q.topic && <span className="tag tag-topic">{q.topic}</span>}
                  {q.difficulty && (
                    <span className={`tag tag-diff tag-${q.difficulty.toLowerCase()}`}>
                      {q.difficulty}
                    </span>
                  )}
                  <span className="tag tag-count">×{q.occurrence_count}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
