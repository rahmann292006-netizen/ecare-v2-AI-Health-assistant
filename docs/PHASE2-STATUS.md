# Phase 2 — Content quality and the AI tutor

Last updated: 2026-11-16. Everything below is what was **measured**, not intended.

## 1. Course content — honest completion table

Counting method: `scripts/qa-extract.mjs` plus a direct database query
(`lessons.body_md` must contain all 12 section headings). A lesson counts as
complete only when it has the full 12-section structure **and** a stored
knowledge check with explanations.

| Course | Lessons | Upgraded to full standard | Status |
| --- | --- | --- | --- |
| Python Programming | 9 | **9** | ✅ complete |
| Data Structures & Algorithms | 8 | **8** | ✅ complete |
| Generative AI | 7 | **7** | ✅ complete |
| Full-Stack Development | 8 | 0 | ⏳ pending |
| Machine Learning | 6 | 0 | ⏳ pending |
| Agentic AI | 5 | 0 | ⏳ pending |
| Deep Learning | 6 | 0 | ⏳ pending |
| Cybersecurity | 6 | 0 | ⏳ pending |
| Cloud & DevOps | 6 | 0 | ⏳ pending |
| Data Science | 6 | 0 | ⏳ pending |
| Database Engineering | 6 | 0 | ⏳ pending |
| System Design | 4 | 0 | ⏳ pending |
| **Total** | **77** | **24** | **31% upgraded** |

The 53 lessons in the pending courses still load, render, mark complete and
count towards progress — they are simply still in the earlier, shorter format.
Nothing was lost: upgrades are applied **in place by `lessons.id`**, so progress,
enrolments, notes, bookmarks and assessment attempts survive.

### Standard each upgraded lesson meets

1. Curiosity-driven title with a real, specific failure in it.
2. *The situation* — a concrete workplace scenario.
3. *What you can do afterwards* — measurable outcomes.
4. *The idea, in plain words*.
5. *The terms, precisely* — accurate definitions.
6. *Walk through it* — runnable code and its **actual** printed output.
7. *Where this shows up* — real products and jobs.
8. *Mistakes worth avoiding*.
9. *Practise now* — exercises.
10. *Check yourself* — questions with answers.
11. *Challenge* — a larger open task.
12. *In one paragraph* + *Go further* — summary and real reading.

Every lesson also gets a **knowledge check** (3 questions, server-side grading,
explanations after submit, answers never sent before submit).

Difficulty progression: beginner → intermediate → advanced across each course
(e.g. Python: how-it-runs → types → control flow → collections → functions →
classes → exceptions → packaging → testing/project).

## 2. Database state after the content work

Verified with direct SQL immediately after the last upgrade run:

| Table | Before | After | Note |
| --- | --- | --- | --- |
| `lessons` | 77 | 77 | unchanged — updates in place |
| `lesson_progress` | 18 | 18 | unchanged — student progress preserved |
| `submissions` | 30 | 30 | unchanged — attempts preserved |
| `enrollments` | 9 | 9 | unchanged |
| `assessments` | 29 | 36 | +7 Generative AI knowledge checks |
| `questions` | ~90 | 123 | +33 Generative AI questions |
| `ai_chunks` | 536 | 613 | +77 re-indexed chunks for the tutor |
| `foreign_key_check` | 0 | 0 | no broken references |

Backups: `server/data/backups/lumen-pre-dsa-*.db` (before DSA),
take a further `cp` before the next bulk upgrade.

## 3. Frontend verification (real browser, Playwright)

Run against the production build on `http://localhost:4180` with a real signed-in
account. Screenshots in `$TMPDIR/shots/`.

| Check | Result |
| --- | --- |
| Generative AI lesson page renders the full body | ✅ 42-genai-rag.png |
| DSA lesson renders code, output, quiz, exercises | ✅ 45-quiz-review.png |
| Knowledge check: 3 questions load, answers hidden until submit | ✅ |
| Wrong answers → 0/3, correct answers shown with explanations | ✅ |
| Course page shows modules, lessons, checkpoint gating | ✅ 40-dsa-course.png |
| Mobile (390px) lesson layout, no horizontal overflow | ✅ 46-mobile-genai-lesson.png |
| Console errors during lesson + quiz flow | only a 401 from the honest `/ai/status` probe |

**Bug found and fixed during this verification:** the SPA fallback served
`index.html` for stale `/assets/*` requests, so after a rebuild the browser got
HTML with a JS MIME type and the app rendered *nothing* (`#root` empty). Fixed in
`server/index.js`: unknown `/assets/` paths now return 404 text, and the shell is
re-read when it changes on disk, so a rebuild no longer needs a restart.

## 4. AI Tutor — honest status

| Piece | State |
| --- | --- |
| Provider-agnostic client (`server/lib/ai-provider.js`) | ✅ implemented |
| RAG over course content (`server/lib/ai-rag.js`, BM25 + lesson boost) | ✅ implemented, 613 chunks indexed |
| Citations (deduped by chunk, full metadata) | ✅ verified by `test-ai2.mjs` |
| Modes: explain / hint / debug, follow-ups, streaming SSE | ✅ verified by `test-ai2.mjs` |
| Honest config states (`configured` / `verified` / `ready`) | ✅ |
| Setup card in the UI when no key is valid | ✅ |
| **Live answers from a real provider** | ❌ **blocked** |

**Blocker:** the `OPENAI_API_KEY` in `.env` is real in shape but expired — the
provider returns HTTP 401 `expired_secret_key`. So `/api/ai/status` reports
`configured: true, verified: false, ready: false`, the UI shows the setup card and
`/api/ai/chat` returns an honest 503. Nothing is faked: the assistant never
answers when the provider cannot.

**To finish this:** put a working key in `.env` as `OPENAI_API_KEY=sk-...`
(optionally `OPENAI_BASE_URL`, `AI_MODEL`), restart the server, then run
`node test-ai2.mjs` and a browser pass over `/tutor`. A local stub on port 4199
was used only to prove the wiring; it is never used in production.

## 5. Reproduce this verification

```bash
# 1. apply content upgrades (idempotent, updates lessons in place)
node scripts/upgrade-content.mjs

# 2. API + content contract tests (31 checks)
node test-content.mjs

# 3. AI wiring tests (needs a working provider key for live answers)
node test-ai2.mjs

# 4. browser pass over the built app
npm run build
NODE_ENV=production PORT=4180 node server/index.js
node shoot6.mjs        # writes screenshots to $TMPDIR/shots
```

Screenshots from the last run are committed in `docs/screenshots/`.
