/**
 * Retrieval over the course corpus (ai_chunks), plus grounded prompting.
 *
 * Retrieval is BM25 over a term index built from ai_chunks.terms — no external
 * vector database, no embeddings API required, and it works offline. It is a
 * lexical retriever: strong on "what does the course say about X", weaker on
 * paraphrase. When an embedding provider is configured later, swap `retrieve()`.
 */

import { all, get, run, nowIso } from '../db/index.js';
import { chat, chatStream, aiStatus } from './ai-provider.js';

const STOP = new Set(('the a an and or of to in is are be for with on that this it as at by from not you your we our can will if when what which how do does done use used using about please tell explain '
  + 'i my me we they them he she his her its there here then than so such into out up down over under again more most some any all both each few other own same very just also only own too s t don now').split(' '));

/** Tiny suffix stemmer: enough to match "values/value", "indexes/index", "modifying/modify". */
function stem(w) {
  if (w.length <= 4) return w;
  for (const [suffix, repl] of [['ies', 'y'], ['sses', 'ss'], ['es', ''], ['s', ''], ['ing', ''], ['ed', ''], ['ly', '']]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      let base = w.slice(0, w.length - suffix.length);
      // "overfitting" → "overfitt" → "overfit"; "running" → "runn" → "run"
      if (base.length > 3 && base[base.length - 1] === base[base.length - 2]) base = base.slice(0, -1);
      return base + repl;
    }
  }
  return w;
}

export function terms(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);
}

let cache = null;
let cacheStamp = 0;

function loadIndex() {
  const stamp = get('SELECT COUNT(*) AS n FROM ai_chunks').n;
  if (cache && stamp === cacheStamp) return cache;

  const rows = all(
    `SELECT ch.id, ch.lesson_id, ch.course_id, ch.heading, ch.content, ch.terms,
            l.title AS lesson_title, l.slug AS lesson_slug, c.slug AS course_slug, c.title AS course_title,
            m.title AS module_title
       FROM ai_chunks ch
       JOIN lessons l ON l.id = ch.lesson_id
       JOIN course_modules m ON m.id = l.module_id
       JOIN courses c ON c.id = ch.course_id`,
  );
  const postings = new Map();
  const docs = new Map();
  let totalLen = 0;

  for (const row of rows) {
    const toks = row.terms.split(' ').filter(Boolean);
    docs.set(row.id, { ...row, len: toks.length || 1 });
    totalLen += toks.length || 1;
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [t, n] of tf) {
      if (!postings.has(t)) postings.set(t, []);
      postings.get(t).push([row.id, n]);
    }
  }
  cache = { rows, postings, docs, avgLen: rows.length ? totalLen / rows.length : 1, n: rows.length };
  cacheStamp = stamp;
  return cache;
}

/**
 * BM25 retrieval. Returns the top-k chunks with a relevance score.
 * @param {string} query
 * @param {{k?:number, courseId?:number, lessonId?:number}} opts
 *   `lessonId` ranks that lesson's passages first but never excludes the rest, so a
 *   question asked from inside a lesson can still be answered from later material.
 */
export function retrieve(query, { k = 6, courseId = null, lessonId = null } = {}) {
  const idx = loadIndex();
  if (!idx.rows.length) return [];
  const qTokens = [...new Set(terms(query))];
  if (!qTokens.length) return [];

  const k1 = 1.4;
  const b = 0.72;
  const scores = new Map();

  for (const token of qTokens) {
    const posting = idx.postings.get(token);
    if (!posting) continue;
    const idf = Math.log(1 + (idx.n - posting.length + 0.5) / (posting.length + 0.5));
    for (const [docId, tf] of posting) {
      const doc = idx.docs.get(docId);
      if (courseId && doc.course_id !== courseId) continue;
      const denom = tf + k1 * (1 - b + b * (doc.len / idx.avgLen));
      scores.set(docId, (scores.get(docId) || 0) + idf * ((tf * (k1 + 1)) / denom));
    }
  }

  // A small bonus for passages from the lesson the student is reading: it keeps the
  // answer anchored where they are without hiding better matches elsewhere.
  const ranked = [...scores.entries()].map(([docId, score]) => {
    const doc = idx.docs.get(docId);
    const boost = lessonId && doc.lesson_id === lessonId ? score * 0.35 : 0;
    return [docId, score + boost];
  });

  return ranked
    .sort((a, b2) => b2[1] - a[1])
    .slice(0, k)
    .map(([docId, score]) => {
      const d = idx.docs.get(docId);
      return {
        chunkId: d.id,
        score: Number(score.toFixed(3)),
        lessonId: d.lesson_id,
        lessonTitle: d.lesson_title,
        lessonSlug: d.lesson_slug,
        courseId: d.course_id,
        courseSlug: d.course_slug,
        courseTitle: d.course_title,
        moduleTitle: d.module_title,
        heading: d.heading,
        content: d.content,
      };
    });
}

