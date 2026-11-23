import express from 'express';
import { all, get, run, nowIso } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, HttpError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { limit } from '../lib/rate-limit.js';
import { aiStatus, aiHealth, chat, chatStream } from '../lib/ai-provider.js';
import { retrieve, groundedSystem, learnerContext, saveExchange } from '../lib/ai-rag.js';
import { awardFor } from '../lib/achievements.js';
import { logError } from '../lib/http.js';

const router = express.Router();

/** Public: the UI renders a setup card instead of an answer when unconfigured. */
router.get('/status', (_req, res) => ok(res, { ...aiHealth(), retrieval: 'bm25' }));

router.use(requireUser);

router.get('/conversations', (req, res) => {
  const rows = all(
    `SELECT c.id, c.title, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) AS messages
       FROM ai_conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 50`,
    [req.user.id],
  );
  ok(res, { conversations: rows });
});

router.get('/conversations/:id', (req, res) => {
  const c = get('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!c) throw notFound('That conversation does not exist.');
  const messages = all('SELECT id, role, content, citations_json, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY id', [c.id]);
  ok(res, {
    conversation: { id: c.id, title: c.title, createdAt: c.created_at },
    messages: messages.map((m) => ({
      id: m.id, role: m.role, content: m.content,
      citations: m.citations_json ? JSON.parse(m.citations_json) : [],
      at: m.created_at,
    })),
  });
});

router.delete('/conversations/:id', (req, res) => {
  const c = get('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!c) throw notFound('That conversation does not exist.');
  run('DELETE FROM ai_conversations WHERE id = ?', [c.id]);
  ok(res, { deleted: c.id });
});

function ensureConversation(userId, { conversationId, courseSlug, lessonSlug, firstMessage }) {
  if (conversationId) {
    const c = get('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?', [Number(conversationId), userId]);
    if (!c) throw notFound('That conversation does not exist.');
    return c;
  }
  const course = courseSlug ? get('SELECT id FROM courses WHERE slug = ?', [courseSlug]) : null;
  const lesson = lessonSlug && course
    ? get('SELECT l.id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND l.slug = ?', [course.id, lessonSlug])
    : null;
  const title = String(firstMessage || 'New conversation').replace(/\s+/g, ' ').slice(0, 70);
  const info = run('INSERT INTO ai_conversations (user_id, course_id, lesson_id, title) VALUES (?,?,?,?)',
    [userId, course?.id || null, lesson?.id || null, title]);
  return get('SELECT * FROM ai_conversations WHERE id = ?', [info.lastInsertRowid]);
}


const MODES = ['explain', 'hint', 'example', 'debug'];

/**
 * Everything the tutor needs to answer in context: where the student is, what they
 * have finished, and the passages that support the answer. All read from stored rows.
 */
function buildTutorContext(userId, { courseSlug, lessonSlug, message }) {
  const course = courseSlug ? get('SELECT * FROM courses WHERE slug = ?', [courseSlug]) : null;
  let lesson = null;
  let module = null;
  if (course && lessonSlug) {
    lesson = get(
      `SELECT l.*, m.title AS module_title, m.slug AS module_slug, m.id AS module_id
         FROM lessons l JOIN course_modules m ON m.id = l.module_id
        WHERE m.course_id = ? AND l.slug = ?`,
      [course.id, lessonSlug],
    );
    if (lesson) module = { id: lesson.module_id, title: lesson.module_title, slug: lesson.module_slug };
  }

  const totals = course
    ? get(
        `SELECT COUNT(*) AS total FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ?`,
        [course.id],
      ).total
    : 0;
  const completed = course
    ? get(
        `SELECT COUNT(*) AS n FROM lesson_progress p
           JOIN lessons l ON l.id = p.lesson_id JOIN course_modules m ON m.id = l.module_id
          WHERE m.course_id = ? AND p.user_id = ? AND p.status = 'completed'`,
        [course.id, userId],
      ).n
    : 0;

  const passedTopics = all(
    `SELECT a.title FROM submissions s JOIN assessments a ON a.id = s.assessment_id
      WHERE s.user_id = ? AND s.passed = 1 GROUP BY a.id ORDER BY MAX(s.submitted_at) DESC LIMIT 6`,
    [userId],
  ).map((r) => r.title);

  const progress = course
    ? { completed, total: totals, percent: totals ? Math.round((completed / totals) * 100) : 0 }
    : null;

  const chunks = retrieve(message, {
    k: 6,
    courseId: course?.id,
    lessonId: lesson?.id,
  });

  const context = learnerContext({
    course: course ? { title: course.title, level: course.level } : null,
    module,
    lesson: lesson ? { title: lesson.title, kind: lesson.kind } : null,
    progress,
    passedTopics,
  });

  return { course, lesson, module, progress, chunks, context };
}

function citationList(chunks) {
  const seen = new Set();
  const out = [];
  for (const c of chunks) {
    if (seen.has(c.chunkId)) continue;
    seen.add(c.chunkId);
    out.push({
      n: out.length + 1,
      chunkId: c.chunkId,
      lessonId: c.lessonId,
      lessonTitle: c.lessonTitle,
      lessonSlug: c.lessonSlug,
      courseSlug: c.courseSlug,
      courseTitle: c.courseTitle,
      moduleTitle: c.moduleTitle,
      heading: c.heading,
      score: c.score,
      snippet: String(c.content || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    });
  }
  return out;
}

const CHAT_LIMIT = Number(process.env.AI_RATE_LIMIT || 60);

router.post('/chat', limit('ai-chat', CHAT_LIMIT, 60 * 60 * 1000), async (req, res, next) => {
  try {
  const body = validate(req.body, {
    message: { type: 'string', required: true, min: 2, max: 4000 },
    conversationId: { type: 'int' },
    courseSlug: { type: 'string', max: 120 },
    lessonSlug: { type: 'string', max: 120 },
    mode: { type: 'enum', values: MODES },
  });

  const status = aiHealth();
  if (!status.configured) {
    throw new HttpError(503, 'ai_not_configured',
      `${status.reason} Add an API key on the server to enable the AI tutor. The tutor does not answer without one.`);
  }

  const conversation = ensureConversation(req.user.id, body);
  const history = all(
    'SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 8',
    [conversation.id],
  ).reverse();

  const ctx = buildTutorContext(req.user.id, {
    courseSlug: body.courseSlug || get('SELECT slug FROM courses WHERE id = ?', [conversation.course_id])?.slug,
    lessonSlug: body.lessonSlug || get('SELECT slug FROM lessons WHERE id = ?', [conversation.lesson_id])?.slug,
    message: body.message,
  });
  const messages = [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: body.message }];
  const system = groundedSystem(ctx.chunks, ctx.context, { mode: body.mode });

  const answer = await chat({ system, messages });
  const citations = citationList(ctx.chunks);
  const ids = saveExchange(conversation.id, body.message, answer.text, citations);
  run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'ai_message', 'conversation', conversation.id]);
  const awarded = awardFor(req.user.id);

  ok(res, {
    conversationId: conversation.id,
    message: { id: ids.assistantId, role: 'assistant', content: answer.text, citations },
    model: answer.model,
    grounded: ctx.chunks.length > 0,
    context: { course: ctx.course?.slug || null, lesson: ctx.lesson?.slug || null, progress: ctx.progress },
    awarded,
  });
  } catch (err) {
    logError(err, req);
    if (err instanceof HttpError) {
      return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    return res.status(err.status || 500).json({ ok: false, error: { code: err.code || 'ai_failed', message: err.message || 'The AI tutor could not answer.' } });
  }
});

/** Server-sent events stream. Same rules, same refusal when unconfigured. */
router.post('/chat/stream', limit('ai-chat', CHAT_LIMIT, 60 * 60 * 1000), async (req, res) => {
  const body = validate(req.body, {
    message: { type: 'string', required: true, min: 2, max: 4000 },
    conversationId: { type: 'int' },
    courseSlug: { type: 'string', max: 120 },
    lessonSlug: { type: 'string', max: 120 },
    mode: { type: 'enum', values: MODES },
  });

  const status = aiHealth();
  if (!status.configured) {
    return res.status(503).json({ ok: false, error: { code: 'ai_not_configured', message: `${status.reason} Add an API key on the server to enable the AI tutor.` } });
  }

  const conversation = ensureConversation(req.user.id, body);
  const history = all('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 8', [conversation.id]).reverse();
  const ctx = buildTutorContext(req.user.id, {
    courseSlug: body.courseSlug || get('SELECT slug FROM courses WHERE id = ?', [conversation.course_id])?.slug,
    lessonSlug: body.lessonSlug || get('SELECT slug FROM lessons WHERE id = ?', [conversation.lesson_id])?.slug,
    message: body.message,
  });
  const messages = [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: body.message }];
  const system = groundedSystem(ctx.chunks, ctx.context, { mode: body.mode });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('meta', {
    conversationId: conversation.id,
    citations: citationList(ctx.chunks),
    grounded: ctx.chunks.length > 0,
    model: status.model,
    context: { course: ctx.course?.slug || null, lesson: ctx.lesson?.slug || null, progress: ctx.progress },
  });

  let full = '';
  try {
    for await (const delta of chatStream({ system, messages })) {
      full += delta;
      send('delta', { text: delta });
    }
    const citations = citationList(ctx.chunks);
    saveExchange(conversation.id, body.message, full, citations);
    run('INSERT INTO activity_events (user_id, kind, ref_type, ref_id) VALUES (?,?,?,?)', [req.user.id, 'ai_message', 'conversation', conversation.id]);
    send('done', { text: full, awarded: awardFor(req.user.id) });
  } catch (err) {
    send('error', { code: err.code || 'ai_failed', message: err.message || 'The AI tutor could not answer.' });
  } finally {
    res.end();
  }
});

/** Retrieval preview — used by the UI to show which passages an answer will use. */
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').slice(0, 300);
  if (!q.trim()) return ok(res, { results: [] });
  const results = retrieve(q, { k: 8, courseId: req.query.courseSlug ? get('SELECT id FROM courses WHERE slug = ?', [req.query.courseSlug])?.id : undefined });
  ok(res, { results: results.map(({ content, ...rest }) => ({ ...rest, preview: content.slice(0, 220) })) });
});

export default router;
