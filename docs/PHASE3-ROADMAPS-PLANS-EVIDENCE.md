# Phase 3 — Roadmaps, Learning Plans, Evidence and Notifications

Everything in this document was built on the existing Lumen codebase and verified against
the live database and a running server. Where something is **not** done, it says so.

Test evidence: `test-plans.mjs`, `test-readiness.mjs`, `test-notify.mjs` (all green), plus
browser passes (`shoot-roadmap.mjs`, `shoot-comp.mjs`, `shoot-notify.mjs`, `shoot-final.mjs`).

---

## 1. What was added

| Area | Route(s) | UI | Status |
|---|---|---|---|
| Course roadmaps (all 12) | `GET /api/roadmap/courses/:slug/roadmap`, `GET /api/roadmap/roadmaps` | `/courses/:slug/roadmap` | Implemented + tested |
| Start a learning journey | `GET/POST/PATCH /api/plans/courses/:slug`, `POST .../pause|resume|restart|reschedule` | `/courses/:slug/start` | Implemented + tested |
| Personal plan | `GET /api/plans/courses/:slug`, `/week`, `/today`, `/targets`, `POST /targets/:id/skip` | `/courses/:slug/plan`, `/plan` | Implemented + tested |
| Job-readiness evidence | `GET /api/competencies/courses/:slug`, `/overview`, `/projects`; `PUT .../projects/:projectSlug`; `POST .../self-assess` | `/courses/:slug/readiness` | Implemented + tested |
| Notifications | `GET /api/notifications`, `/unread-count`, `/preferences`, `/diagnostics`; `POST /:id/read`, `/read-all`, `/run-now` | `/notifications`, bell in the shell | Implemented + tested (in-app only) |

Schema added: `roadmap_stages.goal`, `roadmap_stages.skills_json`,
`learning_plan_targets.project_slug`, `competencies.weight`, `competencies.evidence_ref`,
plus the previously created roadmap / plan / notification / competency / competition tables.
All applied to the live DB **without deleting a row** (see §5).

---

## 2. Roadmaps

Built from `server/content/curriculum.js` by `scripts/rebuild-roadmaps.mjs`
(`buildRoadmap` in `server/lib/roadmap.js`). Current state: **12 roadmaps, 55 stages,
53 module links, 0 stages without a goal.**

Each roadmap carries: audience, capstone, assessment plan, estimated hours per stage,
benchmark sources **with the real public curricula they came from** (The Odin Project,
roadmap.sh, MDN, OWASP, SRE book, AWS Well-Architected, and so on — recorded in
`curriculum.js`, not invented).

Each stage has a goal and a "by the end you can …" skill list (`STAGE_DEFAULTS` in
`curriculum.js`, overridable per course). Each module lists its real lessons, their real
durations, and the module assessment.

**Honesty rule enforced in the API and the UI:** lessons whose content is still an outline
are returned with `outline: true` and rendered as a non-clickable **Planned** row. The
roadmap header states how many lessons are written, e.g. *"9 of 16 lessons are fully
written. The rest are shown as planned topics."* No outline lesson is ever presented as
available.

Roadmaps are previewable **before enrolment** — `GET /api/roadmap/...` works for an
anonymous request (verified).

---

## 3. Personal learning plans

`server/lib/plan-engine.js` turns the roadmap into dated sessions:

- Targets come from **real durations**: `lessons.duration_minutes`,
  `assessments.time_limit_minutes`, `projects.est_hours`. Nothing is estimated from a
  lesson count.
- The queue is ordered by module → lesson, with a **revision block after every third
  lesson** of a module and a checkpoint target per assessment.
- Distribution respects the daily minute budget and only uses the chosen study days; a
  long project is split into parts, and unused minutes are carried forward rather than
  dropped.
- **Completion is never invented.** `syncPlanProgress` marks a lesson target done only
  when `lesson_progress.status = 'completed'`; a checkpoint only when a submission
  **passed**; a practice set once attempted; a project only when `user_projects.status =
  'done'`. Past pending targets become `missed`, never `done`.
