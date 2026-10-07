import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * AI Assistant conversation that lives above the routes, so it survives page changes.
 *
 * - Messages are processed through an in-order queue: you can send several messages while the
 *   assistant is still answering; each is sent after the previous reply arrives.
 * - Requests keep running when you leave the Assistant page; replies land here and are counted
 *   as unread until you come back.
 * - The conversation (and the AI session id, so the assistant keeps its context) is saved per
 *   user in localStorage, so it also survives a page refresh.
 */

const MAX_MESSAGES = 200;
const storageKey = (userId) => `ws-ai-chat:${userId || 'anon'}`;

const newSessionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random()}`;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const load = (userId) => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.messages) && saved.sessionId) {
        // Anything that was mid-flight when the tab closed can't be resumed; mark it so it can be retried.
        const messages = saved.messages.map((m) =>
          m.status === 'queued' || m.status === 'sending' ? { ...m, status: 'failed' } : m,
        );
        return { sessionId: saved.sessionId, messages, unread: 0 };
      }
    }
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return { sessionId: newSessionId(), messages: [], unread: 0 };
};

const ChatContext = createContext(null);

export const ChatProvider = ({ api, userId, children }) => {
  const [state, setState] = useState(() => load(userId));
  const queueRef = useRef([]);
  const pumpingRef = useRef(false);
  const viewingRef = useRef(false);
  const sessionRef = useRef(state.sessionId);

  // Persist (storage write only; no state updates here).
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey(userId),
        JSON.stringify({ sessionId: state.sessionId, messages: state.messages.slice(-MAX_MESSAGES) }),
      );
    } catch {
      // Quota or privacy mode: keep working in memory.
    }
  }, [state.sessionId, state.messages, userId]);

  const patch = (id, changes) =>
    setState((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, ...changes } : m)) }));

  const pump = useCallback(async () => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;
    try {
      while (queueRef.current.length) {
        const item = queueRef.current.shift();
        patch(item.id, { status: 'sending' });
        try {
          const resp = await api.post('/api/ai/chat', { message: item.text, session_id: sessionRef.current });
          patch(item.id, { status: 'sent' });
          setState((s) => ({
            ...s,
            unread: viewingRef.current ? 0 : s.unread + 1,
            // Place the reply directly under the question it answers (later queued questions stay below).
            messages: (() => {
              const reply = { id: newId(), role: 'assistant', content: resp.answer, at: Date.now() };
              const idx = s.messages.findIndex((x) => x.id === item.id);
              const next = [...s.messages];
              next.splice(idx >= 0 ? idx + 1 : next.length, 0, reply);
              return next.slice(-MAX_MESSAGES);
            })(),
          }));
        } catch (err) {
          patch(item.id, { status: 'failed', error: err.message });
        }
      }
    } finally {
      pumpingRef.current = false;
    }
  }, [api]);

  const send = useCallback(
    (text) => {
      const message = (text || '').trim();
      if (!message) return;
      const id = newId();
      queueRef.current.push({ id, text: message });
      setState((s) => ({
        ...s,
        messages: [...s.messages, { id, role: 'user', content: message, status: 'queued', at: Date.now() }],
      }));
      pump();
    },
    [pump],
  );

  const retry = useCallback(
    (id) => {
      setState((s) => {
        const msg = s.messages.find((m) => m.id === id);
        if (msg && !queueRef.current.some((q) => q.id === id)) queueRef.current.push({ id, text: msg.content });
        return { ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, status: 'queued', error: null } : m)) };
      });
      setTimeout(pump, 0);
    },
    [pump],
  );

  const reset = useCallback(() => {
    queueRef.current = [];
    sessionRef.current = newSessionId();
    setState({ sessionId: sessionRef.current, messages: [], unread: 0 });
  }, []);

  /** Called by the Assistant page while it is on screen, so replies there don't count as unread. */
  const setViewing = useCallback((viewing) => {
    viewingRef.current = viewing;
    if (viewing) setState((s) => (s.unread ? { ...s, unread: 0 } : s));
  }, []);

  const pending = state.messages.filter((m) => m.status === 'queued' || m.status === 'sending').length;

  const value = useMemo(
    () => ({ messages: state.messages, unread: state.unread, pending, send, retry, reset, setViewing }),
    [state.messages, state.unread, pending, send, retry, reset, setViewing],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};
