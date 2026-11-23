/**
 * Content-upgrade verification.
 *
 * Checks, for every upgraded lesson: the lesson payload carries the new body and
 * its knowledge check, the check is graded server-side, answers are not leaked
 * before submission, and a wrong answer is explained.
 *
 * Usage: node test-content.mjs [baseUrl]
 */
import Database from 'better-sqlite3';

const BASE = process.argv[2] || 'http://localhost:4180';
const db = new Database('server/data/lumen.db', { readonly: true });

const email = db
  .prepare("SELECT email FROM users WHERE email LIKE 'assess%@example.com' ORDER BY id DESC LIMIT 1")
  .get()?.email;
if (!email) throw new Error('no test user found');
const PASSWORD = 'Correct-horse-battery9';

let cookie = '';
let csrf = '';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

async function call(path, { method = 'GET', body } = {}) {
  const jar = [cookie, csrf ? `lumen_csrf=${csrf}` : ''].filter(Boolean).join('; ');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(jar ? { cookie: jar } : {}),
      ...(csrf && method !== 'GET' ? { 'x-csrf-token': csrf } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) {
    const [pair] = c.split(';');
    if (pair.startsWith('lumen_csrf=')) csrf = pair.split('=')[1];
    if (pair.startsWith('lumen_session=') && !pair.startsWith('lumen_session=;')) cookie = pair;
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

// Prime the CSRF cookie exactly as a browser does: one GET, before any POST.
await call('/api/catalogue/status');
const login = await call('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
check('login', login.status === 200, `status ${login.status}`);

const expected = [
  // Python Programming
  ['python-programming', 'how-python-runs', 'What Actually Happens When You Press Run'],
  ['python-programming', 'types-and-operators', 'Why 0.1 + 0.2 Refuses to Be 0.3'],
  ['python-programming', 'control-flow', 'Make the Program Decide, Not You'],
  ['python-programming', 'collections-deep-dive', 'Choose the Container That Fits the Question'],
  ['python-programming', 'functions-and-scope', 'Functions That Are Hard to Misuse'],
  ['python-programming', 'classes-and-dataclasses', 'When a Dict Stops Being Enough'],
  ['python-programming', 'exceptions', 'Fail Loudly, Recover Deliberately'],
  ['python-programming', 'venv-and-packages', 'Make "It Works on My Machine" Impossible'],
  ['python-programming', 'testing-and-project', 'Ship Something Someone Else Could Maintain'],
  // Data Structures & Algorithms
  ['data-structures-algorithms', 'big-o', 'Your Program Is Slow at 10,000 Rows. Here Is Why.'],
  ['data-structures-algorithms', 'arrays-strings', 'The Two-Pointer Trick That Kills Nested Loops'],
  ['data-structures-algorithms', 'linked-lists', 'Why "Just Remove It" Takes 40 Minutes in Some Systems'],
  ['data-structures-algorithms', 'stacks-queues', 'The Undo Button, the Bracket Checker and the Call Stack'],
  ['data-structures-algorithms', 'tree-traversal', 'One Object Tree, Three Very Different Answers'],
  ['data-structures-algorithms', 'graphs', 'From "Six Degrees" to a Map-Routing Engine'],
  ['data-structures-algorithms', 'dynamic-programming', 'The Same Subproblem, 40 Million Times'],
  ['data-structures-algorithms', 'sorting-searching', 'When "Not Found" Is Not the Answer You Need'],
  // Generative AI
  ['generative-ai', 'tokens-and-embeddings', 'Why Your Model Charged You for "the" 47 Times'],
  ['generative-ai', 'attention', 'How a Model Decided Which Word Matters'],
  ['generative-ai', 'prompt-structure', 'The Prompt That Stopped Being Broken When It Got Structure'],
  ['generative-ai', 'evaluation', 'The Feature That Felt Perfect and Scored 61%'],
  ['generative-ai', 'rag-pipeline', 'The Assistant That Cited a Document It Never Read'],
  ['generative-ai', 'safety-and-cost', 'The Injection That Turned a Summary into an Action'],
  ['generative-ai', 'genai-capstone', 'Ship a Study Assistant That Can Prove Its Answers'],
];

const SECTIONS = [
  '## The situation',
  '## What you can do afterwards',
  '## The idea, in plain words',
  '## The terms, precisely',
  '## Walk through it',
  '## Where this shows up',
  '## Mistakes worth avoiding',
  '## Practise now',
  '## Check yourself',
  '## Challenge',
  '## In one paragraph',
  '## Go further',
];

let allLessonsOk = true;
for (const [courseSlug, lessonSlug, title] of expected) {
  const r = await call(`/api/learning/lessons/${courseSlug}/${lessonSlug}`);
  if (r.status !== 200) {
    check(`${lessonSlug} loads`, false, `status ${r.status}`);
    allLessonsOk = false;
    continue;
  }
  const { lesson, quiz } = r.data;
  const missing = SECTIONS.filter((s) => !lesson.body.includes(s));
  const ok = lesson.title === title && missing.length === 0 && lesson.body.length > 4000 && Boolean(quiz?.assessmentId);
  check(
    `${lessonSlug} upgraded`,
    ok,
    `${lesson.body.length} chars · ${missing.length ? 'missing ' + missing.join(', ') : 'all 12 sections'} · quiz ${quiz ? 'yes' : 'no'}`,
  );
  if (!ok) allLessonsOk = false;
}

if (allLessonsOk) check('all upgraded lessons have 12 sections + a knowledge check', true);

// Grading and answer secrecy on the newest lesson's check.
const target = await call('/api/learning/lessons/python-programming/testing-and-project');
const assessmentId = target.data.quiz.assessmentId;
const quizGet = await call(`/api/lessons/${target.data.lessonId}/quiz`);
check('quiz GET', quizGet.status === 200, `${quizGet.data?.questions?.length} questions`);
const leaked = JSON.stringify(quizGet.data).includes('isCorrect') || JSON.stringify(quizGet.data).includes('is_correct');
check('quiz does not leak answers before submit', !leaked);

const qs = quizGet.data.questions;
const wrong = await call(`/api/lessons/${target.data.lessonId}/quiz`, {
  method: 'POST',
  body: { answers: qs.map((q) => ({ questionId: q.id, optionId: q.options[q.options.length - 1].id })) },
});
check('quiz submit', wrong.status === 201, `${wrong.data?.score}/${wrong.data?.maxScore}`);
check('explanations returned', Array.isArray(wrong.data?.review) && wrong.data.review.every((x) => x.explanation));

// Course page must not list lesson checks as course assessments.
const course = await call('/api/learning/courses/python-programming');
const kinds = course.data?.assessments?.map((a) => a.title) || [];
check('course assessments exclude lesson checks', !kinds.some((t) => t.startsWith('Lesson check:')), kinds.join(' | '));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
