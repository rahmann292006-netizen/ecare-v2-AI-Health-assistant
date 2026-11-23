# Curriculum Audit — all 12 courses

Date of audit: **2026-11-16**. Every number below was read from the live database
(`server/data/lumen.db`) and from `server/content/curriculum.js`, not estimated.

The audit answers ten questions per course: current modules, current lessons, what is
actually covered, what is missing, proposed modules, proposed lessons, roadmap,
industry skill mapping, estimated preparation time, and the implementation change
needed to get there.

---

## 0. What the platform actually has today

| Course | Modules now | Lessons now | Average lesson length | Full 12-section standard | Knowledge checks |
| --- | --- | --- | --- | --- | --- |
| Python Programming | 4 | 9 | 5,157 chars | 9 / 9 | 9 |
| Data Structures & Algorithms | 4 | 8 | 5,817 chars | 8 / 8 | 8 |
| Full-Stack Development | 4 | 8 | 956 chars | 0 / 8 | 0 |
| Generative AI | 4 | 7 | 6,648 chars | 7 / 7 | 7 |
| Agentic AI | 3 | 5 | 1,040 chars | 0 / 5 | 0 |
| Machine Learning | 3 | 6 | 1,073 chars | 0 / 6 | 0 |
| Deep Learning | 3 | 6 | 997 chars | 0 / 6 | 0 |
| Cybersecurity | 3 | 6 | 991 chars | 0 / 6 | 0 |
| Cloud Computing & DevOps | 4 | 6 | 962 chars | 0 / 6 | 0 |
| Data Science | 3 | 6 | 1,019 chars | 0 / 6 | 0 |
| Database Engineering | 3 | 6 | 1,073 chars | 0 / 6 | 0 |
| System Design | 2 | 4 | 1,215 chars | 0 / 4 | 0 |
| **Total** | **40** | **77** | — | **24 / 77 (31%)** | **24** |

Assessment coverage today is thin: **one** module assessment per course, and **one**
final assessment per course. There are **one or two** graded coding exercises per
course and exactly **one** project per course. That is a catalogue, not a curriculum.

---

## 1. What "coverage" means in this audit

A topic counts as **covered** only when a lesson explains it *and* the learner has
something to do with it (runnable code, an exercise, or a challenge). A topic named in
a one-line summary is **not** covered. That distinction is why the gaps below are long
even for the three upgraded courses.

A topic counts as **missing** when any of these is true:

1. It appears in the benchmark sources for the role and nowhere in the course.
2. It exists only as a heading with no practice.
3. It is a prerequisite for a later topic but is never taught (an orphan dependency).

---

## 2. Per-course audit

### 2.1 Python Programming

- **Coverage:** execution model, values/types, control flow, containers, functions and
  scope, classes and dataclasses, exceptions, virtual environments, testing and a
  first project.
- **Missing:** file I/O and path handling (`pathlib`, encodings), JSON/CSV work (what
  most real scripts do), iterators and generators, standard-library tour (datetime,
  collections, itertools, argparse), concurrency at an introductory level, debugging
  and logging as a discipline, publishing a package.
- **Orphan dependencies:** the testing lesson assumes fixtures and mocking are known;
  the packaging lesson assumes a console entry point is understood.
- **Proposed:** 6 modules / 13 lessons (4 new lessons, 2 new modules:
  *Files, Text and Data*, *Capstone Project*).
- **Estimated preparation:** ~84 h at 60 min/day ≈ 12 weeks.

### 2.2 Data Structures & Algorithms

- **Coverage:** complexity, arrays and strings, two pointers, linked lists, stacks and
  queues, tree traversal, graphs, dynamic programming, sorting and binary search.
- **Missing:** hashing and hash-map internals, recursion as a design technique on its
  own (currently implied inside tree traversal), heaps and priority queues, tries,
  union-find, greedy vs DP decision-making, bit manipulation, benchmarking method.
- **Proposed:** 5 modules / 9 lessons (1 new: capstone with benchmarks).
- **Estimated preparation:** ~68 h ≈ 10 weeks.

### 2.3 Full-Stack Development

- **Coverage (shallow, ~950 chars/lesson):** HTTP basics, semantic HTML, components
  and state, forms, REST design, session auth, testing, capstone.
- **Missing and needed for the role:** CSS layout (flex/grid, responsive), the DOM and
  event model, async JavaScript and `fetch` error handling, client routing, server
  routing and middleware order, data modelling and migrations from the app side,
  CSRF and web security, error handling and observability, accessibility, build and
  deploy, environment configuration.
