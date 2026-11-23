import { all, get, run } from '../db/index.js';
import { indexTerms } from '../lib/ai-rag.js';

/**
 * Re-index the retrieval corpus after lesson bodies change.
 *
 * Content is upgraded in place: a lesson keeps its id, so `lesson_progress`,
 * bookmarks, notes, enrolments and checkpoint submissions all survive. Only the
 * derived retrieval rows (`ai_chunks`) are rebuilt for the lessons that changed.
 */

/** Split a lesson body on `## ` headings and keep each heading with its passage. */
export function chunkLesson(body, heading) {
  const parts = String(body).split(/\n(?=##\s)/);
  const out = [];
  for (const part of parts) {
    const title = (part.match(/^#{1,3}\s+(.+)/) || [, heading])[1];
    let text = part.trim();
    if (!text) continue;
    while (text.length > 900) {
      out.push({ heading: title, content: text.slice(0, 800) });
      text = text.slice(700);
    }
    if (text.trim()) out.push({ heading: title, content: text.trim() });
  }
  return out;
}

export function reindexLesson(lessonId) {
  const lesson = get(
    `SELECT l.*, m.course_id AS course_id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE l.id = ?`,
    [lessonId],
  );
  if (!lesson) return 0;
  run('DELETE FROM ai_chunks WHERE lesson_id = ?', [lessonId]);
  const chunks = chunkLesson(`${lesson.title}\n\n${lesson.body_md}`, lesson.title);
  chunks.forEach((ch, ord) => {
    run(
      'INSERT INTO ai_chunks (lesson_id, course_id, ord, heading, content, terms) VALUES (?,?,?,?,?,?)',
      [lesson.id, lesson.course_id, ord, ch.heading, ch.content, indexTerms(`${ch.heading} ${ch.content}`)],
    );
  });
  return chunks.length;
}

/**
 * Write a next-generation lesson into the database in place.
 *
 * `lesson` must keep `slug` stable (lesson_progress and bookmarks reference the id,
 * but links and the tutor context resolve by slug) and may carry:
 *   title, durationMinutes, kind, level, objectives[], body (markdown), code[{language,caption,source}]
 */
export function applyLessonUpgrade(courseSlug, moduleSlug, lessonSlug, lesson) {
  const row = get(
    `SELECT l.id, m.id AS module_id FROM lessons l
       JOIN course_modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id
      WHERE c.slug = ? AND m.slug = ? AND l.slug = ?`,
    [courseSlug, moduleSlug, lessonSlug],
  );
  if (!row) throw new Error(`No lesson ${courseSlug}/${moduleSlug}/${lessonSlug} to upgrade.`);

  run(
    `UPDATE lessons SET title = ?, kind = ?, duration_minutes = ?, objectives_json = ?, body_md = ?, code_json = ?
      WHERE id = ?`,
    [
      lesson.title,
      lesson.kind || 'reading',
      lesson.durationMinutes || 20,
      JSON.stringify(lesson.objectives || []),
      lesson.body,
      JSON.stringify(lesson.code || []),
      row.id,
    ],
  );
  const chunks = reindexLesson(row.id);
  return { lessonId: row.id, chunks };
}

/** Every lesson of one course, with the module it lives in — used for coverage checks. */
export function courseLessons(courseSlug) {
  return all(
    `SELECT l.id, l.slug, l.title, l.body_md, m.slug AS module_slug, m.title AS module_title
       FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
      WHERE c.slug = ? ORDER BY m.sort_order, l.sort_order`,
    [courseSlug],
  );
}

