# Job-Readiness Framework

This document defines what Lumen measures, what it refuses to claim, and how the
numbers are computed. It exists because "course completed" and "can do the job" are
different facts, and conflating them is the most common dishonesty in learning
platforms.

**Lumen does not guarantee employment, interviews or salary outcomes.** Nothing in
the product says otherwise, and nothing in this framework should be read as a
prediction of hiring.

---

## 1. The five signals

Every course shows five separate indicators. They are computed from different tables
and can disagree — that is the point.

| Signal | Question it answers | Computed from | Cannot be gamed by |
| --- | --- | --- | --- |
| **Course completion** | Have I worked through the material? | `lesson_progress` (completed / total lessons) | — (this one *is* the walk-through) |
| **Assessment performance** | Can I answer questions under time pressure? | `submissions` best score per assessment | Opening a lesson |
| **Project completion** | Have I built something that runs? | `user_projects.status = 'done'` + repo link | Reading |
| **Skill mastery** | Can I demonstrate a competency? | `competency_evidence` rows that passed | Watching |
| **Readiness** | Am I credible for the target role? | weighted combination, below | Any single signal |

---

## 2. Competencies

A competency is a statement a learner must *demonstrate*, phrased as behaviour:
"Debug a failing Python program from its traceback", not "know exceptions".

Each competency belongs to one course and maps to one or more target roles. Evidence
is recorded as a row in `competency_evidence`:

| Evidence kind | Where it comes from | Pass rule |
| --- | --- | --- |
| `assessment` | A module or final assessment submission | Score ≥ the assessment's `pass_score` |
| `project` | A `user_projects` row moved to `done` with a repo URL | Manual completion + link present |
| `challenge` | A graded competition submission | All test cases passed |
| `self` | A written self-assessment | **Never counted towards readiness** — recorded for the learner only |

A competency with no passing evidence is `not_demonstrated`. One passing evidence row
makes it `demonstrated`; two different kinds (for example an assessment *and* a
project) make it `evidenced`, which is the strongest state the platform reports.

---

## 3. Readiness, defined numerically

Readiness is a percentage of competencies **evidenced**, weighted by role:

```
readiness(course) = 100 × Σ weight(competency) × evidenced(competency)
                        / Σ weight(competency)
```

Where:

- `evidenced = 1` when the competency has passing evidence of at least two different
  kinds, `0.5` when it has one kind, `0` otherwise.
- Weights: `core` competencies ×2, `supporting` competencies ×1. Each competency is
  tagged `core` or `supporting` in the curriculum document for its course.

The UI shows the raw counts beside the percentage (`7 of 12 competencies evidenced`)
so the number is never the only thing a learner sees.

### Bands and what they mean

| Band | Range | Wording used in the product |
| --- | --- | --- |
| Exploring | 0–24% | "You are building foundations. Complete an assessment to evidence your first competency." |
| Developing | 25–49% | "You can explain the basics. Projects are what turn that into evidence." |
| Practising | 50–74% | "You have evidenced most core competencies. Finish the capstone and two projects." |
| Portfolio-ready | 75–100% | "Your evidence covers this role's core competencies. Nothing here guarantees an interview — it shows what you can demonstrate." |

"Portfolio-ready" is the highest label the platform uses. It describes *evidence*, not
employability.

---

## 4. What is deliberately not measured

- **Time spent.** Sitting in a lesson is not learning; the platform records minutes
  only for the learner's own planning.
- **Streaks.** Useful for habit, meaningless for skill. Shown, never weighted.
- **Lesson count.** A completion metric, and the one this framework exists to stop
  people mistaking for readiness.
- **AI tutor usage.** Asking questions is good practice; it is not evidence.

---

## 5. Per-course competencies (target state)

Each course document in `docs/curriculum/courses/` lists its competencies with the
evidence that proves them. The pattern is the same everywhere:

1. **Explain** — an assessment question that requires prose reasoning, not recall.
2. **Implement** — a graded exercise or challenge that must pass tests.
3. **Debug** — a challenge that ships with a broken program and a failing test.
4. **Build** — a project with a working artefact and a repo link.
5. **Decide** — a written trade-off justification reviewed against a rubric.

A course is only "complete" for readiness purposes when every core competency has at
least one passing evidence row. Completion of lessons alone never changes the
readiness band.

---

## 6. Honest current state

As of 2026-11-16:

| Piece | Status |
| --- | --- |
| Tables (`competencies`, `competency_evidence`) | **Implemented** (schema applied) |
| Competency content for 12 courses | **Not authored** — pending |
| Evidence recording from assessments | **Not implemented** — pending |
| Evidence recording from projects | **Not implemented** — pending |
| Readiness computation + UI | **Not implemented** — pending |

The framework is written and the storage exists; the pipeline is not built. Until it
is, the product must not display a readiness percentage. This document is the
specification the implementation will be tested against.
