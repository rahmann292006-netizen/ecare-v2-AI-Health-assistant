# Lumen — Database Design

Portable SQL (SQLite in dev, PostgreSQL in prod). WAL, `PRAGMA foreign_keys=ON`,
`busy_timeout=5000`. All timestamps are ISO-8601 UTC text.

## Entity overview

```
users 1─1 user_profiles
users 1─1 user_preferences
users 1─* sessions
users 1─* auth_tokens            (email verify, password reset)
users 1─* enrollments *─1 courses
users 1─* lesson_progress *─1 lessons
courses 1─* course_modules 1─* lessons 1─* learning_resources
courses 1─* assessments 1─* questions 1─* question_options
users 1─* submissions *─1 assessments
users 1─* coding_sessions *─1 exercises
users 1─* ai_conversations 1─* ai_messages
ai_chunks *─1 lessons             (RAG index)
users 1─* community_posts 1─* community_comments
community_groups 1─* community_posts
community_posts 1─* post_votes
users 1─* community_reports
users 1─* aptitude_attempts 1─* aptitude_answers
users 1─* achievements (user_achievements) *─1 achievements
users 1─* daily_motivations 1─* motivation_lines
users 1─* learning_recommendations
users 1─* activity_events          (streaks, weekly activity)
users 1─* notes *─1 lessons
users 1─* bookmarks *─1 lessons
users 1─* projects / user_projects
```

## Tables (key columns, constraints, indexes)

### Identity
| Table | Columns | Constraints / indexes |
|---|---|---|
| `users` | id, email UNIQUE, password_hash, role CHECK(student/moderator/admin), email_verified_at, status CHECK(active/disabled), created_at, last_seen_at | `idx_users_email` |
| `user_profiles` | user_id PK→users, display_name, headline, bio, avatar_color, country, goal, experience_level | — |
| `user_preferences` | user_id PK→users, theme CHECK(light/dark/system) DEFAULT 'system', editor_font_size, email_notifications, reduced_motion | — |
| `sessions` | id, token_hash UNIQUE, user_id→users, user_agent, ip, created_at, expires_at, revoked_at | `idx_sessions_user` |
| `auth_tokens` | id, user_id→users, kind CHECK(verify_email/reset_password), token_hash UNIQUE, expires_at, used_at | `idx_tokens_user_kind` |
| `rate_limits` | key PK, window_start, count | — |

### Curriculum
| Table | Columns | Notes |
|---|---|---|
| `courses` | id, slug UNIQUE, title, tagline, description, level, duration_hours, category, icon, accent, sort_order, is_published | 12 seeded courses |
| `course_modules` | id, course_id→courses CASCADE, slug, title, summary, sort_order, level | UNIQUE(course_id, slug) |
| `lessons` | id, module_id→course_modules CASCADE, slug, title, kind CHECK(reading/code/video/lab/project), duration_minutes, sort_order, objectives_json, body_md, code_json, resource_json, is_free_preview | UNIQUE(module_id, slug) |
| `learning_resources` | id, lesson_id→lessons, title, url, provider, license_note, kind | external links only, with attribution |
| `exercises` | id, course_id, lesson_id NULL, slug UNIQUE, title, prompt_md, language, starter_code, test_json, difficulty, sort_order | feeds the lab |
| `assessments` | id, course_id→courses, module_id NULL, title, kind CHECK(module/final), pass_score, time_limit_minutes | |
| `questions` | id, assessment_id→assessments CASCADE, prompt, explanation, kind CHECK(mcq/short), sort_order | |
| `question_options` | id, question_id→questions CASCADE, label, is_correct | |

