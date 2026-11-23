import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = process.env.DATABASE_FILE || path.join(DATA_DIR, 'lumen.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Additive migrations for databases created by an earlier schema version.
// (Static import: a top-level await here would leave the module half-initialised.)
const applied = migrate(db);
if (applied.length && process.env.NODE_ENV !== 'test') {
  console.log(`[db] applied ${applied.length} migration(s): ${applied.join(', ')}`);
}

export const all = (sql, params = []) => db.prepare(sql).all(params);
export const get = (sql, params = []) => db.prepare(sql).get(params);
export const run = (sql, params = []) => db.prepare(sql).run(params);
export const tx = (fn) => db.transaction(fn)();

export function nowIso() {
  return new Date().toISOString();
}

/**
 * Calendar day as YYYY-MM-DD in the given IANA timezone (default: the server's).
 * Daily motivation and streaks are user-facing dates, so they follow a real zone
 * rather than UTC.
 */
export function localDay(d = new Date(), timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata') {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Add n days to a YYYY-MM-DD string. */
export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
