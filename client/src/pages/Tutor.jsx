import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles, Send, Plus, Trash2, AlertTriangle, Loader2, BookOpen, MessageSquare, ChevronRight,
  Copy, Check, RefreshCw, Lightbulb, Code2, Bug, GraduationCap, ExternalLink,
} from 'lucide-react';
import { AppShell, PageHead, useToast } from '../components/AppShell.jsx';
import { get, post, del } from '../lib/api.js';
import { relative } from '../lib/format.js';
import { Markdown } from '../lib/markdown.jsx';

const MODES = [
  { id: 'explain', label: 'Explain simply', icon: GraduationCap, prompt: 'Explain this in beginner-friendly language: ' },
  { id: 'example', label: 'Practical example', icon: Lightbulb, prompt: 'Give me a practical, real-world example with expected output: ' },
  { id: 'debug', label: 'Help me debug', icon: Bug, prompt: 'Help me debug this. Here is my code and the error:\n\n```\n\n```\n' },
  { id: 'hint', label: 'Give a hint only', icon: Code2, prompt: 'Give me a hint, not the answer: ' },
];

const STARTERS = [
  'Why is a composite index ordered the way it is?',
  'When should I use a generator instead of a list?',
  'Explain overfitting like I have one week to learn it.',
  'What is the difference between a process and a thread?',
];

