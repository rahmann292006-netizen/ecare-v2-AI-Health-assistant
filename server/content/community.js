/** Daily motivation lines, achievements, community groups and sample community content. */

export const MOTIVATIONS = [
  'Consistency creates the skills that motivation cannot.',
  "Don't just consume technology. Learn to build it.",
  "Your future expertise is built through today's practice.",
  'Every difficult concept becomes easier when you work through it.',
  'Small daily progress compounds into serious ability.',
  'Understanding beats memorising — aim to explain it, not recite it.',
  'The best way to learn a concept is to build something small with it.',
  'Confusion is the feeling of learning. Stay with it a little longer.',
  'Read the error message. It is usually telling you the answer.',
  'Write the code you can explain to someone else.',
  'A finished small project teaches more than three unfinished big ones.',
  'Practice what you struggle with, not what you already enjoy.',
  'Slow and correct beats fast and broken.',
  'Every expert was once a beginner who kept showing up.',
  'Today one lesson. Tomorrow the next one. That is the whole method.',
  'Rest is part of the process, not a break from it.',
  'Ask the question you are embarrassed about — someone else needs the answer too.',
  'Good code is code another person can read.',
  'Learn the fundamentals well; frameworks change, fundamentals do not.',
  'You do not need to be brilliant today. You need to be here.',
];

export const ACHIEVEMENTS = [
  { slug: 'first-steps', title: 'First Steps', description: 'Complete your first lesson.', icon: 'flag', criteria: { type: 'lessons_completed', value: 1 } },
  { slug: 'getting-going', title: 'Getting Going', description: 'Complete 5 lessons.', icon: 'trending', criteria: { type: 'lessons_completed', value: 5 } },
  { slug: 'ten-lessons', title: 'Ten Lessons In', description: 'Complete 10 lessons.', icon: 'book', criteria: { type: 'lessons_completed', value: 10 } },
  { slug: 'twenty-five-lessons', title: 'Quarter Century', description: 'Complete 25 lessons.', icon: 'award', criteria: { type: 'lessons_completed', value: 25 } },
  { slug: 'first-run', title: 'First Run', description: 'Execute code in the lab for the first time.', icon: 'terminal', criteria: { type: 'code_runs', value: 1 } },
  { slug: 'bug-hunter', title: 'Bug Hunter', description: 'Pass every test case of a coding exercise.', icon: 'check', criteria: { type: 'exercise_passed', value: 1 } },
  { slug: 'five-exercises', title: 'Problem Solver', description: 'Pass the tests of 5 exercises.', icon: 'target', criteria: { type: 'exercise_passed', value: 5 } },
  { slug: 'first-assessment', title: 'Assessed', description: 'Pass a module assessment.', icon: 'clipboard', criteria: { type: 'assessment_passed', value: 1 } },
  { slug: 'streak-3', title: 'Three Days Running', description: 'Learn on 3 consecutive days.', icon: 'flame', criteria: { type: 'streak', value: 3 } },
  { slug: 'streak-7', title: 'A Week of Practice', description: 'Learn on 7 consecutive days.', icon: 'flame', criteria: { type: 'streak', value: 7 } },
  { slug: 'aptitude-start', title: 'Aptitude Started', description: 'Finish your first aptitude practice set.', icon: 'brain', criteria: { type: 'aptitude_attempts', value: 1 } },
  { slug: 'mock-exam', title: 'Mock Exam', description: 'Complete a timed mock examination.', icon: 'clock', criteria: { type: 'mock_attempts', value: 1 } },
  { slug: 'community-voice', title: 'Community Voice', description: 'Post your first question or thread.', icon: 'messages', criteria: { type: 'community_posts', value: 1 } },
  { slug: 'helpful', title: 'Helpful', description: 'Have an answer accepted.', icon: 'star', criteria: { type: 'accepted_answers', value: 1 } },
  { slug: 'course-complete', title: 'Course Completed', description: 'Complete every lesson in a course.', icon: 'trophy', criteria: { type: 'courses_completed', value: 1 } },
  { slug: 'tutor-curious', title: 'Curious Mind', description: 'Ask the AI tutor your first question.', icon: 'sparkles', criteria: { type: 'ai_messages', value: 1 } },
];

