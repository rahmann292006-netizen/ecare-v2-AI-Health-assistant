/**
 * Apply a curriculum definition to the database — structure only, never content.
 *
 * What it does, in one transaction:
 *   1. creates any module in `curriculum.js` that does not exist yet (by slug)
 *   2. creates placeholder rows for planned lessons that do not exist yet
 *   3. moves an existing lesson to another module when the curriculum says it belongs
 *      there (an UPDATE of `module_id`, so the lesson keeps its id and every
 *      progress row, note and bookmark that references it)
 *   4. writes stage and roadmap metadata for the course
 *
 * What it deliberately does NOT do: overwrite the body of a lesson that already
 * has real content. Placeholders are marked `kind = 'outline'` and carry a body
 * that says so, so nothing pretends to teach what has not been written.
 *
 * Usage:
 *   node scripts/apply-curriculum.mjs --dry-run
 *   node scripts/apply-curriculum.mjs                 # all courses
 *   node scripts/apply-curriculum.mjs full-stack-development
 */
import { COURSES } from '../server/content/curriculum.js';
import { db, all, get, run, tx } from '../server/db/index.js';
import { buildRoadmap } from '../server/lib/roadmap.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wanted = args.filter((a) => !a.startsWith('--'));
const targets = wanted.length ? COURSES.filter((c) => wanted.includes(c.slug)) : COURSES;

const report = [];

function placeholderBody(title, courseTitle, moduleTitle) {
  return [
    `## This lesson is planned`,
    '',
    `**${title}** belongs to *${moduleTitle}* in the ${courseTitle} course. The module`,
    'structure, its place in the roadmap and its assessment are already live, but this',
    'lesson has not been written yet — so it does not pretend to teach anything.',
    '',
    '### What will be here',
    '',
    'The same twelve sections every other lesson in Lumen uses: the situation, outcomes,',
    'the idea in plain words, precise terms, a walkthrough with runnable code and its',
    'output, where it shows up, mistakes worth avoiding, practice, a self-check, a',
    'challenge, a summary and further reading — plus a knowledge check.',
    '',
    '### What you can do meanwhile',
    '',
    '- Read the lessons in this module that are already written; they are complete.',
    '- Ask the AI tutor about this topic: it answers from the course material it has.',
    '- Track the module assessment — it covers only what has been written.',
  ].join('\n');
}

for (const course of targets) {
  const row = get('SELECT id, title FROM courses WHERE slug = ?', [course.slug]);
  if (!row) {
    console.log(`! course ${course.slug} not in database, skipped`);
    continue;
  }

  const created = { modules: 0, lessons: 0, moved: 0 };
  const warnings = [];

  const work = () => {
    course.modules.forEach((m, mi) => {
      let mod = get('SELECT * FROM course_modules WHERE course_id = ? AND slug = ?', [row.id, m.slug]);
      if (!mod) {
        if (!dryRun) {
          run(
            'INSERT INTO course_modules (course_id, slug, title, summary, level, sort_order) VALUES (?,?,?,?,?,?)',
            [row.id, m.slug, m.title, m.summary, m.level, mi],
          );
          mod = get('SELECT * FROM course_modules WHERE course_id = ? AND slug = ?', [row.id, m.slug]);
        }
        created.modules += 1;
      }

      // 1. move lessons the curriculum relocated into this module
      for (const slug of m.planned) {
        const existing = get(
          `SELECT l.id, l.module_id, m.course_id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE l.slug = ?`,
          [slug],
        );
        if (existing && mod && existing.module_id !== mod.id && existing.course_id === row.id) {
          // only move within the same course, and only if the target has no such slug
          const clash = get('SELECT id FROM lessons WHERE module_id = ? AND slug = ?', [mod.id, slug]);
          if (clash) {
            warnings.push(`slug ${slug} already exists in ${m.slug}, left where it was`);
          } else {
            if (!dryRun) run('UPDATE lessons SET module_id = ? WHERE id = ?', [mod.id, existing.id]);
            created.moved += 1;
          }
        }
      }

      // 2. create placeholders for planned lessons that exist nowhere
      m.planned.forEach((slug, li) => {
        const existing = get('SELECT id FROM lessons WHERE module_id = ? AND slug = ?', [mod ? mod.id : -1, slug]);
        if (existing) return;
        const elsewhere = get(
          `SELECT l.id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND l.slug = ?`,
          [row.id, slug],
        );
        if (elsewhere) return; // handled by the move step above
        created.lessons += 1;
        if (dryRun) return;
        run(
          `INSERT INTO lessons (module_id, slug, title, kind, duration_minutes, sort_order, objectives_json, body_md, code_json)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            mod.id,
            slug,
            titleFromSlug(slug),
            'outline',
            25,
            li,
            '[]',
            placeholderBody(titleFromSlug(slug), row.title, m.title),
            '[]',
          ],
        );
      });
    });

    // 3. roadmap + stages
    if (!dryRun) buildRoadmap(row.id, course);
  };

  if (dryRun) work();
  else tx(work);

  report.push({ course: course.slug, ...created, warnings: warnings.length });
  console.log(
    `${dryRun ? 'would apply' : 'applied'} ${course.slug}: +${created.modules} modules, +${created.lessons} outline lessons, ${created.moved} lessons moved` +
      (warnings.length ? `, ${warnings.length} warning(s): ${warnings.join('; ')}` : ''),
  );
}

if (!dryRun) {
  const fk = db.pragma('foreign_key_check');
  console.log(`\nforeign_key_check: ${fk.length} problem(s)`);
  const counts = {
    courses: get('SELECT COUNT(*) AS n FROM courses').n,
    modules: get('SELECT COUNT(*) AS n FROM course_modules').n,
    lessons: get('SELECT COUNT(*) AS n FROM lessons').n,
    outline: get("SELECT COUNT(*) AS n FROM lessons WHERE kind = 'outline'").n,
    written: get("SELECT COUNT(*) AS n FROM lessons WHERE kind != 'outline'").n,
  };
  console.log(JSON.stringify(counts));
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
