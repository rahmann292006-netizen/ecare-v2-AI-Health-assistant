import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, Plus, Search, ArrowUp, MessageCircle, CheckCircle2, Pin, X } from 'lucide-react';
import { AppShell, PageHead, Loading, ErrorState, Empty, Avatar, useToast } from '../components/AppShell.jsx';
import { get, post } from '../lib/api.js';
import { relative } from '../lib/format.js';

export default function Community() {
  const [groups, setGroups] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [posts, setPosts] = useState(null);
  const [total, setTotal] = useState(0);
  const [group, setGroup] = useState('');
  const [sort, setSort] = useState('new');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [composer, setComposer] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const loadGroups = useCallback(() => {
    get('/community/groups')
      .then((d) => {
        setGroups(d.groups);
        setGuidelines(d.guidelines);
      })
      .catch(() => {});
  }, []);

  const loadPosts = useCallback(() => {
    setError(null);
    const params = new URLSearchParams({ sort });
    if (group) params.set('group', group);
    if (query.trim()) params.set('q', query.trim());
    get(`/community/posts?${params}`)
      .then((d) => {
        setPosts(d.posts);
        setTotal(d.total);
      })
      .catch(setError);
  }, [group, sort, query]);

  useEffect(() => {
    document.title = 'Community — Lumen';
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    const timer = setTimeout(loadPosts, query ? 320 : 0);
    return () => clearTimeout(timer);
  }, [loadPosts, query]);

  const vote = async (postId, value) => {
    try {
      const res = await post(`/community/posts/${postId}/vote`, { value });
      setPosts((list) => list.map((p) => (p.id === postId ? { ...p, score: res.score, myVote: res.myVote } : p)));
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const submitPost = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await post('/community/posts', composer);
      setComposer(null);
      toast.push('Discussion posted.', 'success');
      loadPosts();
      loadGroups();
      return data;
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Community">
      <div className="page">
        <PageHead
          eyebrow="Community"
          title="Discussions"
          sub="Ask a question, share what you built, and mark the answer that solved it. Threads stay attached to the group they belong to."
          actions={<button className="btn btn--primary" onClick={() => setComposer({ groupSlug: group || groups[0]?.slug || '', kind: 'question', title: '', body: '', tags: '' })}><Plus /> New discussion</button>}
        />

        {error && <ErrorState error={error} onRetry={loadPosts} />}

        <div className="community-grid">
          <div className="stack stack-4" style={{ minWidth: 0 }}>
            <div className="row row--wrap" style={{ gap: 10 }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search aria-hidden="true" style={{ position: 'absolute', left: 10, top: 11, width: 15, height: 15, color: 'var(--faint)' }} />
                <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search discussions" aria-label="Search discussions" style={{ paddingLeft: 32 }} />
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button className={`btn btn--sm ${sort === 'new' ? 'btn--primary' : ''}`} onClick={() => setSort('new')} aria-pressed={sort === 'new'}>Newest</button>
                <button className={`btn btn--sm ${sort === 'top' ? 'btn--primary' : ''}`} onClick={() => setSort('top')} aria-pressed={sort === 'top'}>Top</button>
              </div>
            </div>

            {!posts && !error && <Loading rows={4} height={80} />}

            {posts && posts.length === 0 && (
              <div className="card">
                <Empty icon={MessagesSquare} title="No discussions here yet" action={<button className="btn btn--primary btn--sm" onClick={() => setComposer({ groupSlug: group || groups[0]?.slug || '', kind: 'question', title: '', body: '', tags: '' })}>Start the first one</button>}>
                  {query ? 'Nothing matches that search.' : 'Be the first to ask in this group.'}
                </Empty>
              </div>
            )}

            {posts && posts.length > 0 && (
              <>
                <div className="row row--between">
                  <span className="small muted">{posts.length} of {total} discussions</span>
                </div>
                <div className="stack stack-3">
                  {posts.map((p) => (
                    <article key={p.id} className="card card--tight card--interactive">
                      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                        <div className="stack" style={{ alignItems: 'center', gap: 2, width: 32, flexShrink: 0 }}>
                          <button className="btn btn--ghost btn--icon" style={{ width: 26, height: 24 }} onClick={() => vote(p.id, p.myVote === 1 ? 0 : 1)} aria-label="Upvote" aria-pressed={p.myVote === 1}>
                            <ArrowUp style={{ width: 13, height: 13, color: p.myVote === 1 ? 'var(--accent)' : undefined }} />
                          </button>
                          <span className="tiny strong">{p.score}</span>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                            {p.pinned && <span className="badge"><Pin style={{ width: 10, height: 10 }} /> Pinned</span>}
                            <span className="badge">{p.group.name}</span>
                            {p.acceptedCommentId && <span className="badge badge--success"><CheckCircle2 style={{ width: 10, height: 10 }} /> Answered</span>}
                            <span className="badge">{p.kind}</span>
                          </div>
                          <Link to={`/community/${p.id}`}>
                            <h3 style={{ fontSize: 'var(--step-1)' }}>{p.title}</h3>
                          </Link>
                          <p className="small muted" style={{ marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.body}</p>
                          <div className="row tiny muted" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                            <span className="row" style={{ gap: 5 }}><Avatar name={p.author.name} color={p.author.avatarColor} /> {p.author.name}{p.author.isYours ? ' (you)' : ''}</span>
                            <span>{relative(p.createdAt)}</span>
                            <Link to={`/community/${p.id}`} className="row" style={{ gap: 4 }}><MessageCircle style={{ width: 12, height: 12 }} /> {p.commentCount}</Link>
                            {p.tags.map((t) => <span key={t} className="badge">#{t}</span>)}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="stack stack-4" style={{ minWidth: 0 }}>
            <div className="card card--tight">
              <div className="card__title" style={{ marginBottom: 10 }}>Groups</div>
              <button className={`btn btn--ghost btn--sm btn--block ${!group ? 'btn--primary' : ''}`} onClick={() => setGroup('')} style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <span>All discussions</span>
                <span className="tiny">{total}</span>
              </button>
              <div className="stack" style={{ gap: 2 }}>
                {groups.map((g) => (
                  <button
                    key={g.slug}
                    className={`btn btn--ghost btn--sm btn--block ${group === g.slug ? 'btn--primary' : ''}`}
                    onClick={() => setGroup(group === g.slug ? '' : g.slug)}
                    style={{ justifyContent: 'space-between', textAlign: 'left' }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                    <span className="tiny">{g.postCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {guidelines.length > 0 && (
              <div className="card card--tight">
                <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>How we work here</div>
                <ul className="small muted" style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 6 }}>
                  {guidelines.map((g) => <li key={g}>{g}</li>)}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      {composer && (
        <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="New discussion" onClick={(e) => e.target === e.currentTarget && setComposer(null)}>
          <form className="modal" onSubmit={submitPost}>
            <div className="row row--between" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="card__title">New discussion</div>
              <button type="button" className="btn btn--ghost btn--icon" onClick={() => setComposer(null)} aria-label="Close"><X /></button>
            </div>
            <div className="stack stack-4">
              <div className="field">
                <label className="label" htmlFor="group">Group</label>
                <select id="group" className="select" value={composer.groupSlug} onChange={(e) => setComposer({ ...composer, groupSlug: e.target.value })} required>
                  {groups.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="kind">Type</label>
                <select id="kind" className="select" value={composer.kind} onChange={(e) => setComposer({ ...composer, kind: e.target.value })}>
                  <option value="question">Question</option>
                  <option value="thread">Discussion</option>
                  <option value="showcase">Showcase</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="title">Title</label>
                <input id="title" className="input" value={composer.title} onChange={(e) => setComposer({ ...composer, title: e.target.value })} minLength={8} maxLength={160} required placeholder="Be specific — it helps people find the thread" />
                <span className="hint">{composer.title.length}/160 · at least 8 characters</span>
              </div>
              <div className="field">
                <label className="label" htmlFor="body">Details</label>
                <textarea id="body" className="textarea" value={composer.body} onChange={(e) => setComposer({ ...composer, body: e.target.value })} minLength={10} maxLength={20000} required placeholder="What have you tried? What is the exact behaviour you see?" />
              </div>
              <div className="field">
                <label className="label" htmlFor="tags">Tags <span className="muted">(comma separated)</span></label>
                <input id="tags" className="input" value={composer.tags} onChange={(e) => setComposer({ ...composer, tags: e.target.value })} maxLength={120} placeholder="python, pandas" />
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setComposer(null)}>Cancel</button>
                <button className="btn btn--primary" disabled={busy}>{busy ? 'Posting…' : 'Post discussion'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
