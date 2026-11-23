/**
 * Roadmaps — the student-visible plan of a course, readable before enrolment.
 *
 * A roadmap never claims more than the database can support: every module carries
 * `writtenLessons` and `outlineLessons` separately, so the UI can show which parts
 * of the journey can be studied today.
 */
import express from 'express';
import { get, all } from '../db/index.js';
import { requireUser } from '../lib/context.js';
import { ok, notFound } from '../lib/http.js';
import { readRoadmap } from '../lib/roadmap.js';

const router = express.Router();

function courseRow(slug) {
  const c = get('SELECT * FROM courses WHERE slug = ? AND is_published = 1', [slug]);
  if (!c) throw notFound('That course does not exist.');
  return c;
}

/** Public: a roadmap can be previewed before signing in. */
router.get('/courses/:slug/roadmap', (req, res) => {
  const c = courseRow(req.params.slug);
  const roadmap = readRoadmap(c.id, req.user?.id ?? null);
  if (!roadmap) throw notFound('This course has no roadmap yet.');
  ok(res, {
    course: {
      slug: c.slug,
      title: c.title,
      tagline: c.tagline,
      level: c.level,
      durationHours: c.duration_hours,
      outcomes: JSON.parse(c.outcomes_json),
      prereqs: JSON.parse(c.prereqs_json),
    },
    roadmap,
    // honest availability: what can be studied right now
    availability: {
      writtenLessons: roadmap.totals.lessons - roadmap.totals.outlineLessons,
      totalLessons: roadmap.totals.lessons,
      complete: roadmap.totals.outlineLessons === 0,
    },
  });
});

/** Every course with a one-line roadmap summary, for the catalogue cards. */
router.get('/roadmaps', (_req, res) => {
  const courses = all('SELECT * FROM courses WHERE is_published = 1 ORDER BY sort_order');
  ok(res, {
    roadmaps: courses.map((c) => {
      const r = readRoadmap(c.id);
      return {
        slug: c.slug,
        title: c.title,
        tagline: c.tagline,
        stages: r ? r.stages.map((s) => ({ key: s.key, title: s.title, lessonCount: s.lessonCount })) : [],
        totals: r ? r.totals : { stages: 0, modules: 0, lessons: 0, minutes: 0, outlineLessons: 0 },
      };
    }),
  });
});

export default router;