export function buildContext(chunks) {
  if (!chunks.length) return '';
  return chunks
    .map((c, i) => `[${i + 1}] ${c.courseTitle} › ${c.moduleTitle} › ${c.lessonTitle} — ${c.heading}\n${c.content}`)
    .join('\n\n');
}

const BASE_SYSTEM = `You are Lumen's study assistant, embedded in a technology learning platform.

Rules you must follow:
- Answer from the numbered course passages provided. If they do not contain the answer, say so plainly and answer from general knowledge, labelling that part "Beyond the course material".
- Cite the passages you use with bracketed numbers, e.g. [1]. Never cite a passage that does not support the sentence.
- Be concise and concrete. Prefer short paragraphs and code where code helps.
- Teach: explain the reasoning, not only the answer. Never invent APIs, function names, or file paths.
- Never claim to have run code or seen the user's screen. You cannot execute anything.
- If the question is about the user's own private data, say you cannot see it.
- If the question is unsafe or asks you to bypass security controls, decline briefly and explain why.
- Write in the language of the question.`;

/**
 * What the tutor knows about the student and where they are. Built from stored rows
 * (enrolments, lesson progress, checkpoint results) — never invented.
 */
export function learnerContext({ course, module, lesson, progress, passedTopics = [] } = {}) {
  const lines = [];
  if (course) lines.push(`Course: ${course.title}${course.level ? ` (${course.level})` : ''}`);
  if (module) lines.push(`Module: ${module.title}`);
  if (lesson) lines.push(`Lesson the student has open: ${lesson.title}${lesson.kind ? ` [${lesson.kind}]` : ''}`);
  if (progress) {
    lines.push(`Progress in this course: ${progress.completed} of ${progress.total} lessons complete (${progress.percent}%).`);
    if (progress.currentStreak) lines.push(`Current study streak: ${progress.currentStreak} day(s).`);
  }
  if (passedTopics.length) lines.push(`Checkpoints passed: ${passedTopics.join('; ')}.`);
  if (!lines.length) return '';
  return `--- STUDENT CONTEXT ---\n${lines.join('\n')}\n--- END STUDENT CONTEXT ---`;
}

/**
 * @param {object[]} chunks retrieved passages
 * @param {string} [context] learner context block from learnerContext()
 * @param {{mode?:'explain'|'hint'|'example'|'debug'}} [opts]
 */
export function groundedSystem(chunks, context = '', opts = {}) {
  const modeAddendum = {
    hint: 'The student asked for a hint, not the answer. Give the next small step, name the concept to check, and stop. Do not write the finished solution.',
    debug: 'The student is debugging. Ask for or use the code and error they provided. Explain what the error means, then the smallest change that fixes it. Do not rewrite their whole program.',
    example: 'The student asked for a practical example. Give a short, realistic example with expected output, then one sentence on why it matters.',
    explain: 'The student asked for a beginner-friendly explanation. Use plain words first, then the technical term in brackets.',
  }[opts.mode];
  const parts = [BASE_SYSTEM];
  if (modeAddendum) parts.push(`Mode for this answer: ${modeAddendum}`);
  if (context) parts.push(context);
  if (chunks.length) parts.push(`--- COURSE PASSAGES ---\n${buildContext(chunks)}\n--- END PASSAGES ---`);
  return parts.join('\n\n');
}

/** Terms string stored in ai_chunks.terms at seed time. */
export function indexTerms(text) {
  return [...new Set(terms(text))].join(' ');
}

/** Persist a message pair. Returns the created message ids. */
export function saveExchange(conversationId, userContent, assistantContent, citations) {
  const u = run('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?,?,?)', [conversationId, 'user', userContent]);
  const a = run('INSERT INTO ai_messages (conversation_id, role, content, citations_json) VALUES (?,?,?,?)',
    [conversationId, 'assistant', assistantContent, JSON.stringify(citations || [])]);
  run('UPDATE ai_conversations SET updated_at = ? WHERE id = ?', [nowIso(), conversationId]);
  return { userId: u.lastInsertRowid, assistantId: a.lastInsertRowid };
}

export { aiStatus, chat, chatStream };