export default function Tutor() {
  const [params] = useSearchParams();
  const courseSlug = params.get('course') || '';
  const lessonSlug = params.get('lesson') || '';
  const [status, setStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(null);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [lastPrompt, setLastPrompt] = useState(null);
  const [context, setContext] = useState(null);
  const logRef = useRef(null);
  const bottomRef = useRef(null);
  const toast = useToast();

  const refreshConversations = useCallback(() => {
    get('/ai/conversations').then((d) => setConversations(d.conversations)).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = 'AI tutor — Lumen';
    // `ready` is false only when no key is configured or the provider rejected it.
    // An unverified key stays open so the provider's own error can be shown.
    get('/ai/status')
      .then((data) => setStatus({ ...data, ready: data.ready !== false && data.configured }))
      .catch(() =>
        setStatus({ ready: false, reason: 'The AI status endpoint could not be reached. The server may be restarting.' }),
      );
    refreshConversations();
  }, [refreshConversations]);

  const openConversation = async (id) => {
    setActiveId(id);
    setLoadingThread(true);
    try {
      const data = await get(`/ai/conversations/${id}`);
      setMessages(data.messages);
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (text.length < 2 || sending) return;
    if (status && !status.ready) return;
    setInput('');
    setSending(true);
    setLastPrompt(null);
    const pendingId = `pending-${Date.now()}`;
    setMessages((m) => [...m, { id: pendingId, role: 'user', content: text, citations: [] }]);

    try {
      const data = await post('/ai/chat', {
        message: text,
        conversationId: activeId || undefined,
        courseSlug: courseSlug || undefined,
        lessonSlug: lessonSlug || undefined,
        mode: mode || undefined,
      });
      setActiveId(data.conversationId);
      if (data.context) setContext(data.context);
      setMessages((m) => [
        ...m.filter((x) => x.id !== pendingId),
        { id: m.find((x) => x.id === pendingId) ? pendingId.replace('pending', 'u') : `u-${Date.now()}`, role: 'user', content: text, citations: [] },
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.message?.content || data.reply || '',
          citations: data.citations || data.message?.citations || [],
          model: data.model,
        },
      ]);
      refreshConversations();
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== pendingId));
      if (err.code === 'ai_not_configured' || err.code === 'ai_key_rejected') {
        setStatus((s) => ({ ...s, ready: false, reason: err.message }));
      }
      setLastPrompt(text);
      toast.push(err.message, 'danger');
    } finally {
      setSending(false);
    }
  };

  const retry = () => {
    if (lastPrompt) send(lastPrompt);
  };

  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setInput('');
    setContext(null);
    setLastPrompt(null);
  };

  const clearCurrent = async () => {
    if (!activeId) {
      startNew();
      return;
    }
    try {
      await del(`/ai/conversations/${activeId}`);
      startNew();
      refreshConversations();
      toast.push('Conversation cleared.');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const remove = async (id, event) => {
    event?.stopPropagation();
    try {
      await del(`/ai/conversations/${id}`);
      if (activeId === id) startNew();
      refreshConversations();
      toast.push('Conversation deleted.');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const disabled = sending || (status && !status.ready);
  const attachedLabel = lessonSlug ? lessonSlug.replace(/-/g, ' ') : courseSlug ? courseSlug.replace(/-/g, ' ') : null;

  return (
    <AppShell title="AI tutor">
      <div className="page" style={{ paddingBottom: 'var(--space-4)' }}>
        <PageHead
          eyebrow="Understand"
          title="AI tutor"
          sub="Grounded in the course material, aware of the lesson you have open, and honest about what it cannot see."
          actions={
            status && (
              <span className={`badge ${status.ready ? 'badge--success' : 'badge--warning'}`}>
                <span className="dot" />
                {status.ready ? `Model: ${status.model}` : status.configured ? 'Key rejected' : 'Not configured'}
              </span>
            )
          }
        />

        {status && !status.ready && (
          <div className="callout callout--warning" style={{ marginBottom: 'var(--space-4)' }}>
            <AlertTriangle aria-hidden="true" />
            <div>
              <div className="strong" style={{ marginBottom: 4 }}>The AI tutor is not available right now</div>
              <p className="small muted" style={{ margin: 0 }}>{status.reason}</p>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                Fix: put a valid <code>OPENAI_API_KEY</code> (or <code>ANTHROPIC_API_KEY</code>) in the server
                environment and restart. Retrieval, citations and conversation storage are already working — only the
                model call is missing. The lessons, lab and community stay fully usable.
              </p>
              <Link to="/courses" className="btn btn--sm" style={{ marginTop: 10 }}>
                Browse the courses <ChevronRight />
              </Link>
            </div>
          </div>
        )}

        {attachedLabel && (
          <div className="callout callout--accent" style={{ marginBottom: 'var(--space-3)' }}>
            <BookOpen aria-hidden="true" />
            <span className="small">
              Attached to <strong>{attachedLabel}</strong> — its passages are retrieved first
              {context?.progress ? ` · ${context.progress.completed}/${context.progress.total} lessons complete in this course` : ''}.
            </span>
          </div>
        )}

        <div className="tutor-grid">
          <div className="chat chat--panel">
            <div className="chat__log" ref={logRef}>
              {loadingThread && (
                <div className="row" style={{ gap: 8 }}>
                  <Loader2 className="spin" style={{ width: 14, height: 14 }} /> Loading conversation…
                </div>
              )}

              {!loadingThread && messages.length === 0 && (
                <div className="empty" style={{ margin: 'auto', maxWidth: 560 }}>
                  <Sparkles aria-hidden="true" />
                  <div className="empty__title">Ask about anything in the curriculum</div>
                  <p className="small" style={{ margin: '0 auto 14px' }}>
                    I can explain a concept, walk through code, hint at a solution without giving it away, or help you
                    read an error message.
                  </p>
                  <div className="stack" style={{ gap: 6 }}>
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="chip"
                        disabled={disabled}
                        onClick={() => send(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  onFollowUp={(text) => send(text)}
                  disabled={disabled}
                />
              ))}

              {sending && (
                <div className="msg">
                  <div className="msg__bubble row" style={{ gap: 8, color: 'var(--text-muted)' }}>
                    <Loader2 className="spin" style={{ width: 14, height: 14 }} /> Searching the course material and composing…
                  </div>
                </div>
              )}

              {lastPrompt && !sending && (
                <div className="callout callout--danger" style={{ alignItems: 'center' }}>
                  <AlertTriangle aria-hidden="true" />
                  <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <span className="small">That answer failed.</span>
                    <button type="button" className="btn btn--sm" onClick={retry}>
                      <RefreshCw aria-hidden="true" /> Retry
                    </button>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="chat__composer">
              <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {MODES.map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`chip chip--mode ${active ? 'is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => {
                        const nextMode = active ? null : m.id;
                        setMode(nextMode);
                        const template = MODES.find((x) => x.id === nextMode)?.prompt;
                        if (template) setInput((cur) => (cur.startsWith(template) ? cur : template + cur));
                      }}
                    >
                      <Icon aria-hidden="true" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  className="textarea"
                  style={{ minHeight: 44, maxHeight: 160, paddingTop: 11 }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    status && !status.ready
                      ? 'The tutor is unavailable — see the notice above'
                      : 'Ask a question about your course…'
                  }
                  disabled={disabled}
                  aria-label="Your question"
                />
                <button
                  className="btn btn--primary"
                  onClick={() => send()}
                  disabled={disabled || input.trim().length < 2}
                  aria-label="Send question"
                >
                  {sending ? <Loader2 className="spin" /> : <Send />}
                </button>
              </div>
              <div className="row row--between tiny muted" style={{ marginTop: 6, gap: 8 }}>
                <span>Enter sends · Shift+Enter adds a line · answers can be wrong — check the cited lesson.</span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={clearCurrent}>
                  <Trash2 aria-hidden="true" /> Clear chat
                </button>
              </div>
            </div>
          </div>

          <aside className="stack stack-4" style={{ minWidth: 0 }}>
            <div className="card card--tight">
              <div className="row row--between" style={{ marginBottom: 10 }}>
                <span className="card__title">Conversations</span>
                <button className="btn btn--ghost btn--sm" onClick={startNew}>
                  <Plus /> New
                </button>
              </div>
              {conversations.length === 0 ? (
                <p className="small muted">No saved conversations yet.</p>
              ) : (
                <div className="stack" style={{ gap: 2, maxHeight: 380, overflowY: 'auto' }}>
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className="row"
                      style={{
                        gap: 6,
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: activeId === c.id ? 'var(--bg-subtle)' : 'transparent',
                      }}
                    >
                      <button
                        className="btn btn--ghost btn--sm"
                        style={{ flex: 1, justifyContent: 'flex-start', minWidth: 0, padding: '2px 4px' }}
                        onClick={() => openConversation(c.id)}
                      >
                        <MessageSquare style={{ width: 13, height: 13, flexShrink: 0 }} />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </span>
                      </button>
                      <button
                        className="btn btn--ghost btn--icon"
                        onClick={(e) => remove(c.id, e)}
                        aria-label={`Delete ${c.title}`}
                        title="Delete conversation"
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card card--tight">
              <div
                className="tiny muted"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}
              >
                How this works
              </div>
              <ul className="small muted" style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 6 }}>
                <li>Your question is matched against the course text with BM25 retrieval.</li>
                <li>The lesson you have open is ranked first; the rest of the course stays searchable.</li>
                <li>Each answer lists the passages it used, with a link to the lesson.</li>
                <li>Nothing is answered when the provider is unconfigured or the key is rejected.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

const REFINE = ['Explain that more simply', 'Show me a practical example', 'Give me a hint instead', 'What should I learn next?'];

function Message({ message, onFollowUp, disabled }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (isUser) {
    return (
      <div className="msg msg--user">
        <div className="msg__bubble">
          <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg">
      <div className="msg__bubble">
        <div className="msg__body">
          <Markdown source={message.content} />
        </div>
        <div className="msg__tools">
          <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {message.citations?.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowSources((v) => !v)}>
              <BookOpen aria-hidden="true" /> {message.citations.length} source{message.citations.length === 1 ? '' : 's'}
            </button>
          )}
          {message.model && <span className="tiny muted">{message.model}</span>}
        </div>
        {showSources && message.citations?.length > 0 && (
          <ol className="sources">
            {message.citations.map((c) => (
              <li key={`${c.n}-${c.lessonSlug}-${c.heading}`}>
                <Link to={`/courses/${c.courseSlug}/${c.lessonSlug}`} className="small">
                  {c.lessonTitle}
                  {c.heading ? ` · ${c.heading}` : ''}
                  <ExternalLink aria-hidden="true" style={{ width: 11, height: 11, marginLeft: 4 }} />
                </Link>
                {c.snippet && <p className="tiny muted" style={{ margin: '2px 0 0' }}>{c.snippet}…</p>}
              </li>
            ))}
          </ol>
        )}
        <div className="row" style={{ gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {REFINE.map((r) => (
            <button key={r} type="button" className="chip chip--sm" disabled={disabled} onClick={() => onFollowUp(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
