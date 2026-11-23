/**
 * Course roadmaps — the structured, student-visible plan of a course.
 *
 * A roadmap is data, not markup: stages hold modules in order, and each module
 * carries its own workload (lesson minutes, assessment, project). That is what lets
 * the course page render the journey before enrolment and what lets the preparation
 * engine turn the same numbers into daily targets.
 */
import { all, get, run, tx } from '../db/index.js';
import { courseStages } from '../content/curriculum.js';

/**
 * Write (or refresh) the roadmap of one course from its curriculum definition.
 * Idempotent: stages and module links are replaced, never duplicated.
 */
export function buildRoadmap(courseId, course) {
  return tx(() => {
    let roadmap = get('SELECT * FROM curriculum_roadmaps WHERE course_id = ?', [courseId]);
    if (!roadmap) {
      run(
        `INSERT INTO curriculum_roadmaps (course_id, audience, capstone, assessment_plan_json, estimated_hours_json, source_json, updated_at)
         VALUES (?,?,?,?,?,?,?)`,
        [
          courseId,
          course.audience || '',
          course.capstone || '',
          JSON.stringify(course.assessmentPlan || []),
          JSON.stringify(course.estimatedHours || {}),
          JSON.stringify({ benchmark: course.benchmark || [], sources: course.sources || [] }),
          new Date().toISOString(),
        ],
      );
      roadmap = get('SELECT * FROM curriculum_roadmaps WHERE course_id = ?', [courseId]);
    } else {
      run(
        `UPDATE curriculum_roadmaps SET audience = ?, capstone = ?, assessment_plan_json = ?, estimated_hours_json = ?, source_json = ?, updated_at = ?
          WHERE id = ?`,
        [
          course.audience || '',
          course.capstone || '',
          JSON.stringify(course.assessmentPlan || []),
          JSON.stringify(course.estimatedHours || {}),
          JSON.stringify({ benchmark: course.benchmark || [], sources: course.sources || [] }),
          new Date().toISOString(),
          roadmap.id,
        ],
      );
      run('DELETE FROM roadmap_modules WHERE stage_id IN (SELECT id FROM roadmap_stages WHERE roadmap_id = ?)', [roadmap.id]);
      run('DELETE FROM roadmap_stages WHERE roadmap_id = ?', [roadmap.id]);
    }

    const stages = courseStages(course);
    stages.forEach((stage, si) => {
      run(
        `INSERT INTO roadmap_stages (roadmap_id, key, title, summary, goal, skills_json, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [
          roadmap.id, stage.key, stage.title || stage.key, stage.summary || '',
          stage.goal || stage.summary || '', JSON.stringify(stage.skills || []), si,
        ],
      );
      const stageRow = get('SELECT id FROM roadmap_stages WHERE roadmap_id = ? AND key = ?', [roadmap.id, stage.key]);
      (stage.modules || []).forEach((moduleSlug, mi) => {
        const mod = get('SELECT id FROM course_modules WHERE course_id = ? AND slug = ?', [courseId, moduleSlug]);
        if (!mod) return;
        run('INSERT INTO roadmap_modules (stage_id, module_id, sort_order) VALUES (?,?,?)', [stageRow.id, mod.id, mi]);
      });
    });
    return roadmap.id;
  });
}

/**
 * Read a course roadmap with live progress for one user (or for an anonymous
 * preview, where every module is simply "upcoming").
 */
const CAPSTONE_MODULES = new Set(['project', 'agent-projects', 'devops-capstone']);

export function isCapstoneModule(slug) {
  return CAPSTONE_MODULES.has(slug);
}

export function readRoadmap(courseId, userId = null) {
  const roadmap = get('SELECT * FROM curriculum_roadmaps WHERE course_id = ?', [courseId]);
  if (!roadmap) return null;

  const stages = all('SELECT * FROM roadmap_stages WHERE roadmap_id = ? ORDER BY sort_order', [roadmap.id]);
  const out = [];

  for (const stage of stages) {
    const modules = all(
      `SELECT rm.module_id, m.slug, m.title, m.summary, m.level,
              (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id) AS lesson_count,
              (SELECT COALESCE(SUM(l.duration_minutes), 0) FROM lessons l WHERE l.module_id = m.id) AS minutes,
              (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.kind = 'outline') AS outline_count
         FROM roadmap_modules rm JOIN course_modules m ON m.id = rm.module_id
        WHERE rm.stage_id = ? ORDER BY rm.sort_order`,
      [stage.id],
    );

    const moduleList = modules.map((m) => {
      let completed = 0;
      if (userId) {
        completed = get(
          `SELECT COUNT(*) AS n FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
            WHERE p.user_id = ? AND p.status = 'completed' AND l.module_id = ?`,
          [userId, m.module_id],
        ).n;
      }
      const assessment = get(
        `SELECT id, title, pass_score FROM assessments WHERE module_id = ? AND kind = 'module' ORDER BY sort_order LIMIT 1`,
        [m.module_id],
      );
      // A capstone module is identified by name; module projects are not a table yet.
      const project = isCapstoneModule(m.slug)
        ? get('SELECT slug, title FROM projects WHERE course_id = ? ORDER BY est_hours DESC LIMIT 1', [courseId])
        : null;
      const state =
        m.lesson_count > 0 && completed >= m.lesson_count ? 'complete' : completed > 0 ? 'in_progress' : 'upcoming';
      const lessons = all(
        `SELECT l.slug, l.title, l.duration_minutes, l.kind,
                COALESCE(p.status, 'not_started') AS status
           FROM lessons l
           LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = ?
          WHERE l.module_id = ? ORDER BY l.sort_order`,
        [userId, m.module_id],
      );
      return {
        slug: m.slug,
        title: m.title,
        summary: m.summary,
        level: m.level,
        topics: [],
        skills: [],
        lessons: lessons.map((l) => ({
          slug: l.slug,
          title: l.title,
          minutes: l.duration_minutes,
          kind: l.kind,
          outline: l.kind === 'outline',
          completed: l.status === 'completed',
        })),
        lessonCount: m.lesson_count,
        completedLessons: completed,
        minutes: m.minutes,
        outlineCount: m.outline_count,
        assessment: assessment ? { id: assessment.id, title: assessment.title, passScore: assessment.pass_score } : null,
        project: project ? { slug: project.slug, title: project.title } : null,
        state,
      };
    });

    const totalLessons = moduleList.reduce((n, m) => n + m.lessonCount, 0);
    const doneLessons = moduleList.reduce((n, m) => n + m.completedLessons, 0);
    const state =
      totalLessons > 0 && doneLessons >= totalLessons
        ? 'complete'
        : moduleList.some((m) => m.state === 'in_progress' || m.state === 'complete')
          ? 'in_progress'
          : 'upcoming';

    out.push({
      key: stage.key,
      title: stage.title,
      summary: stage.summary,
      goal: stage.goal || stage.summary || '',
      skills: JSON.parse(stage.skills_json || '[]'),
      state,
      lessonCount: totalLessons,
      completedLessons: doneLessons,
      minutes: moduleList.reduce((n, m) => n + m.minutes, 0),
      modules: moduleList,
    });
  }

  const totalLessons = out.reduce((n, s) => n + s.lessonCount, 0);
  const doneLessons = out.reduce((n, s) => n + s.completedLessons, 0);
  // the stage a learner is in: the first stage that is not complete
  const currentStage = out.find((s) => s.state !== 'complete') || out[out.length - 1] || null;

  return {
    audience: roadmap.audience,
    capstone: roadmap.capstone,
    assessmentPlan: JSON.parse(roadmap.assessment_plan_json || '[]'),
    estimatedHours: JSON.parse(roadmap.estimated_hours_json || '{}'),
    sources: JSON.parse(roadmap.source_json || '{}'),
    stages: out,
    totals: {
      stages: out.length,
      modules: out.reduce((n, s) => n + s.modules.length, 0),
      lessons: totalLessons,
      completedLessons: doneLessons,
      minutes: out.reduce((n, s) => n + s.minutes, 0),
      outlineLessons: out.reduce((n, st) => n + st.modules.reduce((k, m) => k + m.outlineCount, 0), 0),
    },
    currentStageKey: currentStage ? currentStage.key : null,
  };
}