- Changing pace or dates **keeps completed history** and re-dates only pending targets.
- “Recover missed” re-dates pending/missed targets from today and records `moved_from`.
- Pause / resume / restart are all supported; restart abandons the old plan (kept in the
  database) and generates a new one.

Verified by `test-plans.mjs`: 27 checks including *no target on a non-study day*, *no day
over budget*, *nothing marked done before work happens*, *a target flips to done only
after the lesson is really completed*, *history preserved on pace change*.

---

## 4. Job-readiness evidence

`server/routes/competencies.js` implements the framework in
`docs/curriculum/JOB_READINESS_FRAMEWORK.md` literally:

- **Evidence kinds that count:** `assessment`, `project`, `challenge`. `self` is recorded
  but never counted.
- Evidence is derived from real rows: a **passed submission**, or a project with
  `status='done'` **and a repository URL**. Nothing else.
- States: *Not demonstrated* (no passed evidence) → *Demonstrated* (one kind) →
  *Evidenced* (two kinds).
- Readiness is a weighted percentage (core competencies ×2); bands are Exploring →
  Developing → Practising → **Portfolio-ready** (the highest label — never “job ready”).
- Competencies are seeded per course from the curriculum by
  `scripts/seed-competencies.mjs`: **61 competencies across 12 courses**, each module plus
  the capstone, linked to its module assessment or project where one exists.

`test-readiness.mjs` proves the negative cases: **completing a lesson does not create
evidence**, a project without a repository link **does not count**, and an invalid URL is
rejected.

**Not built yet:** the `challenge` evidence kind has no source because the competition
system is still schema-only; module competencies without an assessment show as *Not
demonstrated* and are not faked.

---

## 5. Notifications and reminders

`server/lib/notify.js` + `server/routes/notifications.js`:

- A **server-side interval** (`NOTIFY_INTERVAL_MS`, default 5 min, `NOTIFY_WORKER=off` to
  disable) runs `runWorkerTick()`: it queues today's study reminder per learner **only when
  a plan has real pending work**, queues a Monday weekly summary **only when something
  actually happened in the last seven days**, then delivers everything due.
- **Quiet hours and the learner's timezone** are applied at delivery using `Intl`, not a
  hard-coded offset. A suppressed reminder is recorded as `cancelled` with reason
  `quiet hours` — never as sent.
- **Dedupe** is per user per day (`study:<date>`, `weekly:<date>`), enforced by a unique
  index on `(user_id, dedupe_key)`.
- Delivery tracking is per row: `pending → sent / failed / cancelled` with `attempts`,
  `last_error`, `sent_at`.
- Channels: **in-app is live**. Email is reported as configured only when `SMTP_HOST`
  exists; **push is reported as not configured** — the UI says so instead of pretending.

Verified by `test-notify.mjs` (16 checks) including *no plan → no reminder invented*,
*second tick does not duplicate*, *quiet hours suppress and record the reason*,
*disabling a category stops it being queued*, *push reported as not configured*.

---

## 6. What is still missing (stated plainly)

| Item | Status |
|---|---|
| 49 outline lessons (30 new topics + 19 short lessons) | **Not written.** They are visible as *Planned* and excluded from every plan, count and readiness figure. |
| Module assessments | 12 exist for 60 modules; 48 modules have none. |
| Final course assessments | 0 exist. |
| Competition / event system | Schema only — no routes, no UI, no announcements. |
| Email and push delivery | Not configured. Interfaces exist; nothing claims delivery. |
| Competency `challenge` evidence | Blocked on the competition system. |
| AI tutor live answers | Blocked on an expired provider key (see PHASE2-STATUS.md). |

---

## 7. Reproduce

```bash
node scripts/rebuild-roadmaps.mjs      # roadmaps from curriculum.js
node scripts/seed-competencies.mjs     # competencies + evidence links
NODE_ENV=production PORT=4180 node server/index.js &
node test-plans.mjs && node test-readiness.mjs && node test-notify.mjs
```
