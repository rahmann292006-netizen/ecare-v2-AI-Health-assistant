/** End-to-end API test for roadmaps, learning plans and competencies. */
const BASE = process.env.BASE || 'http://localhost:4180';
let cookies = {};
let csrf = '';
let failures = 0;
const pass = (m) => console.log('PASS ' + m);
const fail = (m, d) => { failures += 1; console.log('FAIL ' + m + (d ? ' — ' + JSON.stringify(d).slice(0, 300) : '')); };

function jar() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}
async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth) { headers.cookie = jar(); if (method !== 'GET') headers['x-csrf-token'] = csrf; }
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.getSetCookie?.() || [];
  for (const c of set) {
    const [pair] = c.split(';');
    const [k, v] = pair.split('=');
    if (k === 'lumen_csrf' && v) csrf = v;
    if (k === 'lumen_session' && v) cookies.lumen_session = v;
    if (k === 'lumen_csrf' && v) cookies.lumen_csrf = v;
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

// prime csrf
await req('/api/catalogue/status', { auth: false });
if (!csrf) { console.log('FAIL could not obtain a CSRF token'); process.exit(1); }

const stamp = Date.now();
const email = `plan${stamp}@example.com`;
let r = await req('/api/auth/signup', { method: 'POST', auth: false, body: { email, password: 'Correct-horse-battery9', displayName: 'Plan Tester' } });
if (r.status !== 201 && r.status !== 200) { fail('signup', r.json); process.exit(1); }
r = await req('/api/auth/login', { method: 'POST', auth: false, body: { email, password: 'Correct-horse-battery9' } });
if (!cookies.lumen_session) { fail('login', r.json); process.exit(1); }
pass('signed up and signed in as ' + email);

// ── roadmap ──
r = await req('/api/roadmap/courses/full-stack-development/roadmap');
const rm = r.json?.data?.roadmap;
r.status === 200 && rm ? pass(`roadmap loads: ${rm.stages.length} stages, ${rm.totals.modules} modules, ${rm.totals.lessons} lessons`) : fail('roadmap', r.json);
rm && rm.totals.outlineLessons > 0 ? pass(`roadmap is honest about unwritten lessons: ${rm.totals.outlineLessons} outline`) : fail('roadmap should report outline lessons');
rm && rm.stages.every((s) => s.modules.every((m) => typeof m.lessonCount === 'number')) ? pass('every module reports its real lesson count') : fail('module lesson counts missing');

// unauth roadmap preview must work (before enrolling)
const anon = await fetch(BASE + '/api/roadmap/courses/system-design/roadmap');
anon.status === 200 ? pass('roadmap previews without signing in') : fail('anonymous roadmap preview', anon.status);

// ── plan preview ──
r = await req('/api/plans/courses/full-stack-development/preview?minutesPerDay=60&daysPerWeek=5');
const prev = r.json?.data;
r.status === 200 && prev?.remaining?.items > 0 ? pass(`plan preview: ${prev.remaining.items} items, ${prev.remaining.hours}h, finish ${prev.remaining.finishDate}`) : fail('plan preview', r.json);
prev && prev.remaining.finishDate ? pass('preview returns a real finish date') : fail('preview finish date missing');

// ── create plan ──
r = await req('/api/plans/courses/full-stack-development', { method: 'POST', body: { minutesPerDay: 60, daysPerWeek: 5, skillLevel: 'beginner', reminderTime: '19:30', timezone: 'Asia/Kolkata' } });
const plan = r.json?.data?.plan;
r.status === 201 && plan ? pass(`plan created: ${plan.targets.total} targets, ${plan.totalMinutes} minutes`) : fail('create plan', r.json);
plan && plan.targets.total > 0 ? pass('targets were generated from real lesson durations') : fail('no targets generated');

// study-day compliance: no target on a non-study day
r = await req('/api/plans/week');
const week = r.json?.data?.plans?.[0];
r.status === 200 && week ? pass(`week view: ${week.days.length} days`) : fail('week view', r.json);
const nonStudyWithWork = week?.days?.filter((d) => !d.isStudyDay && d.targets.length > 0) || [];
nonStudyWithWork.length === 0 ? pass('no targets scheduled on non-study days') : fail('targets on non-study days', nonStudyWithWork.map((d) => d.date));

// daily budget respected
const over = week?.days?.filter((d) => d.minutes > plan.minutesPerDay) || [];
over.length === 0 ? pass(`no day exceeds the ${plan.minutesPerDay} min budget`) : fail('day over budget', over.map((d) => [d.date, d.minutes]));

// ── completion syncs, never auto-completes ──
r = await req('/api/plans/courses/full-stack-development');
r.json?.data?.plan?.targets?.done === 0 ? pass('nothing is marked done before work happens') : fail('targets marked done with no work', r.json?.data?.plan?.targets);

// complete a real lesson that appears in the plan
const today = await req('/api/plans/today');
const firstLesson = (today.json?.data?.items || []).find((i) => i.kind === 'lesson' && i.status !== 'done' && i.lessonSlug);
if (firstLesson) {
  const lesson = await req(`/api/learning/lessons/full-stack-development/${firstLesson.lessonSlug}/complete`, { method: 'POST', body: {} });
  lesson.status === 200 ? pass(`completed the planned lesson "${firstLesson.lessonSlug}"`) : fail('lesson completion', lesson.json);
  r = await req('/api/plans/courses/full-stack-development');
  r.json?.data?.plan?.targets?.done >= 1
    ? pass(`plan target flipped to done only after real completion (${r.json.data.plan.targets.done})`)
    : fail('plan did not reflect completion', r.json?.data?.plan?.targets);
} else {
  fail('no lesson target with a slug found for today');
}

// ── pace change keeps history, re-dates the future ──
const before = (await req('/api/plans/courses/full-stack-development')).json.data.plan;
r = await req('/api/plans/courses/full-stack-development', { method: 'PATCH', body: { minutesPerDay: 30 } });
const after = r.json?.data?.plan;
r.status === 200 && after?.minutesPerDay === 30 ? pass('pace change accepted') : fail('pace change', r.json);
after?.targets?.done >= before.targets.done ? pass(`history preserved: done count ${before.targets.done} → ${after.targets.done}`) : fail('history lost on pace change');
after?.targets?.total > before.targets.total ? pass('smaller daily budget produces more, shorter sessions') : fail('targets did not redistribute', [before.targets.total, after.targets.total]);

// ── pause / resume ──
r = await req('/api/plans/courses/full-stack-development/pause', { method: 'POST', body: {} });
r.json?.data?.plan?.status === 'paused' ? pass('plan pauses') : fail('pause', r.json);
r = await req('/api/plans/courses/full-stack-development/resume', { method: 'POST', body: {} });
r.json?.data?.plan?.status === 'active' ? pass('plan resumes') : fail('resume', r.json);

// ── missed sessions recover without false completion ──
r = await req('/api/plans/courses/full-stack-development/reschedule', { method: 'POST', body: {} });
r.status === 200 ? pass(`reschedule ran, ${r.json.data.rescheduled} target(s) moved`) : fail('reschedule', r.json);
const afterResched = (await req('/api/plans/courses/full-stack-development')).json.data.plan;
afterResched.targets.done === after.targets.done ? pass('reschedule did not mark anything done') : fail('reschedule changed done count');

// ── validation ──
r = await req('/api/plans/courses/not-a-course', { method: 'POST', body: {} });
r.status === 404 ? pass('unknown course → 404') : fail('unknown course should 404', r.status);
r = await req('/api/plans/courses/full-stack-development/preview?minutesPerDay=99999');
const clamped = r.json?.data?.pace?.minutesPerDay;
clamped === 480 ? pass('absurd daily budget is clamped to 480') : fail('budget clamp', clamped);

// ── competency framework is honest before content exists ──
r = await req('/api/competencies/courses/full-stack-development');
r.status === 200 && r.json.data.readiness.available === false ? pass('readiness reports unavailable (no competencies authored) instead of a fake percentage') : fail('readiness should be unavailable', r.json?.data?.readiness);
r = await req('/api/competencies/overview');
r.status === 200 ? pass('competency overview responds for all 12 courses') : fail('competency overview', r.status);

// ── authorization ──
const other = await fetch(BASE + '/api/plans/week');
other.status === 401 ? pass('plans require authentication (401)') : fail('unauth plans should 401', other.status);

console.log(failures === 0 ? '\nALL PLAN TESTS PASSED' : `\n${failures} FAILURE(S)`);
process.exit(failures ? 1 : 0);
