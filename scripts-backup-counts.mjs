import Database from 'better-sqlite3';
const db = new Database('server/data/lumen.db', { readonly: true });
for (const t of ['users','courses','course_modules','lessons','exercises','assessments','questions','submissions','lesson_progress','enrollments','ai_chunks']) {
  console.log(t, db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n);
}
