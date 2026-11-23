/**
 * Seed the competency framework for every course from its curriculum definition.
 *
 * A competency is seeded with the evidence that can demonstrate it. Where that
 * evidence does not exist yet (no final assessment, no challenge system), the
 * competency is still listed so the dashboard can show it as not demonstrated —
 * it is never given a fake score.
 */
import { get, all, run } from '../server/db/index.js';
import { COURSES } from '../server/content/curriculum.js';

function competenciesFor(course) {
  const out = [];
  // one competency per module: the thing the module teaches you to DO
  for (const m of course.modules || []) {
    // the project module IS the capstone: it is seeded below as `capstone`
    if (m.slug === 'project') continue;
    out.push({
      key: `m-${m.slug}`,
      title: m.title,
      description: m.summary || `Working knowledge of ${m.title}.`,
      role: 'core',
      weight: 'core',
      evidenceRef: null,
    });
  }
  // a capstone competency per course
  if (course.capstone) {
    out.push({
      key: 'capstone',
      title: 'Capstone delivery',
      description: course.capstone,
      role: 'capstone',
      weight: 'core',
      evidenceRef: null,
    });
  }
  return out;
}

let total = 0;
for (const course of COURSES) {
  const row = get('SELECT id FROM courses WHERE slug = ?', [course.slug]);
  if (!row) continue;
  const list = competenciesFor(course);
  list.forEach((c, i) => {
    run(
      `INSERT INTO competencies (course_id, key, title, description, role, weight, evidence_ref, sort_order)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(course_id, key) DO UPDATE SET
         title = excluded.title, description = excluded.description,
         role = excluded.role, weight = excluded.weight, sort_order = excluded.sort_order`,
      [row.id, c.key, c.title, c.description, c.role, c.weight, c.evidenceRef, i],
    );
    total += 1;
  });
  // the capstone competency is the project: it appears as a competency only when the
  // course has no project module, and then it is evidenced by that course's project
  const capstone = get('SELECT id FROM projects WHERE course_id = ? ORDER BY est_hours DESC LIMIT 1', [row.id]);
  if (capstone) {
    run("UPDATE competencies SET evidence_ref = ? WHERE course_id = ? AND key = 'capstone'", [`project:${capstone.id}`, row.id]);
  }
  // link each module competency to its module assessment when one exists
  for (const m of course.modules || []) {
    const mod = get('SELECT id FROM course_modules WHERE course_id = ? AND slug = ?', [row.id, m.slug]);
    if (!mod) continue;
    const a = get("SELECT id FROM assessments WHERE module_id = ? AND kind = 'module' LIMIT 1", [mod.id]);
    if (!a) continue;
    run("UPDATE competencies SET evidence_ref = ? WHERE course_id = ? AND key = ?", [`assessment:${a.id}`, row.id, `m-${m.slug}`]);
  }
}
console.log(`competencies seeded: ${total}`);
console.log('by course:', all('SELECT c.slug, COUNT(k.id) AS n FROM courses c LEFT JOIN competencies k ON k.course_id = c.id GROUP BY c.id ORDER BY c.sort_order').map((r) => `${r.slug}:${r.n}`).join(' '));
