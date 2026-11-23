# Lumen — System Architecture

> A free-to-access technology learning ecosystem.
> Philosophy: **LEARN → UNDERSTAND → PRACTICE → BUILD → EVALUATE → IMPROVE**

---

## 1. Architectural style

Lumen is a **modular monolith** with a hard boundary around the one genuinely dangerous
operation: executing student code.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser (React SPA)                                                      │
│  Landing · Auth · Dashboard · Academy · Lesson view · Lab (Monaco)       │
│  AI Tutor · Community · Aptitude · Analytics · Settings                  │
└───────────────┬──────────────────────────────────────────────────────────┘
                │  HTTPS  /api/*   (httpOnly session cookie)
┌───────────────▼──────────────────────────────────────────────────────────┐
│ Application server (Node 24 / Express 5)                                  │
│                                                                          │
│  middleware: helmet-ish headers · cookie session · RBAC · rate limit ·    │
│              zod-style validation · request id · error logger             │
│                                                                          │
│  routes/  auth · users · courses · progress · lab · ai · community ·      │
│           aptitude · analytics · recommendations · admin                  │
│  lib/     sessions · password (scrypt) · mailer · rate-limit · validate   │
│  content/ seeded curriculum (courses, lessons, questions, motivations)    │
│  db/      schema.sql · migrate · query helpers                            │
└───────────────┬───────────────────────────────┬──────────────────────────┘
                │ SQL (WAL, FK on)              │ JSON over localhost socket
┌───────────────▼───────────────┐   ┌───────────▼──────────────────────────┐
│ SQLite (dev) → PostgreSQL      │   │ Execution service (sandbox worker)   │
│ (prod, same SQL dialect via    │   │  • per-run temp dir, auto-deleted    │
│  the db/ adapter)              │   │  • CPU / wall-clock timeout          │
└───────────────────────────────┘   │  • memory cap                        │
                                    │  • no network (netns / seccomp)      │
                                    │  • non-root uid, read-only rootfs    │
                                    │  • output truncation                 │
                                    └──────────────────────────────────────┘
```

**Why a modular monolith.** The product surface is large but the domain is one: a student's
learning record. Splitting into microservices now would add operational cost without adding
capability. Each route module is written so it can be lifted into its own service later
(no cross-module SQL joins that would not survive the split; all data access goes through
`db/` query helpers).

**Why the sandbox is separate from day one.** Requirement §8: student code must never run on
the application server. The app server only *enqueues* a run and *reads back* the result; the
worker is the only process that touches an untrusted byte of code.

---

## 2. Layer responsibilities

| Layer | Responsibility | Never does |
|---|---|---|
| SPA | rendering, optimistic UI, client validation for UX | decide permissions, hold secrets, compute progress |
| API routes | authn/authz, validation, transactions, shaping | run untrusted code, render HTML |
| lib | password hashing, sessions, mail, rate limits | know about HTTP responses |
| db | schema, migrations, typed query helpers | business rules |
| sandbox worker | execute code in isolation | touch the app database (it receives no credentials) |
| content seeders | idempotent curriculum data | overwrite student progress |

---

## 3. Authentication architecture

- **Password storage**: `scrypt` (N=2^15, r=8, p=1, 64-byte key) with a 16-byte random salt,
  constant-time comparison. Format `scrypt$N$r$p$salt$hash`, so parameters can be raised later
  without breaking old hashes.
- **Sessions**: opaque 32-byte random token, stored **hashed (SHA-256)** in `sessions`.
  Cookie: `HttpOnly; SameSite=Lax; Secure` (in production), 30-day sliding expiry.
  No JWT — revocation must be instant (requirement §4 "session management").
- **Email verification**: single-use token (hashed at rest, 24 h TTL). Unverified accounts may
  browse but cannot post to the community (spam control) — a soft gate, never a paywall.
- **Password reset**: single-use token, 60 min TTL, all other sessions revoked on success.
- **Rate limiting**: fixed-window counters in SQLite (survive restarts, work across workers):
  login 10/15 min per IP+email, register 5/h per IP, reset 5/h, AI 40/day per user,
  code runs 60/10 min per user, community posts 10/10 min per user.
- **RBAC**: `users.role ∈ {student, moderator, admin}`. A single `requireRole()` guard;
  moderation endpoints additionally check ownership (author or moderator).
- **Social login**: an OAuth provider interface (`lib/oauth.js`) with Google/GitHub adapters.
  Without `OAUTH_*` env vars the buttons are hidden and the route returns
  `501 { code: "oauth_not_configured" }` — an integration-ready interface, never a fake success.

---

## 4. Request lifecycle

```
request
  → requestId + security headers
  → body parse (limit 1 MB)
  → rate limit (per route class)
  → session resolve (cookie → hash → sessions row → user)
  → route guard (public | authed | role)
  → schema validation (validate.js) → 422 with field errors
  → handler (db transaction where multiple writes)
  → response envelope  { ok: true, data } | { ok: false, error: { code, message, fields } }
  → error logger (structured JSON, no PII, no secrets)
```

Every mutation that changes learning state is written inside a transaction and is idempotent
where it can be (unique constraints on `lesson_progress(user_id, lesson_id)`,
`enrollments(user_id, course_id)`, `aptitude_attempts.id`), so a double-click cannot
double-count progress.

---

## 5. AI subsystem (Phase 4)

```
POST /api/ai/chat { courseId, lessonId, message, code? }
  → context assembly
       system policy (tutor persona, Socratic rules, safety)
       + course / module / lesson metadata
       + retrieved chunks (RAG over lesson content + code examples)
       + student state (completed lessons, weak concepts, current exercise)
  → provider adapter (lib/ai-providers.js)
       OpenAI-compatible chat completions  (OPENAI_API_KEY | any compatible base URL)
       Anthropic messages API              (ANTHROPIC_API_KEY)
       none configured → 503 ai_not_configured (UI shows setup instructions)
  → stream back to the client, persist conversation + message rows
```

**RAG**: lesson bodies are chunked (~800 chars, 100-char overlap) into `ai_chunks` at seed time;
retrieval is BM25-style term scoring in SQLite (no external vector DB dependency). Swapping in
pgvector or an embeddings API is a single module (`lib/retrieval.js`).

**Teaching policy** (in the system prompt, enforced, not decorative): never output a full
solution before the student has attempted; give the smallest useful hint; ask a guiding
question; when explaining an error, name the line and the *cause*; end with a check-for-understanding.

**Cost control without charging students**: per-user daily message cap, max 12k characters of
retrieved context, max 900 output tokens, conversation truncation to the last 12 turns.

---

## 6. Code execution architecture (Phase 3)

```
client → POST /api/lab/run
       → rate limit + ownership check of the exercise
       → sandbox client sends { language, files, stdin, limits } over a unix socket / localhost
       → worker: creates run dir under os.tmpdir(), writes files, spawns runtime with:
            timeout (default 5000 ms, hard 15000 ms)
            maxBuffer (1 MB stdout / 1 MB stderr, truncated)
            env = minimal allow-list (no secrets)
            uid/gid drop (POSIX), `--network=none` semantics where available
            cwd = run dir only; deleted in `finally`
       → { stdout, stderr, exitCode, timedOut, durationMs }
       → persisted to coding_sessions; test-case results computed by comparing outputs
```

**Isolation levels** (documented honestly — the app degrades to a weaker level and says so):

| Level | How | When |
|---|---|---|
| L0 `process` | child_process with timeout, memory cap, sanitised env, temp cwd | local dev, single-tenant |
| L1 `container` | `docker run --rm --network=none --memory=256m --cpus=.5 --read-only --user 1000` | recommended production |
| L2 `gvisor/firecracker` | microVM per run | multi-tenant public deployment |

`SANDBOX_MODE` env var selects the level; `/api/lab/health` reports which one is active so the
UI never claims a guarantee it does not have. Phase 7 (deployment) is where L1/L2 are wired.

---

## 7. Scalability plan

- **Stateless app tier** (sessions in DB, no in-memory state) → horizontal scaling behind a
  load balancer.
- **SQLite now, PostgreSQL later**: all access goes through `db/index.js`; the schema uses only
  portable SQL (no SQLite-only types beyond `TEXT/INTEGER` affinities), WAL mode, explicit indexes.
- **Read-heavy pages** (catalogue, analytics) are the first candidates for caching headers.
- **Sandbox** scales independently: N workers, one queue, per-user concurrency 1.
- Content is seeded, versioned and idempotent, so deploying a curriculum update is a restart.

---

## 8. Security controls checklist

| Requirement | Control |
|---|---|
| No plaintext passwords | scrypt, salted, constant-time compare |
| Server-side authorization | every route declares a guard; ownership checks in handlers |
| Input validation | `lib/validate.js` schemas, 422 with field errors, length + enum + int bounds |
| SQL injection | parameterised statements only, no string-built SQL |
| XSS | React escaping; no `dangerouslySetInnerHTML`; CSP header |
| CSRF | SameSite=Lax cookie + `Origin` check on state-changing methods |
| Secrets | env only, `.env` gitignored, never sent to client; `/api/config` exposes booleans |
| Rate limiting | per-route-class counters in DB |
| Untrusted code | isolated worker, resource caps, no network, cleanup |
| Logging | structured JSON with request id; errors logged server-side, generic message to client |
| Headers | CSP, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, HSTS in prod |
| Backups | `scripts/backup.sh` — SQLite `.backup` + timestamped retention |

---

## 9. Deliberate non-goals / known dependencies

- Real video hosting is not redistributed. Lessons embed *links* to officially published,
  freely available resources plus original written material (§6).
- GPU notebooks (Deep Learning) need external infrastructure; the lab exposes the notebook
  surface and reports `gpu: false` from the worker health endpoint rather than pretending.
- Email delivery uses SMTP when configured; otherwise verification links are written to
  `server/.mail-outbox/` and surfaced in dev mode only.