### Learning record
| Table | Columns | Constraints |
|---|---|---|
| `enrollments` | user_id, course_id, enrolled_at, last_accessed_at, completed_at | PK(user_id, course_id) |
| `lesson_progress` | id, user_id, lesson_id, status CHECK(not_started/in_progress/completed), completed_at, seconds_spent, updated_at | UNIQUE(user_id, lesson_id) — no duplicates |
| `submissions` | id, user_id, assessment_id, score, max_score, answers_json, started_at, submitted_at, duration_seconds | `idx_submissions_user_assessment` |
| `coding_sessions` | id, user_id, exercise_id NULL, language, code, stdin, stdout, stderr, exit_code, status, duration_ms, created_at | `idx_coding_user` |
| `notes` | id, user_id, lesson_id, body, updated_at | UNIQUE(user_id, lesson_id) |
| `bookmarks` | user_id, lesson_id, created_at | PK(user_id, lesson_id) |
| `projects` | id, course_id, slug, title, brief_md, difficulty | seeded |
| `user_projects` | id, user_id, project_id, status, repo_url, notes, completed_at | UNIQUE(user_id, project_id) |

### AI
| Table | Columns |
|---|---|
| `ai_conversations` | id, user_id, course_id NULL, lesson_id NULL, title, created_at, updated_at |
| `ai_messages` | id, conversation_id CASCADE, role CHECK(user/assistant/system), content, tokens_in, tokens_out, created_at |
| `ai_chunks` | id, lesson_id, course_id, ord, content, terms (normalised term string for BM25-lite scoring) |

### Community
| Table | Columns | Notes |
|---|---|---|
| `community_groups` | id, slug UNIQUE, name, description, category, icon | 8 seeded groups |
| `community_posts` | id, group_id, author_id, kind CHECK(thread/question/showcase), title, body_md, tags, score, comment_count, accepted_comment_id NULL, is_pinned, is_removed, created_at | FTS-lite search via LIKE on title/body/tags |
| `community_comments` | id, post_id, author_id, parent_id NULL, body_md, score, is_removed | |
| `post_votes` | user_id, post_id, value CHECK(±1) | PK(user_id, post_id) — one vote each |
| `comment_votes` | user_id, comment_id, value | PK(user_id, comment_id) |
| `community_reports` | id, reporter_id, target_type, target_id, reason, status CHECK(open/resolved/dismissed), created_at | |

### Aptitude
| Table | Columns |
|---|---|
| `aptitude_topics` | id, slug UNIQUE, category CHECK(quant/logical/verbal/analytical/di/placement), title, description, sort_order |
| `aptitude_questions` | id, topic_id, difficulty CHECK(easy/medium/hard), prompt, options_json, correct_index, explanation, tags |
| `aptitude_attempts` | id, user_id, kind CHECK(practice/mock), topic_id NULL, started_at, finished_at, score, total, duration_seconds, config_json |
| `aptitude_answers` | id, attempt_id CASCADE, question_id, chosen_index, is_correct, time_ms |

### Engagement / personalization
| Table | Columns |
|---|---|
| `motivation_lines` | id, text UNIQUE, author, tone |
| `daily_motivations` | user_id, day (YYYY-MM-DD), line_id, shown_at | PK(user_id, day) — persisted per user per date |
| `achievements` | id, slug UNIQUE, title, description, icon, criteria_json |
| `user_achievements` | user_id, achievement_id, awarded_at | PK(user_id, achievement_id) |
| `learning_recommendations` | id, user_id, kind, target_type, target_id, reason, score, status CHECK(open/done/dismissed), created_at |
| `activity_events` | id, user_id, kind, ref_type, ref_id, minutes, created_at | `idx_activity_user_day` — powers streaks + weekly chart |
| `goals` | id, user_id, title, target_date, target_type, target_value, progress, status |

## Integrity rules

1. Progress is never duplicated: `UNIQUE(user_id, lesson_id)` and `UPSERT ... ON CONFLICT`.
2. Completion is only written when the client sends an explicit `complete` intent or an
   assessment passes; nothing auto-completes from page views.
3. Deleting a course cascades to modules → lessons → progress, in one transaction.
4. Every derived number on the dashboard/analytics is computed by SQL over these tables —
   no stored counters that can drift, except `community_posts.score/comment_count`, which are
   updated in the same transaction as the vote/comment.
5. `activity_events` is the single source for streaks and the weekly chart.
