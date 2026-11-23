# Lumen — Sitemap, Core Journeys & Integration Map

## 1. Sitemap

```
/                               Landing (public)
/signup                         Create account
/login                          Sign in
/verify-email                   Token landing for verification
/forgot-password                Request reset
/reset-password                 Token landing for reset

— app shell (authenticated) —
/dashboard                      Student dashboard
/learn                          Course academy (12 courses, filters, search)
/learn/:courseSlug              Course overview (modules, objectives, progress)
/learn/:courseSlug/:lessonSlug  Lesson workspace (3-column + bottom actions)
/learn/:courseSlug/assessment/:assessmentId   Module / final assessment runner

/lab                            Lab home (8 environments)
/lab/:env                       Editor + terminal + tests
/lab/history                    Execution history

/tutor                          AI doubt-clearing assistant
/tutor/:conversationId

/community                      Groups index
/community/:groupSlug           Threads (search, filter, sort)
/community/:groupSlug/:postId   Thread + comments + accepted answer
/community/new                  Compose (thread / question / showcase)

/aptitude                       Aptitude academy (6 categories)
/aptitude/:topicSlug            Topic practice
/aptitude/mock                  Timed mock examination
/aptitude/results/:attemptId    Answer review + explanations

/progress                       Analytics (charts, streaks, achievements)
/settings                       Account, profile, preferences, sessions, security
/admin                          Moderation queue (moderator/admin only)
```

404 and error boundaries exist for every route; every list has loading / empty / error states.

## 2. Core user journeys

**J1 — First session (≈90 s)**
Landing → Sign up → verification link written to outbox (or SMTP) → onboarding:
pick goal + experience → dashboard seeded with recommended first lesson →
"Continue learning" card → lesson → mark complete → progress row written → streak starts.

**J2 — Daily study loop**
Dashboard shows today's motivation (persisted per user+date), continue card, streak,
and next-up recommendations → lesson → practice exercise in lab → run code → tests pass →
submission stored → recommendation updated → analytics reflect it.

**J3 — Doubt resolution**
Inside a lesson → AI tutor panel (lesson context pre-attached) → ask → streamed answer with
retrieved lesson excerpts cited → "Explain this error" from the lab passes the code + stderr →
tutor responds with the smallest fix, not the full solution.

**J4 — Placement prep**
Aptitude → category → topic lesson + practice (instant explanation) → timed mock (20 Q / 25 min)
→ results page with per-category accuracy, weakness detection → dashboard shows recommended
weak-topic drill.

**J5 — Community**
Community → course group → ask question → another student answers → author marks accepted →
score updates → notifications via dashboard activity feed.

**J6 — Assessment gating**
Course overview → complete module lessons → module assessment unlocks (prerequisite check
server-side, not just UI) → pass ≥ 70 % → module marked complete → next module unlocks.
Students may still open any lesson (user control) but recommendations respect prerequisites.

## 3. Integration map

| Capability | Provider | Env vars | If absent |
|---|---|---|---|
| Email (verify / reset) | SMTP | `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | link written to `server/.mail-outbox/*.eml`, dev banner shows it |
| AI tutor | OpenAI-compatible | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `AI_MODEL` | 503 + setup card in UI |
| AI tutor (alt) | Anthropic | `ANTHROPIC_API_KEY`, `AI_MODEL` | falls back to OpenAI adapter |
| Social login | Google / GitHub OAuth | `OAUTH_GOOGLE_*`, `OAUTH_GITHUB_*` | buttons hidden, 501 from route |
| Code execution | local worker (L0) / Docker (L1) | `SANDBOX_MODE`, `SANDBOX_DOCKER_IMAGE` | L0 with honest capability report |
| Database | SQLite (dev) / PostgreSQL (prod) | `DATABASE_URL` | SQLite file at `server/data/lumen.db` |

Nothing in the table is simulated: when a provider is absent the UI says so and explains the
one env var needed.

## 4. Design system — "Lumen Editorial"

Two themes, one layout. No neon, no violet, no glow, no glassmorphism.

### Tokens

| Token | Obsidian Light | Midnight Dark |
|---|---|---|
| `--bg` | `#FAF9F6` (warm off-white) | `#0F1011` |
| `--bg-subtle` | `#F4F2ED` | `#151617` |
| `--surface` | `#FFFFFF` | `#191A1C` |
| `--surface-2` | `#FBFaf8` | `#1F2023` |
| `--border` | `#E6E3DB` | `#2A2B2E` |
| `--border-strong` | `#D6D2C7` | `#3A3B3F` |
| `--text` | `#1C1B19` | `#EDEBE7` |
| `--text-muted` | `#6B6862` | `#9A968F` |
| `--text-faint` | `#8F8B84` | `#7A766F` |
| `--accent` | `#B4561E` (restrained amber) | `#E08A3C` |
| `--accent-soft` | `#F7EDE3` | `#2A2118` |
| `--success` | `#2F6B4F` | `#6FBF97` |
| `--warn` | `#8A6A12` | `#D8B65B` |
| `--danger` | `#9B3B2E` | `#E08C7E` |

Contrast: text/bg ≥ 12:1, muted/bg ≥ 4.6:1 in both themes (WCAG AA at minimum, AA+ for body).

### Type
- Family: `Inter` (variable), fallback `-apple-system, "Segoe UI", Roboto, sans-serif`.
- Mono: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`.
- Scale: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 px. Body 15px, line-height 1.6.
- Headings: 600 weight, tight tracking (-0.02em). Never larger than 36px in app chrome.

### Space & shape
- 4px base grid: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72.
- Radius: 6px (inputs, buttons), 10px (cards), 14px (modals, hero panels). Pills fully round.
- Borders: 1px solid, never shadows for structure. Shadows only for overlays (`0 8px 24px rgba(0,0,0,.08)`).
- Motion: 120–180 ms ease-out on colour/opacity/transform ≤ 2px. Respects `prefers-reduced-motion`.

### Components
`Button` (primary/secondary/ghost/danger, sm/md/lg), `Input`, `Textarea`, `Select`, `Checkbox`,
`Card`, `Stat`, `ProgressBar`, `Ring`, `Badge`, `Tabs`, `Modal`, `Drawer`, `Toast`,
`EmptyState`, `Skeleton`, `Table`, `Sidebar nav`, `Breadcrumb`, `CodeBlock`, `ChartFrame`.

### Chart palette (restrained, 6 series)
`#B4561E`, `#4A6B5C`, `#6B6862`, `#A8894F`, `#5A6B7A`, `#8A5C4A` — same hues, lifted
luminance in dark mode. Grid lines at 8 % opacity of `--text`. No gradients under lines.

### Accessibility
- Focus ring: 2px `--accent` offset 2px, visible on every interactive element.
- All icons paired with text or `aria-label`. Live regions for async results.
- Editor/terminal keep ≥ 4.5:1 on their own background tokens (`--editor-bg`).
