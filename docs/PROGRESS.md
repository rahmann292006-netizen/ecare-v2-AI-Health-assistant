# Lumen — development progress report

Working rule: a feature is listed as done only after it was exercised against the running
server (API + browser), not because the code exists.

## Phase 1 — Checkpoint assessment interface — DONE

New files
- `server/routes/assessments.js` — the checkpoint API.
- `client/src/pages/Checkpoint.jsx` — intro, attempt and result screens.
- `client/src/pages/AttemptReview.jsx` — a stored attempt read back from the database.

Modified files
- `server/index.js` — mounts `/api/assessments`.
- `client/src/App.jsx` — routes `/checkpoints/:id` and `/checkpoints/:id/attempt/:submissionId`.
- `client/src/pages/CourseDetail.jsx` — checkpoints are now links with status, best score and attempts (the old "not wired to the UI yet" note is gone). This file had to be restored from `client/dist` after a scripted edit corrupted it; content is identical plus the new checkpoint links.
- `client/src/pages/Analytics.jsx` — checkpoint rows read the stored submissions.
- `client/src/lib/format.js` — `formatDate`, `formatDuration`.
- `client/src/styles/app.css` — attempt bar, options, question map, review styles (both themes).
- `client/src/pages/Tutor.jsx` — availability now requires `configured && verified`, so an unverified/expired key shows the setup card instead of a broken chat.

APIs integrated (no duplicate endpoints)
- `GET /api/learning/courses/:slug` — assessment list, gate inputs, best score.
- `POST /api/learning/lessons/:courseSlug/:lessonSlug/complete` — opens the gate.
- `GET /api/assessments/course/:slug`, `GET /api/assessments/:id`,
  `POST /api/assessments/:id/submit`, `GET /api/assessments/submissions/:id`,
  `GET /api/assessments/mine` — all read and write the existing `assessments`,
  `questions`, `question_options` and `submissions` tables.

Security and correctness decisions
- Correct answers are never sent before submission; scoring is server-side only.
- Options are shuffled per request so position is not a clue.
- A checkpoint is gated on its module's lessons; submitting before that returns 403.
- A submission faster than 15 s is recorded as 0 study minutes, so analytics cannot be inflated.
- An answer whose option does not belong to the question is rejected with 400.
- A submission is only readable by its owner (404 otherwise); unauthenticated access is 401.

Tests performed (`test-assess.mjs`, against `NODE_ENV=production` on :4180)
| Check | Result |
| --- | --- |
| Signup, then list course checkpoints | 200, gate closed 0/3 |
| Payload leaks `correctOptionId` | no |
| Submit before finishing the module | 403 `forbidden` |
| Complete the 3 module lessons → gate | opens 3/3 |
| Partial attempt | 201, 40–60%, not passed, duration 120 s |
| Review contains explanations and matches the score | yes |
| Perfect attempt | 201, 100%, passed, attempt 2, achievement `first-assessment` awarded |
| Empty attempt | 201, 0/5, `answeredCount` 0 |
| Option id from another question | 400 `invalid_request` |
| Stored attempt read back | 200, review intact |
| `/api/assessments/mine` | 200, 3 attempts |
| Another user reading the submission | 404 `not_found` |
| Unauthenticated request | 401 `unauthenticated` |
| Browser run (desktop + 390 px) | screenshots 30–36, **no console errors** |

- `GET /api/analytics/overview` returns the stored attempts (3 rows, with `percent`), so the
  analytics page shows checkpoints from real submissions.

Remaining issues
- Signup is rate-limited to 8/hour per IP, so repeated test signups from one machine block
  themselves; tests clear `rate_limits` before running. This is intended behaviour, not a bug.
- The checkpoint timer is a guide: at zero the attempt is submitted rather than discarded, and
  the server does not reject a late submission. A hard server-side time limit is not implemented.
