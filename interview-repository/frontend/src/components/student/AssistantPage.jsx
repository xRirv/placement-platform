import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Sparkles, Building2, Code2, MessagesSquare, Network, Search } from 'lucide-react';
import { PageHeader, SectionHeader, Button, SearchBar } from '../ui/ui';
import { useStudentData } from './StudentData';

// Minimal Markdown for AI answers: **bold**, #-headings and "- "/"* " bullets.
const renderInline = (text) =>
  text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
    );

const renderMarkdown = (text) =>
  (text || '').split('\n').map((line, i) => {
    const heading = line.match(/^#{1,6}\s+(.*)/);
    if (heading)
      return (
        <div key={i} style={{ fontWeight: 650, marginTop: '0.6rem' }}>
          {renderInline(heading[1])}
        </div>
      );
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    if (bullet)
      return (
        <div key={i} style={{ paddingLeft: '1rem', textIndent: '-0.7rem' }}>
          • {renderInline(bullet[1])}
        </div>
      );
    return <div key={i}>{line ? renderInline(line) : ' '}</div>;
  });

export const AssistantPage = () => {
  const { api, plans, experiences } = useStudentData();
  const [params, setParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(params.get('prompt') || '');
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const logRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ loading: false, error: '', data: null });

  useEffect(() => {
    if (params.get('prompt')) {
      setParams({}, { replace: true });
      inputRef.current?.focus();
    }
  }, [params, setParams]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Suggestions use the student's real context: their target company / role if they have a plan.
  const suggestions = useMemo(() => {
    const plan = plans.data?.plans?.[0];
    const company = plan?.targetCompanyName || experiences.data?.[0]?.companyName;
    const role = plan?.targetRole || 'software engineering';
    return [
      company && {
        icon: Building2,
        label: `Prepare for ${company}`,
        prompt: `Prepare me for a ${role} interview at ${company}. What rounds should I expect and what should I focus on?`,
      },
      {
        icon: Code2,
        label: 'Practice DSA',
        prompt:
          'Give me 3 commonly asked DSA interview questions from our database, one at a time, and wait for my answer.',
      },
      {
        icon: MessagesSquare,
        label: 'Mock interview',
        prompt: `Run a short mock technical interview for a ${role} role. Ask one question at a time.`,
      },
      {
        icon: Network,
        label: 'Review system design',
        prompt: 'What system design topics come up most in interviews here, and how should I prepare for them?',
      },
    ].filter(Boolean);
  }, [plans.data, experiences.data]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setSending(true);
    try {
      const resp = await api.post('/api/ai/chat', { message, session_id: sessionId });
      setMessages((m) => [...m, { role: 'assistant', content: resp.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', content: err.message }]);
    } finally {
      setSending(false);
    }
  };

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearch({ loading: true, error: '', data: null });
    try {
      setSearch({
        loading: false,
        error: '',
        data: await api.post('/api/ai/search', { query: query.trim(), limit: 10 }),
      });
    } catch (err) {
      setSearch({ loading: false, error: err.message, data: null });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Preparation"
        title="AI Interview Assistant"
        subtitle="Prepare for your next interview with context from real interview experiences, your target companies and your study plan."
      />

      <div className="ws-suggestions" style={{ marginBottom: '1.25rem' }} aria-label="Suggested actions">
        {suggestions.map(({ icon: Icon, label, prompt }) => (
          <button key={label} type="button" className="ws-suggestion" onClick={() => send(prompt)} disabled={sending}>
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <section className="ws-card ws-chat" aria-label="Chat with the AI assistant">
        <div className="ws-chat-log" ref={logRef} aria-live="polite">
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 420 }}>
              <div className="ws-empty-icon">
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <div style={{ fontWeight: 650 }}>Ask anything about your interviews</div>
              <p className="ws-muted" style={{ marginTop: '0.35rem' }}>
                Try a suggestion above, or ask about a company, a round, or a specific question.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`ws-bubble ${m.role === 'user' ? 'ws-bubble-user' : 'ws-bubble-ai'}`}
              style={
                m.role === 'error' ? { background: 'var(--ws-danger-soft)', color: 'var(--ws-danger)' } : undefined
              }
            >
              {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
            </div>
          ))}
          {sending && (
            <div className="ws-bubble ws-bubble-ai ws-muted" aria-label="Assistant is typing">
              Thinking…
            </div>
          )}
        </div>
        <form
          className="ws-chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="chat-input" className="ws-sr-only">
            Message
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            className="ws-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. How should I prepare for the TCS interview?"
            disabled={sending}
          />
          <Button type="submit" icon={Send} disabled={sending || !input.trim()}>
            Send
          </Button>
        </form>
      </section>

      <section className="ws-section" aria-labelledby="kb-h">
        <SectionHeader title="Search the knowledge base" id="kb-h" />
        <form className="ws-toolbar" onSubmit={runSearch}>
          <SearchBar value={query} onChange={setQuery} placeholder="e.g. DSA questions asked at Amazon" />
          <Button type="submit" variant="secondary" icon={Search} disabled={search.loading || !query.trim()}>
            {search.loading ? 'Searching…' : 'Search'}
          </Button>
        </form>
        {search.error && (
          <div className="ws-alert ws-alert-error" role="alert">
            {search.error}
          </div>
        )}
        {search.data &&
          (search.data.questions?.length ? (
            <div className="ws-list">
              {search.data.questions.map((q) => (
                <div className="ws-row" key={q.question_id}>
                  <div className="ws-row-main">
                    <div style={{ fontWeight: 550 }}>{q.canonical_text}</div>
                    <div className="ws-meta" style={{ marginTop: '0.25rem' }}>
                      {[
                        q.topic,
                        q.difficulty,
                        q.companies?.length ? `Asked at ${q.companies.join(', ')}` : null,
                        `asked ${q.occurrence_count}×`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => send(`Help me answer this interview question: "${q.canonical_text}"`)}
                  >
                    Ask AI
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="ws-muted">No matching questions found.</p>
          ))}
      </section>
    </>
  );
};
