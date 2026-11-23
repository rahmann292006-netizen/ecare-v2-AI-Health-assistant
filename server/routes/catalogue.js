import express from 'express';
import { all, get } from '../db/index.js';
import { ok, notFound } from '../lib/http.js';
import { aiHealth } from '../lib/ai-provider.js';
import { health as sandboxHealth } from '../sandbox/index.js';
import { smtpConfigured } from '../lib/mailer.js';
import { providerConfig } from '../lib/oauth.js';

const router = express.Router();

/** Public catalogue — browsable without an account, as the brief requires. */
router.get('/courses', (_req, res) => {
  const rows = all('SELECT * FROM courses WHERE is_published = 1 ORDER BY sort_order');
  ok(res, {
    courses: rows.map((c) => ({
      slug: c.slug,
      title: c.title,
      tagline: c.tagline,
      description: c.description,
      level: c.level,
      durationHours: c.duration_hours,
      category: c.category,
      icon: c.icon,
      outcomes: JSON.parse(c.outcomes_json),
      moduleCount: get('SELECT COUNT(*) AS n FROM course_modules WHERE course_id = ?', [c.id]).n,
      lessonCount: get(
        'SELECT COUNT(*) AS n FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ?',
        [c.id],
      ).n,
    })),
    categories: [...new Set(rows.map((r) => r.category))],
    totalLessons: get('SELECT COUNT(*) AS n FROM lessons').n,
  });
});

router.get('/courses/:slug', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ? AND is_published = 1', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  const modules = all('SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order', [c.id]);
  ok(res, {
    course: {
      slug: c.slug, title: c.title, tagline: c.tagline, description: c.description,
      level: c.level, durationHours: c.duration_hours, category: c.category, icon: c.icon,
      outcomes: JSON.parse(c.outcomes_json), prereqs: JSON.parse(c.prereqs_json),
    },
    // Titles are public; bodies require an account so progress can be recorded.
    modules: modules.map((m) => ({
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      level: m.level,
      lessons: all('SELECT slug, title, kind, duration_minutes FROM lessons WHERE module_id = ? ORDER BY sort_order', [m.id])
        .map((l) => ({ slug: l.slug, title: l.title, kind: l.kind, minutes: l.duration_minutes })),
    })),
  });
});

router.get('/aptitude', (_req, res) => {
  const topics = all('SELECT slug, category, title, description FROM aptitude_topics ORDER BY sort_order');
  ok(res, {
    topics: topics.map((t) => ({
      ...t,
      questionCount: get('SELECT COUNT(*) AS n FROM aptitude_questions q JOIN aptitude_topics t2 ON t2.id = q.topic_id WHERE t2.slug = ?', [t.slug]).n,
    })),
  });
});

/** Platform capability report: what actually works right now, with no pretence. */
router.get('/status', async (_req, res) => {
  const sandbox = await sandboxHealth();
  const ai = aiHealth();
  ok(res, {
    platform: { name: 'Lumen', version: '1.0.0', free: true },
    features: {
      learning: { available: true },
      codingLab: { available: sandbox.ready, level: sandbox.level, isolation: sandbox.isolation, productionReady: sandbox.productionReady, reason: sandbox.reason },
      aiTutor: { available: ai.configured, provider: ai.provider, model: ai.model, reason: ai.reason },
      community: { available: true },
      aptitude: { available: true },
      analytics: { available: true },
      email: { available: smtpConfigured, note: smtpConfigured ? 'SMTP configured' : 'Mail is written to the local outbox; set SMTP_* to send' },
      oauth: providerConfig(),
    },
  });
});

router.get('/stats', (_req, res) => {
  ok(res, {
    courses: get('SELECT COUNT(*) AS n FROM courses WHERE is_published = 1').n,
    lessons: get('SELECT COUNT(*) AS n FROM lessons').n,
    modules: get('SELECT COUNT(*) AS n FROM course_modules').n,
    exercises: get('SELECT COUNT(*) AS n FROM exercises').n,
    aptitudeQuestions: get('SELECT COUNT(*) AS n FROM aptitude_questions').n,
    assessmentQuestions: get('SELECT COUNT(*) AS n FROM questions').n,
    groups: get('SELECT COUNT(*) AS n FROM community_groups').n,
    learners: get("SELECT COUNT(*) AS n FROM users WHERE status = 'active'").n,
    posts: get('SELECT COUNT(*) AS n FROM community_posts WHERE is_removed = 0').n,
  });
});

export default router;
