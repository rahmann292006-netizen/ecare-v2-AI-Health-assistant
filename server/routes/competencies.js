/**
 * Competencies and job-readiness evidence.
 *
 * The rule from docs/curriculum/JOB_READINESS_FRAMEWORK.md, implemented literally:
 *   - a competency is demonstrated only by evidence that PASSED
 *   - evidence kinds are assessment, project, challenge (and 'self', which is
 *     recorded for the learner and never counted)
 *   - lesson views, streaks, minutes and AI-tutor usage are never evidence
 *   - readiness is a weighted percentage of EVIDENCED competencies
 */
import express from 'express';
import { get, all, run } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound, badRequest } from '../lib/http.js';

const router = express.Router();

export const COUNTED_KINDS = ['assessment', 'project', 'challenge'];

/** Record one piece of evidence. Idempotent: the same evidence is stored once. */
export function recordEvidence({ userId, competencyId, kind, refType = null, refId = null, score = null, passed = false }) {
  if (!COUNTED_KINDS.includes(kind) && kind !== 'self') return null;
  // One evidence row per (competency, kind, ref) — enforced in code, not by a partial
  // index, so a NULL ref_type cannot slip a duplicate through.
  const existing = get(
    `SELECT id, passed FROM competency_evidence
      WHERE user_id = ? AND competency_id = ? AND kind = ? AND COALESCE(ref_type,'') = COALESCE(?,'') AND COALESCE(ref_id, -1) = COALESCE(?, -1)`,
    [userId, competencyId, kind, refType, refId],
  );
  if (existing) {
    run('UPDATE competency_evidence SET score = ?, passed = ? WHERE id = ?', [
      score ?? null,
      Math.max(existing.passed, passed ? 1 : 0),
      existing.id,
    ]);
    return true;
  }
  run(
    `INSERT INTO competency_evidence (user_id, competency_id, kind, ref_type, ref_id, score, passed)
     VALUES (?,?,?,?,?,?,?)`,
    [userId, competencyId, kind, refType, refId, score, passed ? 1 : 0],
  );
  return true;
}

/** Competencies whose linked assessment was passed by this user. */
export function syncAssessmentEvidence(userId, courseId) {
  const passed = all(
    `SELECT a.id AS assessment_id, MAX(s.score) AS score
       FROM submissions s JOIN assessments a ON a.id = s.assessment_id
      WHERE s.user_id = ? AND a.course_id = ? AND s.passed = 1
      GROUP BY a.id`,
    [userId, courseId],
  );
  let recorded = 0;
  for (const row of passed) {
    const comps = all(
      "SELECT id FROM competencies WHERE course_id = ? AND evidence_ref = ? AND key != 'capstone'",
      [courseId, `assessment:${row.assessment_id}`],
    );
    for (const c of comps) {
      recordEvidence({ userId, competencyId: c.id, kind: 'assessment', refType: 'assessment', refId: row.assessment_id, score: row.score, passed: true });
      recorded += 1;
    }
  }
  return recorded;
}

/** Competencies evidenced by a project the learner marked done with a repository link. */
export function syncProjectEvidence(userId, courseId) {
  const done = all(
    `SELECT up.project_id, p.slug FROM user_projects up JOIN projects p ON p.id = up.project_id
      WHERE up.user_id = ? AND up.status = 'done' AND up.repo_url IS NOT NULL AND p.course_id = ?`,
    [userId, courseId],
  );
  let recorded = 0;
  for (const row of done) {
    // a course-level capstone competency is evidenced by any done project with a link;
    // a module competency only by its own module's project, when one is linked
    const comps = all(
      `SELECT id FROM competencies WHERE course_id = ?
         AND (evidence_ref = ? OR (key = 'capstone' AND evidence_ref IS NULL))`,
      [courseId, `project:${row.project_id}`],
    );
    for (const c of comps) {
      recordEvidence({ userId, competencyId: c.id, kind: 'project', refType: 'project', refId: row.project_id, passed: true });
      recorded += 1;
    }
  }
  return recorded;
}

/**
 * Readiness for one course.
 * evidenced = 2+ distinct evidence kinds; demonstrated = 1 kind.
 */
export function computeReadiness(userId, courseId) {
  const comps = all('SELECT * FROM competencies WHERE course_id = ? ORDER BY sort_order', [courseId]);
  if (!comps.length) {
    return { available: false, reason: 'No competencies are defined for this course yet.', percent: null, items: [] };
  }
  const evidence = all(
    `SELECT competency_id, kind, passed FROM competency_evidence WHERE user_id = ? AND competency_id IN (${comps.map(() => '?').join(',') || 'NULL'})`,
    [userId, ...comps.map((c) => c.id)],
  );
  const byComp = new Map();
  for (const e of evidence) {
    if (!byComp.has(e.competency_id)) byComp.set(e.competency_id, new Set());
    if (e.passed) byComp.get(e.competency_id).add(e.kind);
  }

  let weight = 0;
  let score = 0;
  const items = comps.map((c) => {
    const kinds = [...(byComp.get(c.id) || new Set())].filter((k) => COUNTED_KINDS.includes(k));
    const state = kinds.length >= 2 ? 'evidenced' : kinds.length === 1 ? 'demonstrated' : 'not_demonstrated';
    const w = c.weight === 'core' ? 2 : 1;
    weight += w;
    score += state === 'evidenced' ? w : state === 'demonstrated' ? w * 0.5 : 0;
    return {
      key: c.key,
      title: c.title,
      description: c.description,
      role: c.role,
      weight: c.weight,
      state,
      evidenceKinds: kinds,
    };
  });

  const percent = weight ? Math.round((score / weight) * 100) : 0;
  return {
    available: true,
    percent,
    band: percent >= 75 ? 'portfolio_ready' : percent >= 50 ? 'practising' : percent >= 25 ? 'developing' : 'exploring',
    demonstrated: items.filter((i) => i.state !== 'not_demonstrated').length,
    evidenced: items.filter((i) => i.state === 'evidenced').length,
    total: items.length,
    items,
  };
}

