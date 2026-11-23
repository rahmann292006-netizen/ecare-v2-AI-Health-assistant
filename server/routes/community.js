import express from 'express';
import { all, get, run, nowIso } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, forbidden, badRequest, HttpError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { limit } from '../lib/rate-limit.js';
import { awardFor } from '../lib/achievements.js';

const router = express.Router();
router.use(requireUser);

const POST_TYPES = ['thread', 'question', 'showcase'];

function postView(row, userId) {
  const author = get('SELECT display_name, avatar_color FROM user_profiles WHERE user_id = ?', [row.author_id]);
  const vote = get('SELECT value FROM post_votes WHERE user_id = ? AND post_id = ?', [userId, row.id]);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body_md,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
    score: row.score,
    commentCount: row.comment_count,
    acceptedCommentId: row.accepted_comment_id,
    pinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    group: { slug: row.group_slug, name: row.group_name },
    author: { name: author?.display_name || 'Learner', avatarColor: author?.avatar_color || 'amber', isYours: row.author_id === userId },
    myVote: vote?.value || 0,
  };
}

router.get('/groups', (req, res) => {
  const groups = all(
    `SELECT g.*, (SELECT COUNT(*) FROM community_posts p WHERE p.group_id = g.id AND p.is_removed = 0) AS post_count
       FROM community_groups g ORDER BY g.name`,
  );
  ok(res, {
    groups: groups.map((g) => ({
      slug: g.slug, name: g.name, description: g.description, category: g.category, icon: g.icon, postCount: g.post_count,
    })),
    guidelines: GUIDELINES,
  });
});

router.get('/posts', (req, res) => {
  const groupSlug = req.query.group ? String(req.query.group) : null;
  const sort = req.query.sort === 'top' ? 'top' : 'new';
  const q = req.query.q ? String(req.query.q).slice(0, 100).trim() : '';
  const limitN = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const where = ['p.is_removed = 0'];
  const params = [];
  if (groupSlug) {
    where.push('g.slug = ?');
    params.push(groupSlug);
  }
  if (q) {
    where.push('(p.title LIKE ? OR p.body_md LIKE ? OR p.tags LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const order = sort === 'top' ? 'p.score DESC, p.created_at DESC' : 'p.created_at DESC';
  const rows = all(
    `SELECT p.*, g.slug AS group_slug, g.name AS group_name
       FROM community_posts p JOIN community_groups g ON g.id = p.group_id
      WHERE ${where.join(' AND ')} ORDER BY p.is_pinned DESC, ${order} LIMIT ? OFFSET ?`,
    [...params, limitN, offset],
  );
  const total = get(
    `SELECT COUNT(*) AS n FROM community_posts p JOIN community_groups g ON g.id = p.group_id WHERE ${where.join(' AND ')}`,
    params,
  ).n;
  ok(res, { posts: rows.map((r) => postView(r, req.user.id)), total, hasMore: offset + rows.length < total });
});

router.get('/posts/:id', (req, res) => {
  const row = get(
    `SELECT p.*, g.slug AS group_slug, g.name AS group_name FROM community_posts p
       JOIN community_groups g ON g.id = p.group_id WHERE p.id = ?`,
    [Number(req.params.id)],
  );
  if (!row || row.is_removed) throw notFound('That discussion does not exist.');
  const comments = all(
    'SELECT * FROM community_comments WHERE post_id = ? AND is_removed = 0 ORDER BY created_at',
    [row.id],
  ).map((c) => {
    const author = get('SELECT display_name, avatar_color FROM user_profiles WHERE user_id = ?', [c.author_id]);
    const vote = get('SELECT value FROM comment_votes WHERE user_id = ? AND comment_id = ?', [req.user.id, c.id]);
    return {
      id: c.id, body: c.body_md, score: c.score, createdAt: c.created_at, parentId: c.parent_id,
      accepted: row.accepted_comment_id === c.id,
      author: { name: author?.display_name || 'Learner', avatarColor: author?.avatar_color || 'amber', isYours: c.author_id === req.user.id },
      myVote: vote?.value || 0,
    };
  });
  ok(res, { post: postView(row, req.user.id), comments, canAccept: row.author_id === req.user.id });
});

router.post('/posts', limit('post-create', 10, 60 * 60 * 1000), (req, res) => {
  const body = validate(req.body, {
    groupSlug: { type: 'string', required: true, max: 60 },
    kind: { type: 'enum', values: POST_TYPES, default: 'thread' },
    title: { type: 'string', required: true, min: 8, max: 160, label: 'Title' },
    body: { type: 'string', required: true, min: 10, max: 20_000 },
    tags: { type: 'string', max: 120 },
  });
  const group = get('SELECT * FROM community_groups WHERE slug = ?', [body.groupSlug]);
  if (!group) throw notFound('That group does not exist.');
  const info = run(
    'INSERT INTO community_posts (group_id, author_id, kind, title, body_md, tags) VALUES (?,?,?,?,?,?)',
    [group.id, req.user.id, body.kind, body.title, body.body, body.tags || ''],
  );
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'community_post', 'post', info.lastInsertRowid]);
  awardFor(req.user.id);
  const row = get(
    `SELECT p.*, g.slug AS group_slug, g.name AS group_name FROM community_posts p
       JOIN community_groups g ON g.id = p.group_id WHERE p.id = ?`,
    [info.lastInsertRowid],
  );
  ok(res, { post: postView(row, req.user.id) }, 201);
});

