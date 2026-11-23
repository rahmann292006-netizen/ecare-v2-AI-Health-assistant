/**
 * Additive migrations.
 *
 * schema.sql uses CREATE TABLE IF NOT EXISTS, so a database created by an earlier
 * version keeps its old columns. Every column added later is listed here and
 * applied with ALTER TABLE when missing. Migrations are append-only and
 * idempotent; each is recorded in schema_migrations once applied.
 */

const COLUMNS = [
  // [table, column, definition]
  ['user_preferences', 'weekly_goal_minutes', 'INTEGER NOT NULL DEFAULT 180'],
  ['user_preferences', 'email_digest', 'INTEGER NOT NULL DEFAULT 1'],
  ['user_preferences', 'updated_at', 'TEXT'],
  ['user_profiles', 'location', 'TEXT'],
  ['user_profiles', 'website', 'TEXT'],
  ['user_profiles', 'is_public', 'INTEGER NOT NULL DEFAULT 1'],
  ['user_profiles', 'updated_at', 'TEXT'],
  ['community_posts', 'deleted_at', 'TEXT'],
  ['ai_messages', 'citations_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['sessions', 'last_seen_at', 'TEXT'],
  ['learning_plan_targets', 'project_slug', 'TEXT'],
  ['roadmap_stages', 'goal', "TEXT NOT NULL DEFAULT ''"],
  ['roadmap_stages', 'skills_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['competencies', 'weight', "TEXT NOT NULL DEFAULT 'core'"],
  ['competencies', 'evidence_ref', 'TEXT'],
];

/**
 * Rebuild `assessments` so `kind` also accepts 'lesson_quiz'.
 *
 * The original CHECK constraint only allowed ('module','final'). A per-lesson
 * knowledge check is an assessment of a third kind; adding a value to a CHECK
 * constraint means rebuilding the table. Rows keep their ids, so every
 * `submissions.assessment_id` still points at the same assessment.
 */
function rebuildAssessmentsForLessonQuiz(db) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'assessments'").get();
  if (!row || row.sql.includes('lesson_quiz')) return null;

  db.pragma('foreign_keys = OFF');
  const tx = db.transaction(() => {
    db.exec(`
      CREATE TABLE assessments_next (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id           INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        module_id           INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
        title               TEXT NOT NULL,
        kind                TEXT NOT NULL CHECK (kind IN ('module','final','lesson_quiz')),
        pass_score          INTEGER NOT NULL DEFAULT 70,
        time_limit_minutes  INTEGER NOT NULL DEFAULT 15,
        sort_order          INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO assessments_next (id, course_id, module_id, title, kind, pass_score, time_limit_minutes, sort_order)
        SELECT id, course_id, module_id, title, kind, pass_score, time_limit_minutes, sort_order FROM assessments;
      DROP TABLE assessments;
      ALTER TABLE assessments_next RENAME TO assessments;
    `);
    db.prepare('INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)').run('assessments.kind.lesson_quiz');
  });
  tx();
  db.pragma('foreign_keys = ON');
  const broken = db.pragma('foreign_key_check');
  if (broken.length) throw new Error(`ForeignKey violations after assessments rebuild: ${JSON.stringify(broken.slice(0, 3))}`);
  return 'assessments.kind.lesson_quiz';
}

function columnsOf(db, table) {
  try {
    return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name));
  } catch {
    return new Set();
  }
}

export function migrate(db) {
  const applied = [];
  const rebuilt = rebuildAssessmentsForLessonQuiz(db);
  if (rebuilt) applied.push(rebuilt);
  for (const [table, column, definition] of COLUMNS) {
    const existing = columnsOf(db, table);
    if (!existing.size) continue; // table does not exist yet — schema.sql owns it
    if (existing.has(column)) continue;
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      db.prepare('INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)').run(`${table}.${column}`);
      applied.push(`${table}.${column}`);
    } catch (err) {
      console.error(`[db] migration failed for ${table}.${column}: ${err.message}`);
      throw err;
    }
  }
  return applied;
}
