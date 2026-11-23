PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ───────────────────────── identity ─────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','moderator','admin')),
  email_verified_at TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at      TEXT
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL,
  headline         TEXT,
  bio              TEXT,
  avatar_color     TEXT NOT NULL DEFAULT 'sand',
  country          TEXT,
  goal             TEXT,
  experience_level TEXT DEFAULT 'beginner',
  onboarded_at     TEXT,
  location         TEXT,
  website          TEXT,
  is_public        INTEGER NOT NULL DEFAULT 1,
  updated_at       TEXT
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme               TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  editor_font_size    INTEGER NOT NULL DEFAULT 13,
  email_notifications INTEGER NOT NULL DEFAULT 1,
  reduced_motion      INTEGER NOT NULL DEFAULT 0,
  code_font           TEXT NOT NULL DEFAULT 'mono',
  weekly_goal_minutes INTEGER NOT NULL DEFAULT 180,
  email_digest        INTEGER NOT NULL DEFAULT 1,
  updated_at          TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('verify_email','reset_password')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_tokens_user_kind ON auth_tokens(user_id, kind);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(provider, subject)
);

-- ───────────────────────── curriculum ─────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  tagline        TEXT NOT NULL,
  description    TEXT NOT NULL,
  level          TEXT NOT NULL,
  duration_hours INTEGER NOT NULL,
  category       TEXT NOT NULL,
  icon           TEXT NOT NULL,
  sort_order     INTEGER NOT NULL,
  is_published   INTEGER NOT NULL DEFAULT 1,
  outcomes_json  TEXT NOT NULL DEFAULT '[]',
  prereqs_json   TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS course_modules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  title      TEXT NOT NULL,
  summary    TEXT NOT NULL,
  level      TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  UNIQUE(course_id, slug)
);

CREATE TABLE IF NOT EXISTS lessons (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id        INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  kind             TEXT NOT NULL DEFAULT 'reading',
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  sort_order       INTEGER NOT NULL,
  objectives_json  TEXT NOT NULL DEFAULT '[]',
  body_md          TEXT NOT NULL,
  code_json        TEXT NOT NULL DEFAULT '[]',
  UNIQUE(module_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);

CREATE TABLE IF NOT EXISTS learning_resources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  provider    TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'video',
  license_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_resources_lesson ON learning_resources(lesson_id);

CREATE TABLE IF NOT EXISTS exercises (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id    INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  prompt_md    TEXT NOT NULL,
  language     TEXT NOT NULL DEFAULT 'python',
  starter_code TEXT NOT NULL DEFAULT '',
  solution     TEXT NOT NULL DEFAULT '',
  test_json    TEXT NOT NULL DEFAULT '[]',
  difficulty   TEXT NOT NULL DEFAULT 'easy',
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_exercises_course ON exercises(course_id);

CREATE TABLE IF NOT EXISTS assessments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id           INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id           INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('module','final')),
  pass_score          INTEGER NOT NULL DEFAULT 70,
  time_limit_minutes  INTEGER NOT NULL DEFAULT 15,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  prompt        TEXT NOT NULL,
  explanation   TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON questions(assessment_id);

CREATE TABLE IF NOT EXISTS question_options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  is_correct  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  brief_md    TEXT NOT NULL,
  difficulty  TEXT NOT NULL DEFAULT 'intermediate',
  est_hours   INTEGER NOT NULL DEFAULT 8
);

CREATE TABLE IF NOT EXISTS user_projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','building','done')),
  notes        TEXT,
  repo_url     TEXT,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT,
  UNIQUE(user_id, project_id)
);

-- ───────────────────────── learning record ─────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_accessed_at TEXT,
  completed_at     TEXT,
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  seconds_spent INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);

CREATE TABLE IF NOT EXISTS submissions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id    INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  score            INTEGER NOT NULL,
  max_score        INTEGER NOT NULL,
  passed           INTEGER NOT NULL DEFAULT 0,
  answers_json     TEXT NOT NULL DEFAULT '{}',
  started_at       TEXT,
  submitted_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  duration_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id, assessment_id);

