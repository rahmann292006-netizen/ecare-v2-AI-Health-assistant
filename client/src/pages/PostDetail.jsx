import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowLeft, CheckCircle2, MessageCircle, Trash2, Flag, Send, Loader2 } from 'lucide-react';
import { AppShell, Loading, ErrorState, Avatar, useToast } from '../components/AppShell.jsx';
import { get, post, del } from '../lib/api.js';
import { relative, fullDay } from '../lib/format.js';

export default function PostDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setError(null);
    get(`/community/posts/${id}`).then(setData).catch(setError);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data) document.title = `${data.post.title} — Lumen`;
  }, [data]);

  const votePost = async (value) => {
    try {
      const res = await post(`/community/posts/${id}/vote`, { value });
      setData((d) => ({ ...d, post: { ...d.post, score: res.score, myVote: res.myVote } }));
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const voteComment = async (commentId, value) => {
    try {
      const res = await post(`/community/comments/${commentId}/vote`, { value });
      setData((d) => ({ ...d, comments: d.comments.map((c) => (c.id === commentId ? { ...c, score: res.score, myVote: res.myVote } : c)) }));
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const accept = async (commentId) => {
    try {
      const res = await post(`/community/comments/${commentId}/accept`, {});
      setData((d) => ({ ...d, post: { ...d.post, acceptedCommentId: res.acceptedCommentId } }));
      toast.push(res.acceptedCommentId ? 'Answer accepted.' : 'Acceptance removed.', 'success');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    if (reply.trim().length < 2) return;
    setBusy(true);
    try {
      await post(`/community/posts/${id}/comments`, { body: reply });
      setReply('');
      load();
      toast.push('Reply posted.', 'success');
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const removePost = async () => {
    try {
      await del(`/community/posts/${id}`);
      toast.push('Discussion deleted.');
      navigate('/community');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const report = async (targetType, targetId) => {
    const reason = window.prompt('What is wrong with this post? (visible to moderators)');
    if (!reason || reason.trim().length < 5) return;
    try {
      await post('/community/report', { targetType, targetId, reason: reason.trim() });
      toast.push('Reported. A moderator will review it.', 'success');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  return (
    <AppShell title="Discussion">
      <div className="page page--narrow">
        <Link to="/community" className="row tiny muted" style={{ gap: 6, marginBottom: 'var(--space-4)' }}>
          <ArrowLeft style={{ width: 13, height: 13 }} /> All discussions
        </Link>

        {error && <ErrorState error={error} onRetry={load} />}
        {!data && !error && <Loading rows={4} height={80} />}

        {data && (
          <div className="stack stack-5">
            <article className="card">
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="stack" style={{ alignItems: 'center', gap: 2, width: 34, flexShrink: 0 }}>
                  <button className="btn btn--ghost btn--icon" onClick={() => votePost(data.post.myVote === 1 ? 0 : 1)} aria-label="Upvote" aria-pressed={data.post.myVote === 1}>
                    <ArrowUp style={{ width: 14, height: 14, color: data.post.myVote === 1 ? 'var(--accent)' : undefined }} />
                  </button>
                  <span className="small strong">{data.post.score}</span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span className="badge">{data.post.group.name}</span>
                    <span className="badge">{data.post.kind}</span>
                    {data.post.acceptedCommentId && <span className="badge badge--success"><CheckCircle2 style={{ width: 10, height: 10 }} /> Answered</span>}
                  </div>
                  <h1 style={{ fontSize: 'var(--step-3)' }}>{data.post.title}</h1>
                  <div className="row tiny muted" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="row" style={{ gap: 6 }}><Avatar name={data.post.author.name} color={data.post.author.avatarColor} /> {data.post.author.name}{data.post.author.isYours ? ' (you)' : ''}</span>
                    <span title={fullDay(data.post.createdAt)}>{relative(data.post.createdAt)}</span>
                    <span className="row" style={{ gap: 4 }}><MessageCircle style={{ width: 12, height: 12 }} /> {data.comments.length}</span>
                  </div>
                  <div className="prose" style={{ marginTop: 'var(--space-4)', whiteSpace: 'pre-wrap' }}>{data.post.body}</div>
                  {data.post.tags.length > 0 && (
                    <div className="row" style={{ gap: 6, marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                      {data.post.tags.map((t) => <span key={t} className="badge">#{t}</span>)}
                    </div>
                  )}
                  <div className="row" style={{ gap: 6, marginTop: 'var(--space-4)' }}>
                    {data.post.author.isYours && <button className="btn btn--danger btn--sm" onClick={removePost}><Trash2 /> Delete</button>}
                    {!data.post.author.isYours && <button className="btn btn--ghost btn--sm" onClick={() => report('post', data.post.id)}><Flag /> Report</button>}
                  </div>
                </div>
              </div>
            </article>

            <div className="stack stack-3">
              <div className="row row--between">
                <span className="card__title">{data.comments.length} {data.comments.length === 1 ? 'reply' : 'replies'}</span>
                {data.canAccept && <span className="tiny muted">You can mark the answer that helped</span>}
              </div>

              {data.comments.length === 0 && (
                <div className="card"><p className="small muted">No replies yet. If you know the answer, it is worth writing down.</p></div>
              )}

              {data.comments.map((c) => (
                <article key={c.id} className="card card--tight" style={c.accepted ? { borderColor: 'var(--success)', background: 'var(--success-soft)' } : undefined}>
                  <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <div className="stack" style={{ alignItems: 'center', gap: 2, width: 30, flexShrink: 0 }}>
                      <button className="btn btn--ghost btn--icon" style={{ width: 24, height: 22 }} onClick={() => voteComment(c.id, c.myVote === 1 ? 0 : 1)} aria-label="Upvote reply" aria-pressed={c.myVote === 1}>
                        <ArrowUp style={{ width: 12, height: 12, color: c.myVote === 1 ? 'var(--accent)' : undefined }} />
                      </button>
                      <span className="tiny strong">{c.score}</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="row" style={{ gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <Avatar name={c.author.name} color={c.author.avatarColor} />
                        <span className="small strong">{c.author.name}{c.author.isYours ? ' (you)' : ''}</span>
                        <span className="tiny muted">{relative(c.createdAt)}</span>
                        {c.accepted && <span className="badge badge--success"><CheckCircle2 style={{ width: 10, height: 10 }} /> Accepted answer</span>}
                      </div>
                      <div className="small" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{c.body}</div>
                      <div className="row" style={{ gap: 6, marginTop: 8 }}>
                        {data.canAccept && !c.author.isYours && (
                          <button className="btn btn--ghost btn--sm" onClick={() => accept(c.id)}>
                            {c.accepted ? 'Remove acceptance' : 'Accept answer'}
                          </button>
                        )}
                        {!c.author.isYours && <button className="btn btn--ghost btn--sm" onClick={() => report('comment', c.id)}><Flag /> Report</button>}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <form className="card" onSubmit={submitReply}>
              <div className="card__head"><div className="card__title">Add a reply</div></div>
              <textarea className="textarea" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Explain the reasoning, not just the fix." aria-label="Your reply" />
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                <button className="btn btn--primary" disabled={busy || reply.trim().length < 2}>
                  {busy ? <Loader2 className="spin" /> : <Send />} Post reply
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