router.delete('/posts/:id', (req, res) => {
  const row = get('SELECT * FROM community_posts WHERE id = ?', [Number(req.params.id)]);
  if (!row) throw notFound('That discussion does not exist.');
  const isOwner = row.author_id === req.user.id;
  const isModerator = req.user.role === 'moderator' || req.user.role === 'admin';
  if (!isOwner && !isModerator) throw forbidden('You can only delete your own discussions.');
  run('UPDATE community_posts SET is_removed = 1, deleted_at = ? WHERE id = ?', [nowIso(), row.id]);
  ok(res, { removed: row.id });
});

router.post('/posts/:id/comments', limit('comment-create', 30, 60 * 60 * 1000), (req, res) => {
  const body = validate(req.body, {
    body: { type: 'string', required: true, min: 2, max: 10_000 },
    parentId: { type: 'int' },
  });
  const post = get('SELECT * FROM community_posts WHERE id = ? AND is_removed = 0', [Number(req.params.id)]);
  if (!post) throw notFound('That discussion does not exist.');
  const info = run('INSERT INTO community_comments (post_id, author_id, parent_id, body_md) VALUES (?,?,?,?)',
    [post.id, req.user.id, body.parentId || null, body.body]);
  run('UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = ?', [post.id]);
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'community_comment', 'post', post.id]);
  const author = get('SELECT display_name, avatar_color FROM user_profiles WHERE user_id = ?', [req.user.id]);
  ok(res, {
    comment: {
      id: info.lastInsertRowid, body: body.body, score: 0, createdAt: nowIso(), parentId: body.parentId || null, accepted: false,
      author: { name: author?.display_name || 'Learner', avatarColor: author?.avatar_color || 'amber', isYours: true }, myVote: 0,
    },
  }, 201);
});

/** Vote: value 1, -1, or 0 to clear. One vote per user per item, enforced by the primary key. */
function applyVote({ table, idColumn, itemTable, itemId, userId, value }) {
  const existing = get(`SELECT value FROM ${table} WHERE user_id = ? AND ${idColumn} = ?`, [userId, itemId]);
  if (existing) {
    run(`DELETE FROM ${table} WHERE user_id = ? AND ${idColumn} = ?`, [userId, itemId]);
    run(`UPDATE ${itemTable} SET score = score - ? WHERE id = ?`, [existing.value, itemId]);
  }
  if (value !== 0) {
    run(`INSERT INTO ${table} (user_id, ${idColumn}, value) VALUES (?,?,?)`, [userId, itemId, value]);
    run(`UPDATE ${itemTable} SET score = score + ? WHERE id = ?`, [value, itemId]);
  }
  return get(`SELECT score FROM ${itemTable} WHERE id = ?`, [itemId]).score;
}