export const COMMUNITY_GROUPS = [
  { slug: 'python', name: 'Python', category: 'Programming', icon: 'code', description: 'Language questions, packaging, testing and everything between.' },
  { slug: 'dsa', name: 'DSA & Interviews', category: 'Computer Science', icon: 'binary', description: 'Problem patterns, complexity analysis, interview preparation.' },
  { slug: 'web', name: 'Web & Full Stack', category: 'Web Engineering', icon: 'layers', description: 'Frontend, APIs, databases, deployment.' },
  { slug: 'ai', name: 'AI & Machine Learning', category: 'Artificial Intelligence', icon: 'sparkles', description: 'LLMs, RAG, agents, model evaluation and training.' },
  { slug: 'security', name: 'Security', category: 'Security', icon: 'shield', description: 'AppSec, threat modelling, hardening. Defensive discussion only.' },
  { slug: 'cloud', name: 'Cloud & DevOps', category: 'Infrastructure', icon: 'cloud', description: 'Containers, CI/CD, observability, cost.' },
  { slug: 'aptitude', name: 'Aptitude & Placement', category: 'Placement', icon: 'brain', description: 'Quant, reasoning, verbal — and how campus tests work.' },
  { slug: 'showcase', name: 'Project Showcase', category: 'Community', icon: 'star', description: 'Share what you built, ask for review, give feedback.' },
];

