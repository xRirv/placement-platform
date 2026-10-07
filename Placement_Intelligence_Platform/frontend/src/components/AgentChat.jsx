import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from '../services/api'

export default function AgentChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const resp = await sendChatMessage(text, sessionId)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: resp.answer,
          agentUsed: resp.agent_used,
          evidence: resp.evidence || [],
          actions: resp.actions || [],
        },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}`, agentUsed: 'error' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const EXAMPLES = [
    'What questions were asked at Infosys?',
    'Prepare me for Amazon SDE interview',
    'Show DSA questions for TCS',
  ]

  return (
    <section className="panel chat-panel">
      <header className="panel-header">
        <p className="eyebrow">Master Agent / hierarchical orchestration</p>
        <h2>Ask about placements</h2>
        <div className="chat-examples">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              className="example-chip"
              type="button"
              onClick={() => { setInput(ex) }}
            >
              {ex}
            </button>
          ))}
        </div>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Start a conversation. The Master Agent routes your query to the right specialist.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="bubble-content">{m.content}</div>
            {m.agentUsed && m.role === 'assistant' && (
              <div className="bubble-meta">
                <span className="agent-badge">agent: {m.agentUsed}</span>
                {m.evidence?.length > 0 && (
                  <span className="evidence-badge">
                    {m.evidence.length} source{m.evidence.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <div className="bubble-content typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about placements, questions, or request a preparation plan…"
          disabled={loading}
        />
        <button className="chat-send" type="submit" disabled={loading || !input.trim()}>
          {loading ? '…' : 'Send'}
        </button>
      </form>
    </section>
  )
}