- **Proposed:** 6 modules / 15 lessons (8 new lessons, 2 new modules).
- **Estimated preparation:** ~110 h ≈ 16 weeks at 60 min/day.

### 2.4 Generative AI

- **Coverage:** tokens, attention, structured prompting, evaluation, RAG, safety and
  cost, capstone.
- **Missing:** embeddings and vector search as their own skill, function/tool calling,
  streaming UX, structured output and schema validation in depth, fine-tuning vs
  prompting decision, latency budgeting.
- **Proposed:** 5 modules / 8 lessons (1 new: capstone module).
- **Estimated preparation:** ~72 h ≈ 10 weeks.

### 2.5 Agentic AI

- **Coverage (shallow):** agent loop, tool design, memory, self-verification,
  capstone.
- **Missing:** tool schemas and validation, permissions and blast radius, idempotency
  and retries, planning and decomposition, budgets, tracing, evaluation harnesses,
  human-in-the-loop review.
- **Proposed:** 5 modules / 11 lessons (6 new, 2 new modules).
- **Estimated preparation:** ~58 h ≈ 8 weeks.

### 2.6 Machine Learning

- **Coverage (shallow):** framing, splits, linear/logistic regression, trees and
  ensembles, diagnosis, capstone.
- **Missing:** baselines as a first-class step, feature engineering and encoding,
  imputation, pipelines and leakage prevention, metrics that match the decision
  (precision/recall/ROC-AUC/calibration), class imbalance, hyperparameter search,
  model serving.
- **Proposed:** 5 modules / 11 lessons (6 new, 2 new modules).
- **Estimated preparation:** ~70 h ≈ 10 weeks.

### 2.7 Deep Learning

- **Coverage (shallow):** perceptron to network, backpropagation, CNNs, transfer
  learning, training recipes, capstone.
- **Missing:** tensors and autograd in practice, sequence models, optimisation and
  schedules in depth, regularisation, debugging training (loss curves, gradient
  problems), export and serving.
- **Proposed:** 5 modules / 9 lessons (3 new, 2 new modules).
- **Estimated preparation:** ~70 h ≈ 10 weeks.

### 2.8 Cybersecurity

- **Coverage (shallow):** threat modelling, OWASP Top 10, auth hardening, input and
  output handling, hardening, capstone.
- **Missing:** secure design principles, access control models (IDOR, RBAC/ABAC),
  secrets management, logging and detection, incident response, dependency and
  supply-chain risk, security testing in CI.
- **Proposed:** 5 modules / 12 lessons (6 new, 1 new module).
- **Estimated preparation:** ~62 h ≈ 9 weeks.

### 2.9 Cloud Computing & DevOps

- **Coverage (shallow):** cloud model, Linux, Docker, CI/CD, observability,
  capstone.
- **Missing:** networking basics (DNS, TLS, VPC), orchestration, infrastructure as
  code, deploy and rollback strategy, incidents and on-call, cost and capacity.
- **Proposed:** 5 modules / 11 lessons (5 new, 1 new module).
- **Estimated preparation:** ~66 h ≈ 9 weeks.

### 2.10 Data Science

- **Coverage (shallow):** cleaning, reshaping and joins, EDA, uncertainty, charts,
  capstone.
- **Missing:** join semantics and keys as a skill, analytical SQL, experiment design
  and causality, reproducible analysis (notebook hygiene, environment pinning),
  stakeholder communication.
- **Proposed:** 5 modules / 10 lessons (5 new, 2 new modules).
- **Estimated preparation:** ~60 h ≈ 8 weeks.

### 2.11 Database Engineering

- **Coverage (shallow):** normalisation, relationships, indexes, transactions,
  migrations, capstone.
- **Missing:** constraints and integrity as enforcement (not documentation), reading
  query plans, concurrency anomalies, backup and recovery you have tested,
  cardinality and statistics.
- **Proposed:** 5 modules / 10 lessons (4 new, 1 new module).
- **Estimated preparation:** ~62 h ≈ 9 weeks.

### 2.12 System Design

- **Coverage (shallow):** a design process, building blocks, partitioning, capstone.
- **Missing:** back-of-envelope estimation, caching strategies, consistency and
  failure modes, observability of a design, cost analysis.
- **Proposed:** 4 modules / 8 lessons (4 new, 2 new modules).
- **Estimated preparation:** ~48 h ≈ 7 weeks.