/* ───────────────────────────── routes ───────────────────────────── */

router.use(requireUser);

/** The framework itself, for a course. */
router.get('/courses/:slug', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  const competencies = all('SELECT key, title, description, role, weight, evidence_ref, sort_order FROM competencies WHERE course_id = ? ORDER BY sort_order', [c.id]);
  // evidence is derived from the learner's real results, so refresh it on every read
  syncAssessmentEvidence(req.user.id, c.id);
  syncProjectEvidence(req.user.id, c.id);
  ok(res, {
    course: { slug: c.slug, title: c.title },
    readiness: computeReadiness(req.user.id, c.id),
    competencies: competencies.map((x) => ({
      key: x.key,
      title: x.title,
      description: x.description,
      role: x.role,
      weight: x.weight,
      evidenceRef: x.evidence_ref,
    })),
  });
});

/** Record a self-assessment (never counted towards readiness). */
router.post('/courses/:slug/self-assess', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  const key = String(req.body?.competencyKey || '');
  const comp = get('SELECT * FROM competencies WHERE course_id = ? AND key = ?', [c.id, key]);
  if (!comp) throw badRequest('That competency does not belong to this course.');
  recordEvidence({ userId: req.user.id, competencyId: comp.id, kind: 'self', refType: 'self', refId: null, passed: Boolean(req.body?.confident) });
  ok(res, { recorded: true, counted: false });
});

/** Projects for one course: the learner's own status and repository link. */
router.get('/courses/:slug/projects', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  const rows = all(
    `SELECT p.id, p.slug, p.title, p.brief_md, p.difficulty, p.est_hours,
            COALESCE(up.status, 'planned') AS status, up.repo_url, up.notes
       FROM projects p LEFT JOIN user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.course_id = ? ORDER BY p.est_hours DESC`,
    [req.user.id, c.id],
  );
  ok(res, {
    projects: rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      brief: r.brief_md,
      difficulty: r.difficulty,
      estHours: r.est_hours,
      status: r.status,
      repoUrl: r.repo_url,
      notes: r.notes,
    })),
  });
});

/**
 * Record a project's state. "done" only counts as evidence when a repository link
 * is present — a finished project nobody can read is not evidence.
 */
router.put('/courses/:slug/projects/:projectSlug', (req, res) => {
  const c = get('SELECT * FROM courses WHERE slug = ?', [req.params.slug]);
  if (!c) throw notFound('That course does not exist.');
  const p = get('SELECT * FROM projects WHERE course_id = ? AND slug = ?', [c.id, req.params.projectSlug]);
  if (!p) throw notFound('That project does not belong to this course.');
  const body = req.body || {};
  const status = ['planned', 'building', 'done'].includes(body.status) ? body.status : 'planned';
  let repoUrl = typeof body.repoUrl === 'string' ? body.repoUrl.trim() : null;
  if (repoUrl && !/^https?:\/\/\S+$/.test(repoUrl)) throw badRequest('A repository link must be a full http(s) URL.', { repoUrl: 'Enter a full URL.' });
  if (repoUrl && repoUrl.length > 400) repoUrl = repoUrl.slice(0, 400);
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null;

  run(
    `INSERT INTO user_projects (user_id, project_id, status, repo_url, notes, updated_at, completed_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id, project_id) DO UPDATE SET
       status = excluded.status, repo_url = excluded.repo_url, notes = excluded.notes,
       updated_at = excluded.updated_at,
       completed_at = CASE WHEN excluded.status = 'done' THEN COALESCE(user_projects.completed_at, excluded.completed_at) ELSE NULL END`,
    [req.user.id, p.id, status, repoUrl, notes, new Date().toISOString(), status === 'done' ? new Date().toISOString() : null],
  );
  const evidenced = syncProjectEvidence(req.user.id, c.id);
  ok(res, { saved: true, evidencedCompetencies: evidenced });
});

/** Everything across all courses — the readiness dashboard. */
router.get('/overview', (req, res) => {
  const courses = all('SELECT id, slug, title FROM courses WHERE is_published = 1 ORDER BY sort_order');
  const out = [];
  for (const c of courses) {
    syncAssessmentEvidence(req.user.id, c.id);
    syncProjectEvidence(req.user.id, c.id);
    const r = computeReadiness(req.user.id, c.id);
    out.push({ course: c.slug, title: c.title, readiness: r });
  }
  ok(res, { courses: out });
});

export default router;