router.post('/posts/:id/vote', (req, res) => {
  const value = Number(req.body?.value);
  if (![1, -1, 0].includes(value)) throw badRequest('Vote must be 1, -1 or 0.');
  const post = get('SELECT * FROM community_posts WHERE id = ? AND is_removed = 0', [Number(req.params.id)]);
  if (!post) throw notFound('That discussion does not exist.');
  if (post.author_id === req.user.id) throw badRequest('You cannot vote on your own discussion.');
  const score = applyVote({ table: 'post_votes', idColumn: 'post_id', itemTable: 'community_posts', itemId: post.id, userId: req.user.id, value });
  const mine = get('SELECT value FROM post_votes WHERE user_id = ? AND post_id = ?', [req.user.id, post.id]);
  ok(res, { score, myVote: mine?.value || 0 });
});

router.post('/comments/:id/vote', (req, res) => {
  const value = Number(req.body?.value);
  if (![1, -1, 0].includes(value)) throw badRequest('Vote must be 1, -1 or 0.');
  const comment = get('SELECT * FROM community_comments WHERE id = ? AND is_removed = 0', [Number(req.params.id)]);
  if (!comment) throw notFound('That comment does not exist.');
  if (comment.author_id === req.user.id) throw badRequest('You cannot vote on your own comment.');
  const score = applyVote({ table: 'comment_votes', idColumn: 'comment_id', itemTable: 'community_comments', itemId: comment.id, userId: req.user.id, value });
  const mine = get('SELECT value FROM comment_votes WHERE user_id = ? AND comment_id = ?', [req.user.id, comment.id]);
  ok(res, { score, myVote: mine?.value || 0 });
});

router.post('/comments/:id/accept', (req, res) => {
  const comment = get('SELECT * FROM community_comments WHERE id = ? AND is_removed = 0', [Number(req.params.id)]);
  if (!comment) throw notFound('That comment does not exist.');
  const post = get('SELECT * FROM community_posts WHERE id = ?', [comment.post_id]);
  if (post.author_id !== req.user.id) throw forbidden('Only the author of the question can mark an answer.');
  const next = post.accepted_comment_id === comment.id ? null : comment.id;
  run('UPDATE community_posts SET accepted_comment_id = ? WHERE id = ?', [next, post.id]);
  if (next) run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [comment.author_id, 'answer_accepted', 'comment', comment.id]);
  awardFor(comment.author_id);
  ok(res, { acceptedCommentId: next });
});

router.post('/report', limit('report', 20, 60 * 60 * 1000), (req, res) => {
  const body = validate(req.body, {
    targetType: { type: 'enum', values: ['post', 'comment'], required: true },
    targetId: { type: 'int', required: true },
    reason: { type: 'string', required: true, min: 5, max: 500 },
  });
  run('INSERT INTO community_reports (reporter_id, target_type, target_id, reason) VALUES (?,?,?,?)',
    [req.user.id, body.targetType, body.targetId, body.reason]);
  ok(res, { reported: true });
});

/** Moderation queue — moderators and admins only. */
router.get('/reports', (req, res) => {
  if (!['moderator', 'admin'].includes(req.user.role)) throw forbidden('Moderators only.');
  const rows = all(
    `SELECT r.*, u.email AS reporter_email FROM community_reports r JOIN users u ON u.id = r.reporter_id
      WHERE r.status = 'open' ORDER BY r.created_at DESC`,
  );
  ok(res, { reports: rows });
});

const GUIDELINES = [
  'Be specific. Show the code, the error, and what you already tried.',
  'Teach rather than dump a full solution when someone is learning.',
  'No harassment, no discrimination, no personal attacks. Disagree with ideas.',
  'Never post credentials, API keys, or other people\'s personal data.',
  'Security discussion must be defensive and about systems you own.',
  'Search before posting — your question may already have an answer.',
  'Report rather than escalate: moderators handle violations.',
];

export default router;
