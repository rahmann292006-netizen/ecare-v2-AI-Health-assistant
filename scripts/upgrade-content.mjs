/**
 * Upgrade runner — writes the next-generation lesson content into the database.
 *
 * Preserves ids: lesson_progress, bookmarks, notes, enrolments and checkpoint
 * submissions all reference lesson ids, and an upgrade only changes the text,
 * title, objectives and code of a lesson. The retrieval corpus (ai_chunks) for the
 * upgraded lessons is rebuilt so the AI tutor cites the new material.
 *
 * Usage:  node scripts/upgrade-content.mjs [--dry-run] [course-slug ...]
 */
import { applyLessonUpgrade } from '../server/lib/content-upgrade.js';
import { seedLessonQuiz } from '../server/routes/lesson-quiz.js';
import { pythonLessons } from '../server/content/nextgen/python.js';
import { pythonLessons2 } from '../server/content/nextgen/python2.js';
import { pythonLessons3 } from '../server/content/nextgen/python3.js';
import { dsaLessons1 } from '../server/content/nextgen/dsa1.js';
import { dsaLessons2 } from '../server/content/nextgen/dsa2.js';
import { genaiLessons } from '../server/content/nextgen/genai1.js';
import { genaiLessons2 } from '../server/content/nextgen/genai2.js';
import { quizBank } from '../server/content/nextgen/quizzes.js';

const COURSES = {
  'python-programming': [...pythonLessons, ...pythonLessons2, ...pythonLessons3],
  'data-structures-algorithms': [...dsaLessons1, ...dsaLessons2],
  'generative-ai': [...genaiLessons, ...genaiLessons2],
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wanted = args.filter((a) => !a.startsWith('--'));
const targets = wanted.length ? wanted : Object.keys(COURSES);

let lessons = 0;
let quizzes = 0;
let questions = 0;

for (const slug of targets) {
  const list = COURSES[slug];
  if (!list) {
    console.log(`- ${slug}: no upgraded content yet, skipped`);
    continue;
  }
  for (const lesson of list) {
    if (dryRun) {
      console.log(`would upgrade ${slug}/${lesson.module}/${lesson.slug} → "${lesson.title}" (${lesson.body.length} chars)`);
      continue;
    }
    const res = applyLessonUpgrade(slug, lesson.module, lesson.slug, lesson);
    lessons += 1;
    const quiz = quizBank[`${slug}/${lesson.module}/${lesson.slug}`];
    if (quiz) {
      seedLessonQuiz({ courseSlug: slug, moduleSlug: lesson.module, lessonSlug: lesson.slug, questions: quiz });
      quizzes += 1;
      questions += quiz.length;
    }
    console.log(`✓ ${slug}/${lesson.slug} · ${res.chunks} chunks · ${quiz ? `${quiz.length} quiz questions` : 'no quiz'}`);
  }
}

if (!dryRun) console.log(`\nupgraded ${lessons} lesson(s), ${quizzes} knowledge check(s), ${questions} question(s)`);
