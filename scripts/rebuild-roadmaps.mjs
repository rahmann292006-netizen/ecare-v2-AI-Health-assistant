/**
 * Rebuild every course roadmap from server/content/curriculum.js.
 * Structure only: lessons, progress and enrollments are untouched.
 */
import { all, get } from '../server/db/index.js';
import { buildRoadmap } from '../server/lib/roadmap.js';
import { COURSES } from '../server/content/curriculum.js';

let ok = 0;
for (const course of COURSES) {
  const row = get('SELECT id FROM courses WHERE slug = ?', [course.slug]);
  if (!row) {
    console.log(`skip ${course.slug} (not in database)`);
    continue;
  }
  buildRoadmap(row.id, course);
  ok += 1;
}
const stages = get('SELECT COUNT(*) AS n FROM roadmap_stages').n;
const links = get('SELECT COUNT(*) AS n FROM roadmap_modules').n;
const missingGoal = get("SELECT COUNT(*) AS n FROM roadmap_stages WHERE goal = ''").n;
console.log(`roadmaps rebuilt: ${ok} · stages ${stages} · module links ${links} · stages without a goal: ${missingGoal}`);
void all;
