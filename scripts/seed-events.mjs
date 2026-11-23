/**
 * Seed the competition/quiz events.
 * Every code challenge is first run against its reference solution; if any challenge
 * cannot be solved, nothing is written.
 */
import { verifyEvents, seedEvents, eventCounts } from '../server/content/events.js';
import { all } from '../server/db/index.js';
import { computeResults } from '../server/lib/competitions.js';

const problems = await verifyEvents();
if (problems.length) {
  console.log('REFUSED — these challenges do not work:');
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log('verified: every code challenge passes its own tests');

const result = await seedEvents();
console.log('seed:', JSON.stringify(result));

// a published example must have standings computed from real submissions
const closed = all("SELECT id, slug FROM competitions WHERE status = 'published'");
for (const c of closed) console.log('results recomputed for', c.slug, JSON.stringify(computeResults(c.id)));

console.log('counts:', JSON.stringify(eventCounts()));