CREATE TABLE IF NOT EXISTS coding_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
  lesson_id   INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  language    TEXT NOT NULL,
  code        TEXT NOT NULL,
  stdin       TEXT NOT NULL DEFAULT '',
  stdout      TEXT NOT NULL DEFAULT '',
  stderr      TEXT NOT NULL DEFAULT '',
  exit_code   INTEGER,
  status      TEXT NOT NULL DEFAULT 'error' CHECK (status IN ('ok','error','timeout')),
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_total  INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_coding_user ON coding_sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, lesson_id)
);

-- ───────────────────────── AI ─────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id  INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  title      TEXT NOT NULL DEFAULT 'New conversation',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_aiconv_user ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  citations_json  TEXT NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_aimsg_conv ON ai_messages(conversation_id);

CREATE TABLE IF NOT EXISTS ai_chunks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ord       INTEGER NOT NULL,
  heading   TEXT,
  content   TEXT NOT NULL,
  terms     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aichunks_course ON ai_chunks(course_id);

-- ───────────────────────── community ─────────────────────────
CREATE TABLE IF NOT EXISTS community_groups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'messages'
);

CREATE TABLE IF NOT EXISTS community_posts (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id            INTEGER NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  author_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind                TEXT NOT NULL DEFAULT 'thread' CHECK (kind IN ('thread','question','showcase')),
  title               TEXT NOT NULL,
  body_md             TEXT NOT NULL,
  tags                TEXT NOT NULL DEFAULT '',
  score               INTEGER NOT NULL DEFAULT 0,
  comment_count       INTEGER NOT NULL DEFAULT 0,
  accepted_comment_id INTEGER,
  is_pinned           INTEGER NOT NULL DEFAULT 0,
  is_removed          INTEGER NOT NULL DEFAULT 0,
  deleted_at          TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_group ON community_posts(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  INTEGER REFERENCES community_comments(id) ON DELETE CASCADE,
  body_md    TEXT NOT NULL,
  score      INTEGER NOT NULL DEFAULT 0,
  is_removed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments(post_id);

CREATE TABLE IF NOT EXISTS post_votes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  value   INTEGER NOT NULL CHECK (value IN (-1,1)),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comment_votes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  value      INTEGER NOT NULL CHECK (value IN (-1,1)),
  PRIMARY KEY (user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS community_reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id   INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ───────────────────────── aptitude ─────────────────────────
CREATE TABLE IF NOT EXISTS aptitude_topics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL CHECK (category IN ('quant','logical','verbal','analytical','di','placement')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  lesson_md   TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS aptitude_questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id      INTEGER NOT NULL REFERENCES aptitude_topics(id) ON DELETE CASCADE,
  difficulty    TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard')),
  prompt        TEXT NOT NULL,
  options_json  TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aq_topic ON aptitude_questions(topic_id, difficulty);

CREATE TABLE IF NOT EXISTS aptitude_attempts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('practice','mock')),
  topic_id         INTEGER REFERENCES aptitude_topics(id) ON DELETE SET NULL,
  started_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at      TEXT,
  score            INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  config_json      TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON aptitude_attempts(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS aptitude_answers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id   INTEGER NOT NULL REFERENCES aptitude_attempts(id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES aptitude_questions(id) ON DELETE CASCADE,
  chosen_index INTEGER,
  is_correct   INTEGER NOT NULL DEFAULT 0,
  time_ms      INTEGER NOT NULL DEFAULT 0,
  UNIQUE(attempt_id, question_id)
);

-- ───────────────────────── engagement ─────────────────────────
CREATE TABLE IF NOT EXISTS motivation_lines (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  text   TEXT NOT NULL UNIQUE,
  author TEXT NOT NULL DEFAULT 'Lumen'
);

CREATE TABLE IF NOT EXISTS daily_motivations (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  line_id  INTEGER NOT NULL REFERENCES motivation_lines(id) ON DELETE CASCADE,
  shown_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS achievements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  icon          TEXT NOT NULL,
  criteria_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  awarded_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS learning_recommendations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   INTEGER,
  target_slug TEXT,
  title       TEXT NOT NULL,
  reason      TEXT NOT NULL,
  score       REAL NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, kind, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS activity_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  ref_type   TEXT,
  ref_id     INTEGER,
  minutes    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS goals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  target_date  TEXT,
  target_type  TEXT NOT NULL DEFAULT 'lessons',
  target_value INTEGER NOT NULL DEFAULT 5,
  progress     INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','archived')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ───────────────────────── migrations ─────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  id         TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ─────────────────── curriculum roadmaps (Phase 3) ───────────────────
-- A roadmap is the student-visible journey of a course: named stages, the modules
-- inside each stage, and the workload behind them. It is data so the course page
-- can render it before enrolment and the plan engine can turn it into daily work.
CREATE TABLE IF NOT EXISTS curriculum_roadmaps (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id            INTEGER NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  audience             TEXT NOT NULL DEFAULT '',
  capstone             TEXT NOT NULL DEFAULT '',
  assessment_plan_json TEXT NOT NULL DEFAULT '[]',
  estimated_hours_json TEXT NOT NULL DEFAULT '{}',
  source_json          TEXT NOT NULL DEFAULT '{}',
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS roadmap_stages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  roadmap_id INTEGER NOT NULL REFERENCES curriculum_roadmaps(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  title      TEXT NOT NULL,
  summary    TEXT NOT NULL DEFAULT '',
  goal       TEXT NOT NULL DEFAULT '',
  skills_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(roadmap_id, key)
);

CREATE TABLE IF NOT EXISTS roadmap_modules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id   INTEGER NOT NULL REFERENCES roadmap_stages(id) ON DELETE CASCADE,
  module_id  INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(stage_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_modules_module ON roadmap_modules(module_id);

-- ─────────────────── learning plans (Phase 4) ───────────────────
-- One active plan per user per course. Targets are generated from real lesson
-- durations, and are only ever marked complete when the lesson actually is.
CREATE TABLE IF NOT EXISTS learning_plans (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id          INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','abandoned')),
  minutes_per_day    INTEGER NOT NULL DEFAULT 60,
  days_per_week      INTEGER NOT NULL DEFAULT 5,
  study_days_json    TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  start_date         TEXT NOT NULL,
  target_date        TEXT,
  skill_level        TEXT NOT NULL DEFAULT 'beginner',
  reminder_time      TEXT NOT NULL DEFAULT '19:00',
  timezone           TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  total_minutes      INTEGER NOT NULL DEFAULT 0,
  completed_minutes  INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_plans_active
  ON learning_plans(user_id, course_id) WHERE status IN ('active','paused');

CREATE TABLE IF NOT EXISTS learning_plan_targets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id       INTEGER NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  scheduled_for TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'lesson' CHECK (kind IN ('lesson','practice','revision','assessment','project','milestone')),
  lesson_id     INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
  project_slug  TEXT,
  title         TEXT NOT NULL,
  minutes       INTEGER NOT NULL DEFAULT 25,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','missed','skipped')),
  completed_at  TEXT,
  moved_from    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(plan_id, scheduled_for, kind, title)
);
CREATE INDEX IF NOT EXISTS idx_plan_targets_plan_date ON learning_plan_targets(plan_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_plan_targets_lesson ON learning_plan_targets(lesson_id);

-- ─────────────────── notifications (Phase 5 + 7) ───────────────────
CREATE TABLE IF NOT EXISTS reminder_preferences (
  user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone            TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  reminder_time       TEXT NOT NULL DEFAULT '19:00',
  quiet_hours_start   TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end     TEXT NOT NULL DEFAULT '07:00',
  in_app_enabled      INTEGER NOT NULL DEFAULT 1,
  email_enabled       INTEGER NOT NULL DEFAULT 1,
  push_enabled        INTEGER NOT NULL DEFAULT 0,
  study_reminders     INTEGER NOT NULL DEFAULT 1,
  streak_reminders    INTEGER NOT NULL DEFAULT 1,
  assessment_reminders INTEGER NOT NULL DEFAULT 1,
  event_reminders     INTEGER NOT NULL DEFAULT 1,
  weekly_summary      INTEGER NOT NULL DEFAULT 1,
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'system',
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  link       TEXT,
  dedupe_key TEXT,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Scheduled work: computed ahead of time, delivered by the worker, never by a tab.
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'study',
  channel       TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','push')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  link          TEXT,
  dedupe_key    TEXT NOT NULL,
  send_at       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  sent_at       TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_dedupe ON scheduled_notifications(user_id, dedupe_key);
CREATE INDEX IF NOT EXISTS idx_scheduled_due ON scheduled_notifications(status, send_at);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  scheduled_id    INTEGER REFERENCES scheduled_notifications(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('delivered','failed','skipped')),
  detail          TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_deliveries_notification ON notification_deliveries(notification_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ─────────────────── competitions & events (Phase 6) ───────────────────
CREATE TABLE IF NOT EXISTS competitions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  summary        TEXT NOT NULL DEFAULT '',
  description_md TEXT NOT NULL DEFAULT '',
  course_id      INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','announced','live','closed','published')),
  registration_opens_at  TEXT,
  registration_closes_at TEXT,
  starts_at      TEXT,
  ends_at        TEXT,
  rules_md       TEXT NOT NULL DEFAULT '',
  eligibility_md TEXT NOT NULL DEFAULT '',
  max_participants INTEGER,
  format         TEXT NOT NULL DEFAULT 'code' CHECK (format IN ('code','quiz')),
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status, starts_at);

CREATE TABLE IF NOT EXISTS competition_challenges (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  prompt_md      TEXT NOT NULL,
  language       TEXT NOT NULL DEFAULT 'python',
  starter_code   TEXT NOT NULL DEFAULT '',
  test_json      TEXT NOT NULL DEFAULT '[]',
  options_json   TEXT NOT NULL DEFAULT '[]',
  correct_index  INTEGER,
  explanation    TEXT NOT NULL DEFAULT '',
  points         INTEGER NOT NULL DEFAULT 100,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(competition_id, slug)
);

CREATE TABLE IF NOT EXISTS competition_registrations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  withdrawn_at   TEXT,
  UNIQUE(competition_id, user_id)
);

CREATE TABLE IF NOT EXISTS competition_submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  challenge_id   INTEGER NOT NULL REFERENCES competition_challenges(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  language       TEXT NOT NULL DEFAULT 'python',
  score          INTEGER NOT NULL DEFAULT 0,
  max_score      INTEGER NOT NULL DEFAULT 0,
  passed         INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'graded' CHECK (status IN ('pending','graded','error')),
  detail_json    TEXT NOT NULL DEFAULT '[]',
  submitted_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_comp_submissions_user ON competition_submissions(competition_id, user_id);

CREATE TABLE IF NOT EXISTS competition_results (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score          INTEGER NOT NULL DEFAULT 0,
  max_score      INTEGER NOT NULL DEFAULT 0,
  rank           INTEGER,
  published_at   TEXT,
  UNIQUE(competition_id, user_id)
);

-- ─────────────────── competencies (Phase 8) ───────────────────
-- Evidence, not lesson counts: a competency is demonstrated by an assessment,
-- a project or a completed challenge, and each row records which.
CREATE TABLE IF NOT EXISTS competencies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT '',
  weight      TEXT NOT NULL DEFAULT 'core',
  evidence_ref TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(course_id, key)
);

CREATE TABLE IF NOT EXISTS competency_evidence (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id  INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('assessment','project','challenge','self')),
  ref_type       TEXT,
  ref_id         INTEGER,
  score          REAL,
  passed         INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, competency_id, kind, ref_type, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_competency_evidence_user ON competency_evidence(user_id);
