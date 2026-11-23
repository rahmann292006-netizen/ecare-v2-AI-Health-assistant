/**
 * Content QA extractor.
 *
 * Reads the next-generation lesson files and reports, per course, what is complete
 * and what is missing against the twelve-section standard plus its knowledge check.
 * Exits non-zero if anything is incomplete, so it can gate a release.
 *
 * Usage: node scripts/qa-extract.mjs [course-slug ...]
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { isComplete } from '../server/content/nextgen/sections.js';

const DIR = path.join(process.cwd(), 'server/content/nextgen');
const wanted = process.argv.slice(2);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js') && !['sections.js', 'quizzes.js'].includes(f));
const lessons = [];
const quizzes = {};

for (const file of files) {
  const mod = await import(pathToFileURL(path.join(DIR, file)).href);
  for (const [name, value] of Object.entries(mod)) {
    if (Array.isArray(value) && value.every((v) => v && typeof v === 'object' && 'slug' in v && 'body' in v)) {
      // One array per file is the convention; named exports such as `pythonLessons2`
      // re-export the same objects, so dedupe by course/module/slug.
      for (const lesson of value) {
        const course = lesson.course || 'python-programming';
        const key = `${course}/${lesson.module}/${lesson.slug}`;
        if (!lessons.some((l) => `${l.course || 'python-programming'}/${l.module}/${l.slug}` === key)) {
          lessons.push({ ...lesson, course, file });
        }
      }
    }
  }
}
const quizMod = await import(pathToFileURL(path.join(DIR, 'quizzes.js')).href);
Object.assign(quizzes, quizMod.quizBank);

const byCourse = {};
for (const lesson of lessons) {
  const course = lesson.course || 'python-programming';
  if (wanted.length && !wanted.includes(course)) continue;
  byCourse[course] ||= [];
  const key = `${course}/${lesson.module}/${lesson.slug}`;
  byCourse[course].push({
    key,
    title: lesson.title,
    chars: lesson.body.length,
    complete: isComplete(lesson.body),
    quiz: Boolean(quizzes[key]),
    code: (lesson.code || []).length,
  });
}

let bad = 0;
for (const [course, list] of Object.entries(byCourse)) {
  const done = list.filter((l) => l.complete && l.quiz).length;
  console.log(`\n${course}: ${done}/${list.length} finished`);
  for (const l of list) {
    const ok = l.complete && l.quiz;
    if (!ok) bad += 1;
    console.log(`  ${ok ? '✓' : '✗'} ${l.key} · ${l.chars} chars · ${l.code} code block(s)${l.quiz ? '' : ' · NO QUIZ'}${l.complete ? '' : ' · incomplete sections'}`);
  }
}
console.log(`\n${lessons.length} next-generation lesson(s) on disk, ${bad} incomplete`);
if (bad) process.exitCode = 1;
