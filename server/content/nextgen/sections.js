/**
 * Section helpers for next-generation lesson bodies.
 *
 * Every upgraded lesson uses the same twelve sections so a learner can build one
 * reading habit across courses: the story first, then the mechanics, then the
 * practice. `lessonBody()` assembles them; `pin()` makes a fenced block.
 *
 * `.md` files from docs/walkthroughs may be passed through `lessonBody` unchanged —
 * anything with all twelve headings is used verbatim.
 */

export function code(language, source) {
  return `\`\`\`${language || 'text'}\n${source.replace(/\n+$/, '')}\n\`\`\``;
}

export const SECTIONS = [
  'The situation',
  'What you can do afterwards',
  'The idea, in plain words',
  'The terms, precisely',
  'Walk through it',
  'Where this shows up',
  'Mistakes worth avoiding',
  'Practise now',
  'Check yourself',
  'Challenge',
  'In one paragraph',
  'Go further',
];

export function h2(title) {
  return `## ${title}`;
}

/** Turn an array of plain sentences into a markdown bullet list. */
export function bullets(items) {
  return items.map((i) => `- ${i}`).join('\n');
}

export function numbered(items) {
  return items.map((i, n) => `${n + 1}. ${i}`).join('\n');
}

/**
 * Build a complete lesson body from its parts.
 *
 * Accepts strings for every block, so an author can pass either a paragraph or
 * pre-formatted markdown. `scenario` becomes a blockquote so the opening frame is
 * visually distinct from the technical explanation that follows.
 */
export function lessonBody({
  scenario,
  outcomes,
  idea,
  terms,
  walkthrough,
  applications,
  mistakes,
  practice,
  check,
  challenge,
  summary,
  further,
}) {
  return [
    h2('The situation'),
    scenario.startsWith('>') ? scenario : `> ${scenario.replace(/\n\n/g, '\n>\n> ')}`,
    h2('What you can do afterwards'),
    Array.isArray(outcomes) ? bullets(outcomes) : outcomes,
    h2('The idea, in plain words'),
    idea,
    h2('The terms, precisely'),
    terms,
    h2('Walk through it'),
    walkthrough,
    h2('Where this shows up'),
    applications,
    h2('Mistakes worth avoiding'),
    mistakes,
    h2('Practise now'),
    practice,
    h2('Check yourself'),
    check,
    h2('Challenge'),
    challenge,
    h2('In one paragraph'),
    summary,
    h2('Go further'),
    Array.isArray(further) ? bullets(further) : further,
    '',
  ].join('\n\n');
}

/** True when the body already carries every section, so it is used as written. */
export function isComplete(body) {
  return SECTIONS.every((s) => String(body).includes(`## ${s}`));
}
