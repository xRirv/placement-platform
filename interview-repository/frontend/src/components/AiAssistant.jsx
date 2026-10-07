import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Send, Bot } from 'lucide-react';
import { createApi } from '../lib/api';

// Talks only to Team A's backend (/api/ai/*), which proxies to the internal AI service.

const bubbleStyle = (role) => ({
  alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
  background: role === 'user' ? '#4f46e5' : '#f1f5f9',
  color: role === 'user' ? '#fff' : '#0f172a',
  borderRadius: '14px',
  padding: '0.75rem 1rem',
  maxWidth: '80%',
  whiteSpace: 'pre-wrap',
});

export const AiAssistant = ({ session, backendUrl }) => {
  const token = session?.access_token;
  const api = useMemo(() => createApi(backendUrl, token), [backendUrl, token]);

  // Search
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState(null);

  // Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const text = query.trim();
    if (!text || searching || !token) return;
    setSearching(true);
    setSearchError('');
    try {
      setResults(await api.post('/api/ai/search', { query: text, limit: 20 }));
    } catch (err) {
      setSearchError(err.message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || chatting || !token) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setChatting(true);
    try {
      const resp = await api.post('/api/ai/chat', {
        message: text,
        session_id: sessionId,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: resp.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err.message }]);
    } finally {
      setChatting(false);
    }
  };

  const questions = results?.questions || [];

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div className="dashboard-card">
        <div className="card-heading">
          <span>Search Interview Questions</span>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            className="text-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. DSA questions asked at Amazon"
            disabled={searching}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="submit" disabled={searching || !query.trim()}>
            <Search size={16} />
            <span>{searching ? 'Searching…' : 'Search'}</span>
          </button>
        </form>
        {searchError && <p style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{searchError}</p>}
        {results && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
            <p style={{ color: '#64748b' }}>{results.total_found ?? questions.length} result(s)</p>
            {questions.map((q) => (
              <div
                key={q.question_id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                }}
              >
                <div style={{ fontWeight: 600 }}>{q.canonical_text}</div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.85rem',
                    marginTop: '0.25rem',
                  }}
                >
                  {[q.companies?.join(', '), q.topic, q.difficulty, `asked ${q.occurrence_count}×`]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <div className="card-heading">
          <span>Placement Assistant</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            minHeight: '200px',
            maxHeight: '420px',
            overflowY: 'auto',
            marginBottom: '1rem',
          }}
        >
          {messages.length === 0 && (
            <div className="empty-state">
              <Bot size={28} />
              <p>Ask about companies, questions, or request a preparation plan.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={bubbleStyle(m.role)}>
              {m.content}
            </div>
          ))}
          {chatting && <div style={bubbleStyle('assistant')}>Thinking…</div>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            className="text-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Prepare me for the TCS interview"
            disabled={chatting}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="submit" disabled={chatting || !input.trim()}>
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