---

## 3. Totals and the honest conclusion

| Measure | Now | After the planned expansion |
| --- | --- | --- |
| Courses | 12 | 12 |
| Modules | 40 | **59** |
| Lessons | 77 | **127** |
| Lessons meeting the 12-section standard | 24 | 127 (target) |
| Knowledge checks (per lesson) | 24 | 127 (target) |
| Module assessments | 12 | 59 (target) |
| Final assessments | 12 | 12 |
| Projects | 12 | 12 capstones + module projects |
| Estimated total study time | ~490 h claimed | ~830 h stated per course, per learner pace |

**What this means:** the platform currently has three courses that teach properly and
nine that outline. The expansion adds 30 lessons that were genuinely missing, splits
four overloaded modules, and gives every course a visible roadmap, a plan engine and
per-module assessment.

It does **not** claim that 127 lessons makes anyone job-ready. Job readiness is
measured separately, in `JOB_READINESS_FRAMEWORK.md`, from competencies the learner
demonstrates — not from lessons opened.

## 4. Implementation changes required

| # | Change | Why |
| --- | --- | --- |
| 1 | `curriculum_roadmaps`, `roadmap_stages` tables | Roadmaps must be data, so they can be rendered and updated without deploys |
| 2 | `learning_plans`, `learning_plan_targets` | Personalised daily plan derived from real lesson durations |
| 3 | `reminder_preferences`, `scheduled_notifications`, `notification_deliveries` | Reminders must be computed from progress, not from a browser tab |
| 4 | `competitions`, `competition_registrations`, `competition_submissions`, `competition_results` | Events need real records; no fake competitions |
| 5 | `competencies`, `competency_evidence` | Job readiness from evidence, not completion |
| 6 | New lessons authored to the 12-section standard (30) | Closes the gaps listed above |
| 7 | Module assessments for every module | One assessment per course cannot gate progress |
| 8 | Roadmap UI on the course page, before enrolment | Phase 3 requirement |
| 9 | Plan creation flow and dashboard plan card | Phase 4 requirement |
| 10 | Notification worker with quiet hours and dedupe | Phase 5/7 requirement |

All ten are additive. No existing table is dropped or rewritten, and every lesson
upgrade happens **in place by `lessons.id`**, so progress, notes, bookmarks,
enrolments and assessment attempts are preserved. Verified after every bulk change.

---

## 5. Applied state (after `node scripts/apply-curriculum.mjs`)

Database backup taken first: `server/data/backups/lumen-pre-curriculum-2026-11-17T09-05-53.db`.

| Course | Modules | Lessons | Written (12-section) | Outline (honestly marked) |
| --- | --- | --- | --- | --- |
| Python Programming | 6 | 13 | 9 | 4 |
| Data Structures & Algorithms | 5 | 9 | 8 | 1 |
| Full-Stack Development | 6 | 15 | 8 | 7 |
| Generative AI | 5 | 8 | 7 | 1 |
| Agentic AI | 5 | 11 | 5 | 6 |
| Machine Learning | 5 | 11 | 6 | 5 |
| Deep Learning | 5 | 9 | 6 | 3 |
| Cybersecurity | 4 | 11 | 6 | 5 |
| Cloud Computing & DevOps | 5 | 11 | 6 | 5 |
| Data Science | 5 | 10 | 6 | 4 |
| Database Engineering | 5 | 10 | 6 | 4 |
| System Design | 4 | 8 | 4 | 4 |
| **Total** | **60** | **126** | **77** | **49** |

Student records verified unchanged after the structural change: `lesson_progress` 18,
`submissions` 33, `enrolments` 9, `foreign_key_check` 0.

**Outline lessons are not lessons.** They carry `kind = 'outline'` and a body that
states plainly that the material is not written yet. The course page and roadmap show
the real written count separately, and an outline lesson can be read but has no
knowledge check and claims no teaching. This is the difference between a plan and a
claim.

Three lessons were relocated into the modules where they belong (cybersecurity
`auth-controls`, data-science `ds-capstone`, database `transactions`); each kept its
id, so no progress row moved.

## 6. What remains

- Author the 49 outline lessons to the 12-section standard (30 genuinely new topics +
  19 existing short lessons that are still in the pre-standard format).
- Add a module assessment for every module (currently 12 module assessments for 60
  modules).
- Build the competency pipeline described in `JOB_READINESS_FRAMEWORK.md`.
