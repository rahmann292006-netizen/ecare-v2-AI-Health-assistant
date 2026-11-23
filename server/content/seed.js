import { db, run, get, all, nowIso, tx } from '../db/index.js';
import { COURSES } from './courses-part1.js';
import { COURSES_2 } from './courses-part2.js';
import { COURSES_3 } from './courses-part3.js';
import { COURSES_4 } from './courses-part4.js';
import { APTITUDE_TOPICS, APTITUDE_QUESTIONS } from './aptitude.js';
import { MOTIVATIONS, ACHIEVEMENTS, COMMUNITY_GROUPS, SAMPLE_POSTS } from './community.js';
import { hashPassword } from '../lib/password.js';
import { indexTerms } from '../lib/ai-rag.js';

const ALL_COURSES = [...COURSES, ...COURSES_2, ...COURSES_3, ...COURSES_4];

function chunkLesson(body, heading) {
  // split on markdown headings, keep heading text as context
  const parts = body.split(/\n(?=##\s)/);
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

const normaliseTerms = indexTerms;

export function seedContent({ verbose = false } = {}) {
  const log = verbose ? console.log : () => {};
  const stats = { courses: 0, modules: 0, lessons: 0, exercises: 0, questions: 0, aptitude: 0, chunks: 0 };

  tx(() => {
    // ── motivation lines ──
    for (const text of MOTIVATIONS) {
      run('INSERT OR IGNORE INTO motivation_lines (text) VALUES (?)', [text]);
    }

    // ── achievements ──
    for (const a of ACHIEVEMENTS) {
      run('INSERT OR IGNORE INTO achievements (slug, title, description, icon, criteria_json) VALUES (?,?,?,?,?)',
        [a.slug, a.title, a.description, a.icon, JSON.stringify(a.criteria)]);
    }

    // ── community groups ──
    for (const g of COMMUNITY_GROUPS) {
      run('INSERT OR IGNORE INTO community_groups (slug, name, description, category, icon) VALUES (?,?,?,?,?)',
        [g.slug, g.name, g.description, g.category, g.icon]);
    }

    // ── courses ──
    ALL_COURSES.forEach((c, ci) => {
      let course = get('SELECT * FROM courses WHERE slug = ?', [c.slug]);
      if (!course) {
        run(`INSERT INTO courses (slug, title, tagline, description, level, duration_hours, category, icon, sort_order, outcomes_json, prereqs_json)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [c.slug, c.title, c.tagline, c.description, c.level, c.durationHours, c.category, c.icon, ci,
            JSON.stringify(c.outcomes), JSON.stringify(c.prereqs)]);
        course = get('SELECT * FROM courses WHERE slug = ?', [c.slug]);
        stats.courses++;
      }

      c.modules.forEach((m, mi) => {
        let mod = get('SELECT * FROM course_modules WHERE course_id = ? AND slug = ?', [course.id, m.slug]);
        if (!mod) {
          run('INSERT INTO course_modules (course_id, slug, title, summary, level, sort_order) VALUES (?,?,?,?,?,?)',
            [course.id, m.slug, m.title, m.summary, m.level, mi]);
          mod = get('SELECT * FROM course_modules WHERE course_id = ? AND slug = ?', [course.id, m.slug]);
          stats.modules++;
        }

        m.lessons.forEach((l, li) => {
          let lesson = get('SELECT * FROM lessons WHERE module_id = ? AND slug = ?', [mod.id, l.slug]);
          if (!lesson) {
            run(`INSERT INTO lessons (module_id, slug, title, kind, duration_minutes, sort_order, objectives_json, body_md, code_json)
                 VALUES (?,?,?,?,?,?,?,?,?)`,
              [mod.id, l.slug, l.title, l.kind || 'reading', l.minutes || 20, li,
                JSON.stringify(l.objectives || []), l.body, JSON.stringify(l.code || [])]);
            lesson = get('SELECT * FROM lessons WHERE module_id = ? AND slug = ?', [mod.id, l.slug]);
            stats.lessons++;
          }
          // resources: replace (content, not user data)
          const existingRes = all('SELECT id FROM learning_resources WHERE lesson_id = ?', [lesson.id]);
          if (existingRes.length === 0 && l.resources) {
            for (const r of l.resources) {
              run('INSERT INTO learning_resources (lesson_id, title, url, provider, kind, license_note) VALUES (?,?,?,?,?,?)',
                [lesson.id, r.title, r.url, r.provider, r.kind || 'docs', r.licenseNote || '']);
            }
          }
          // RAG chunks
          const existingChunks = get('SELECT COUNT(*) AS n FROM ai_chunks WHERE lesson_id = ?', [lesson.id]).n;
          if (existingChunks === 0) {
            const chunks = chunkLesson(`${l.title}\n\n${l.body}`, l.title);
            chunks.forEach((ch, ord) => {
              run('INSERT INTO ai_chunks (lesson_id, course_id, ord, heading, content, terms) VALUES (?,?,?,?,?,?)',
                [lesson.id, course.id, ord, ch.heading, ch.content, normaliseTerms(`${ch.heading} ${ch.content}`)]);
              stats.chunks++;
            });
          }
        });
      });

      // assessments
      (c.assessments || []).forEach((a, ai) => {
        const mod = a.moduleSlug ? get('SELECT id FROM course_modules WHERE course_id = ? AND slug = ?', [course.id, a.moduleSlug]) : null;
        let existing = get('SELECT * FROM assessments WHERE course_id = ? AND title = ?', [course.id, a.title]);
        if (!existing) {
          run('INSERT INTO assessments (course_id, module_id, title, kind, pass_score, time_limit_minutes, sort_order) VALUES (?,?,?,?,?,?,?)',
            [course.id, mod ? mod.id : null, a.title, a.moduleSlug ? 'module' : 'final', a.passScore || 70, a.timeLimitMinutes || 15, ai]);
          existing = get('SELECT * FROM assessments WHERE course_id = ? AND title = ?', [course.id, a.title]);
          a.questions.forEach((q, qi) => {
            run('INSERT INTO questions (assessment_id, prompt, explanation, sort_order) VALUES (?,?,?,?)',
              [existing.id, q.prompt, q.explanation, qi]);
            const qid = get('SELECT last_insert_rowid() AS id').id;
            q.options.forEach((label, oi) => {
              run('INSERT INTO question_options (question_id, label, is_correct, sort_order) VALUES (?,?,?,?)',
                [qid, label, oi === q.correct ? 1 : 0, oi]);
            });
            stats.questions++;
          });
        }
      });

      // exercises
      (c.exercises || []).forEach((e, ei) => {
        const existing = get('SELECT id FROM exercises WHERE slug = ?', [e.slug]);
        if (!existing) {
          run(`INSERT INTO exercises (course_id, slug, title, prompt_md, language, starter_code, solution, test_json, difficulty, sort_order)
               VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [course.id, e.slug, e.title, e.prompt, e.language || 'python', e.starter || '', e.solution || '',
              JSON.stringify(e.tests || []), e.difficulty || 'easy', ei]);
          stats.exercises++;
        }
      });

      // projects
      (c.projects || []).forEach((p) => {
        const existing = get('SELECT id FROM projects WHERE slug = ?', [p.slug]);
        if (!existing) {
          run('INSERT INTO projects (course_id, slug, title, brief_md, difficulty, est_hours) VALUES (?,?,?,?,?,?)',
            [course.id, p.slug, p.title, p.brief, p.difficulty || 'intermediate', p.estHours || 8]);
        }
      });
    });

    // ── aptitude ──
    APTITUDE_TOPICS.forEach((t, ti) => {
      let topic = get('SELECT * FROM aptitude_topics WHERE slug = ?', [t.slug]);
      if (!topic) {
        run('INSERT INTO aptitude_topics (slug, category, title, description, lesson_md, sort_order) VALUES (?,?,?,?,?,?)',
          [t.slug, t.category, t.title, t.description, t.lesson, ti]);
        topic = get('SELECT * FROM aptitude_topics WHERE slug = ?', [t.slug]);
      }
      const count = get('SELECT COUNT(*) AS n FROM aptitude_questions WHERE topic_id = ?', [topic.id]).n;
      if (count === 0) {
        for (const q of APTITUDE_QUESTIONS.filter((x) => x.topic === t.slug)) {
          run('INSERT INTO aptitude_questions (topic_id, difficulty, prompt, options_json, correct_index, explanation) VALUES (?,?,?,?,?,?)',
            [topic.id, q.difficulty, q.prompt, JSON.stringify(q.options), q.correct, q.explanation]);
          stats.aptitude++;
        }
      }
    });
  });

  seedCommunitySample();
  log('[seed]', JSON.stringify(stats));
  return stats;
}

/** Creates the team author + sample threads once. Never overwrites real discussions. */
function seedCommunitySample() {
  const existing = get("SELECT COUNT(*) AS n FROM community_posts");
  if (existing.n > 0) return;
  const team = ensureTeamUser();
  tx(() => {
    for (const post of SAMPLE_POSTS) {
      const group = get('SELECT id FROM community_groups WHERE slug = ?', [post.group]);
      if (!group) continue;
      const info = run('INSERT INTO community_posts (group_id, author_id, kind, title, body_md, tags, score, comment_count) VALUES (?,?,?,?,?,?,?,?)',
        [group.id, team.id, post.kind, post.title, post.body, post.tags, 1 + (post.answers?.length || 0), post.answers?.length || 0]);
      const postId = info.lastInsertRowid;
      let accepted = null;
      for (const a of post.answers || []) {
        const ci = run('INSERT INTO community_comments (post_id, author_id, body_md, score) VALUES (?,?,?,?)',
          [postId, team.id, a.body, a.accepted ? 1 : 0]);
        if (a.accepted) accepted = ci.lastInsertRowid;
      }
      if (accepted) run('UPDATE community_posts SET accepted_comment_id = ? WHERE id = ?', [accepted, postId]);
    }
  });
}

function ensureTeamUser() {
  let team = get("SELECT * FROM users WHERE email = 'team@lumen.local'");
  if (team) return team;
  const info = run('INSERT INTO users (email, password_hash, role, email_verified_at) VALUES (?,?,?,?)',
    ['team@lumen.local', hashPassword(`disabled-${Math.random().toString(36).slice(2)}`), 'moderator', nowIso()]);
  const id = info.lastInsertRowid;
  run('INSERT INTO user_profiles (user_id, display_name, avatar_color, headline) VALUES (?,?,?,?)',
    [id, 'Lumen Team', 'slate', 'Maintainers of the Lumen learning platform']);
  run('INSERT INTO user_preferences (user_id) VALUES (?)', [id]);
  return get('SELECT * FROM users WHERE id = ?', [id]);
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const stats = seedContent({ verbose: true });
  console.log('Seed complete:', stats);
}