/** Seeded discussion threads so a new community is not an empty room. Authored by the Lumen team account. */
export const SAMPLE_POSTS = [
  {
    group: 'python',
    kind: 'question',
    title: 'Why does modifying a list inside a function change the caller\'s list?',
    body: `I expected \`append\` inside a function to be local:

\`\`\`python
def add(items):
    items.append(4)

data = [1, 2, 3]
add(data)
print(data)  # [1, 2, 3, 4]
\`\`\`

Why does the caller's list change? And how do I pass a copy?`,
    tags: 'lists,references',
    answers: [
      {
        body: `Python passes the **reference** to the object, not a copy. \`items\` and \`data\` are two names for the same list, so mutating through either name is visible through both.

If you want a copy, make one explicitly — either at the call site (\`add(data.copy())\`) or inside the function:

\`\`\`python
def add(items):
    items = items.copy()
    items.append(4)
    return items
\`\`\`

Note that the second version no longer mutates the caller's list at all. Deciding which behaviour you want is the real design question: mutate in place (and say so in the docstring), or return a new value.`,
        accepted: true,
      },
      {
        body: `Worth adding: the same applies to dicts and sets. \`copy()\` is shallow — nested lists are still shared. Use \`copy.deepcopy\` only when nesting is real, since it is much slower.`,
      },
    ],
  },
  {
    group: 'dsa',
    kind: 'thread',
    title: 'How I stopped losing time on sliding-window problems',
    body: `Three rules that fixed it for me:

1. Write the invariant in words before the code: "the window contains no duplicates".
2. Only ever move \`left\` forward — never backward. If I want to move it back, my state update is wrong.
3. Test empty string, single character, all-same characters.

The third one caught two bugs in my last attempt. What rules do you use?`,
    tags: 'sliding-window,patterns',
    answers: [{ body: 'Rule 2 is the one people miss. A window that can shrink and grow arbitrarily is just an O(n²) loop in disguise.' }],
  },
  {
    group: 'web',
    kind: 'thread',
    title: 'Session cookies vs JWTs — what I settled on and why',
    body: `I used JWTs for a year and kept hitting the same problem: logging out everywhere. A JWT is valid until it expires unless you keep a blocklist — at which point you have a server-side session anyway, plus extra complexity.

Settled on opaque session tokens stored hashed in the database, \`HttpOnly\` + \`SameSite=Lax\` cookies, and a 30-day sliding expiry. Logout is a single UPDATE. The cost is one database lookup per request, which is a query on an indexed column.

Happy to be convinced otherwise — is there a case where JWTs genuinely win here?`,
    tags: 'auth,sessions,jwt',
    answers: [{ body: 'JWTs win when a service must verify a token without database access (many services, one issuer). For a single app with a database, server sessions are simpler and revocable. Your reasoning is sound.' }],
  },
  {
    group: 'ai',
    kind: 'question',
    title: 'How do you stop RAG answers from citing passages that do not support the claim?',
    body: `My assistant cites \`[2]\` after a sentence, but when I check passage 2 it does not contain the claim. It looks plausible and is wrong — the worst kind.

What has actually worked for you?`,
    tags: 'rag,grounding,evaluation',
    answers: [
      {
        body: `Two things that measurably helped:

1. **Number the passages in the prompt and require the number after each sentence.** Vague "cite your sources" is ignored; a format constraint is followed far more often.
2. **Check mechanically.** After generation, verify that each cited passage shares key terms with the sentence it supports. If not, strip the citation or refuse. Code checks beat model promises.

Also: lower temperature to 0 for this task and refuse when the top retrieval score is below a threshold.`,
        accepted: true,
      },
    ],
  },
  {
    group: 'showcase',
    kind: 'showcase',
    title: 'Built a study-tracker CLI in pure Python (no dependencies)',
    body: `Finished the Python capstone: \`study add 45 --course python\`, \`study report\`, \`study streak\`.

- JSON storage with atomic writes (write to a temp file, then rename)
- 14 tests, including a corrupt-file test
- Streak calculation handles gaps correctly

Things I got wrong first: I stored timestamps as \`time.time()\` floats and could not debug them. Switched to ISO dates and everything became readable.

Happy to take review comments on the module layout.`,
    tags: 'python,project,cli',
    answers: [{ body: 'Atomic write via rename is the detail most tutorials skip — good instinct. One suggestion: put the store behind a small class so tests can inject a temp directory instead of patching paths.' }],
  },
  {
    group: 'aptitude',
    kind: 'thread',
    title: 'Percentage-point vs percent: the mistake that cost me a section',
    body: `In a mock, a pass rate went from 64 % to 72 % and the options were "8 %", "12.5 %", "8 percentage points". I picked 8 % and was wrong.

The increase is **8 percentage points**, which is a **12.5 % relative increase** (8/64). Exams deliberately offer both.

Rule: if the question says "by what percent did the rate increase", compute the relative change; if it says "by how many points", subtract.`,
    tags: 'quant,percentages,exam-strategy',
    answers: [{ body: 'Same trap appears with "share of total". I now underline the word "percent" in every question before computing.' }],
  },
  {
    group: 'security',
    kind: 'question',
    title: 'Is checking ownership on every endpoint really necessary if the UI hides the button?',
    body: `A teammate argued that since the "delete" button only appears for the post author, checking ownership on the server is redundant. That felt wrong but I could not explain it well. How would you put it?`,
    tags: 'access-control,authorization',
    answers: [
      {
        body: `The UI is a suggestion; the HTTP endpoint is the contract. Anyone can send the request with curl, a modified frontend, or a browser console. The button is a usability feature — the server check is the security control.

Practical demonstration for your teammate: log in as user A, copy the delete request, log in as user B, replay it. If it succeeds, the endpoint is broken regardless of what the button does.`,
        accepted: true,
      },
    ],
  },
  {
    group: 'cloud',
    kind: 'thread',
    title: 'A rollback you have never performed is not a rollback',
    body: `We documented rollback for six months and never ran it. When we finally needed it during an incident, the previous image tag had been garbage-collected and the migration was not reversible.

Now: every deploy tags by commit SHA, we keep the last 10 images, and the runbook is exercised once a month in staging. Takes 15 minutes and removed the entire class of "we have a plan" delusion.`,
    tags: 'deployment,rollback,runbook',
    answers: [{ body: 'Keeping N previous images is the key detail — "we can roll back" is false if the artifact is gone.' }],
  },
];

export const GUIDELINES = [
  'Be specific. Show the code, the error, and what you already tried.',
  'Teach rather than dump a full solution when someone is learning.',
  'No harassment, no discrimination, no personal attacks. Disagree with ideas.',
  'Never post credentials, API keys, or other people\'s personal data.',
  'Security discussion must be defensive and about systems you own.',
  'Search before posting — your question may already have an answer.',
  'Report rather than escalate: moderators handle violations.',
];
