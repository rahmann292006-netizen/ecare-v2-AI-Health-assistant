/**
 * Job-readiness evidence pipeline: a competency must never be marked demonstrated
 * by attendance, and readiness must stay 0 until something real is passed.
 */
const BASE = process.env.BASE || 'http://localhost:4180';
let cookies = {};
let csrf = '';
let failures = 0;
const pass = (m) => console.log('PASS ' + m);
const fail = (m, d) => { failures += 1; console.log('FAIL ' + m + (d ? ' — ' + JSON.stringify(d).slice(0, 300) : '')); };

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth) { headers.cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '); if (method !== 'GET') headers['x-csrf-token'] = csrf; }
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';'); const [k, v] = pair.split('=');
    if (k === 'lumen_csrf' && v) { csrf = v; cookies.lumen_csrf = v; }
    if (k === 'lumen_session' && v) cookies.lumen_session = v;
  }
  return { status: res.status, json: await res.json().catch(() => null) };
}

await req('/api/catalogue/status', { auth: false });
const email = `ready${Date.now()}@example.com`;
await req('/api/auth/signup', { method: 'POST', auth: false, body: { email, password: 'Correct-horse-battery9', displayName: 'Ready Tester' } });
let r = await req('/api/auth/login', { method: 'POST', auth: false, body: { email, password: 'Correct-horse-battery9' } });
if (!cookies.lumen_session) { fail('login', r.json); process.exit(1); }
pass('signed in as ' + email);

// 1. a fresh learner has a framework but no readiness
r = await req('/api/competencies/courses/python-programming');
const ready0 = r.json?.data?.readiness;
r.status === 200 && ready0?.available ? pass(`framework loaded: ${ready0.total} competencies, ${ready0.percent}%`) : fail('framework', r.json);
ready0?.percent === 0 && ready0?.demonstrated === 0 ? pass('readiness starts at 0% with nothing demonstrated') : fail('readiness should start at 0', ready0);

// 2. watching lessons does not move readiness
const course = await req('/api/learning/courses/python-programming');
const lessonSlug = course.json.data.modules[0].lessons[0].slug;
await req(`/api/learning/lessons/python-programming/${lessonSlug}/complete`, { method: 'POST', body: {} });
r = await req('/api/competencies/courses/python-programming');
r.json.data.readiness.percent === 0 ? pass('completing a lesson does not create evidence') : fail('lesson completion moved readiness', r.json.data.readiness);

// finish the module's lessons first — the gate is honest and must be respected
const mod = course.json.data.modules.find((m) => m.slug === 'foundations') || course.json.data.modules[0];
for (const l of mod.lessons) {
  await req(`/api/learning/lessons/python-programming/${l.slug}/complete`, { method: 'POST', body: {} });
}

// 3. passing the module assessment demonstrates the module competency
const assessment = r.json.data.competencies.find((c) => c.evidenceRef?.startsWith('assessment:'));
if (!assessment) { fail('no module competency linked to an assessment'); }
else {
  const id = assessment.evidenceRef.split(':')[1];
  // answers are graded server-side and never sent to the client: read the key from the DB
  const Database = (await import('better-sqlite3')).default;
  const db = new Database('server/data/lumen.db');
  const detail = await req(`/api/assessments/${id}`);
  const questions = detail.json?.data?.questions || [];
  const answers = questions.map((q) => {
    const row = db.prepare('SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1 LIMIT 1').get(q.id);
    return { questionId: q.id, optionId: row?.id ?? null };
  });
  const submit = await req(`/api/assessments/${id}/submit`, { method: 'POST', body: { answers } });
  const passedNow = submit.json?.data?.submission?.passed ?? submit.json?.data?.passed ?? (submit.status === 200);
  const after = await req('/api/competencies/courses/python-programming');
  const item = after.json.data.readiness.items.find((i) => i.key === assessment.key);
  passedNow
    ? (item?.state !== 'not_demonstrated'
        ? pass(`passing "${assessment.title}" demonstrated "${item.title}" (${item.state}), readiness ${after.json.data.readiness.percent}%`)
        : fail('assessment passed but competency still not demonstrated', item))
    : fail('could not pass the module assessment', submit.json?.data || submit.json?.error);
}

// 4. a project only counts with a repository link
const projects = await req('/api/competencies/courses/python-programming/projects');
const project = projects.json?.data?.projects?.[0];
project ? pass(`project list returned (${project.slug}, ${project.status})`) : fail('projects list', projects.json);
if (project) {
  r = await req(`/api/competencies/courses/python-programming/projects/${project.slug}`, { method: 'PUT', body: { status: 'done' } });
  r.status === 200 ? pass('project marked done without a link is accepted but records no evidence') : fail('project update', r.json);
  let cap = (await req('/api/competencies/courses/python-programming')).json.data.readiness.items.find((i) => i.key === 'capstone');
  cap?.state === 'not_demonstrated' ? pass('capstone still not demonstrated — no repository link') : fail('project without link counted as evidence', cap);
  r = await req(`/api/competencies/courses/python-programming/projects/${project.slug}`, { method: 'PUT', body: { status: 'done', repoUrl: 'https://github.com/example/python-capstone' } });
  r.status === 200 ? pass('project saved with a repository link') : fail('project update with link', r.json);
  cap = (await req('/api/competencies/courses/python-programming')).json.data.readiness.items.find((i) => i.key === 'capstone');
  cap?.state === 'demonstrated' ? pass('capstone now demonstrated by a project with a link') : fail('capstone evidence missing', cap);
  r = await req(`/api/competencies/courses/python-programming/projects/${project.slug}`, { method: 'PUT', body: { status: 'done', repoUrl: 'not a url' } });
  r.status === 400 ? pass('an invalid repository link is rejected') : fail('invalid repo url accepted', r.status);
}

// 5. overview across all courses
r = await req('/api/competencies/overview');
r.status === 200 && r.json.data.courses.length === 12 ? pass('overview covers all 12 courses') : fail('overview', r.status);

// 6. another learner cannot see this evidence
const anon = await fetch(BASE + '/api/competencies/courses/python-programming');
anon.status === 401 ? pass('competencies require authentication') : fail('unauth competencies', anon.status);

console.log(failures === 0 ? '\nALL READINESS TESTS PASSED' : `\n${failures} FAILURE(S)`);
process.exit(failures ? 1 : 0);
