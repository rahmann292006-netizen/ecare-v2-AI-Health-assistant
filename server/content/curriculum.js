/**
 * Curriculum roadmap and scope data — the source of truth for what each course
 * is meant to teach, before any lesson is written.
 *
 * Why this file exists: a lesson count is not a curriculum. Each course below
 * records the job roles it targets, the official documentation and public
 * curricula it was benchmarked against (with the exact URLs used), the stages a
 * learner moves through, and the modules that make up the course.
 *
 * `currentLessons` is the number of lessons that already exist in the database
 * and must be reused (so student progress survives). `planned` lists the lessons
 * a module will hold when it is written; a module whose planned lessons are all
 * in `currentLessons` is already complete. Nothing here creates a lesson by
 * itself — scripts/apply-curriculum.mjs applies it.
 *
 * Editorial rules followed throughout:
 *   - one lesson teaches one idea that a person can hold in working memory
 *   - a module is a coherent unit of skill, not a bucket of topics
 *   - every module ends in an assessment; every course ends in a capstone
 *   - no lesson exists only to raise a count
 */

export const RESEARCH = {
  verifiedOn: '2026-11-16',
  note:
    'Every source below was fetched on this date. Where a source could only be partially read (JavaScript-rendered pages), that is stated rather than guessed at.',
  sources: {
    odinPath: {
      title: 'The Odin Project — Full Stack JavaScript path (courses, lesson and project counts)',
      url: 'https://www.theodinproject.com/paths/full-stack-javascript',
      usedFor: 'Module-level coverage of HTML/CSS, JavaScript, React, databases, NodeJS and job search; lesson and project counts per course.',
      read: 'full',
    },
    odinCurriculumRepo: {
      title: 'TheOdinProject/curriculum — open curriculum repository',
      url: 'https://github.com/TheOdinProject/curriculum',
      usedFor: 'Confirming the curriculum is organised as courses → lessons → projects.',
      read: 'summary (search result excerpt)',
    },
    roadmapFullStack: {
      title: 'roadmap.sh — Full Stack Developer roadmap',
      url: 'https://roadmap.sh/full-stack',
      usedFor: 'Skill grouping (front-end, back-end, databases, API design, tooling) and typical job expectations.',
      read: 'full (narrative section; the node graph itself is rendered by script)',
    },
    mdn: {
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org/',
      usedFor: 'Accuracy of HTTP, HTML, CSS, DOM, Fetch, cookies and web security statements.',
      read: 'reference',
    },
    mdnHttp: {
      title: 'MDN — HTTP response status codes',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status',
      usedFor: 'Status-code choices in the API module.',
      read: 'reference',
    },
    reactDocs: {
      title: 'React — official documentation (Thinking in React, Managing State, Escape Hatches)',
      url: 'https://react.dev/learn',
      usedFor: 'Component and state vocabulary used in the client module.',
      read: 'reference',
    },
    nodeDocs: {
      title: 'Node.js — official documentation',
      url: 'https://nodejs.org/docs/latest/api/',
      usedFor: 'Server runtime facts (event loop, streams, fs, process).',
      read: 'reference',
    },
    postgresDocs: {
      title: 'PostgreSQL — official documentation',
      url: 'https://www.postgresql.org/docs/current/',
      usedFor: 'Constraints, indexes, transactions and isolation levels.',
      read: 'reference',
    },
    sqliteDocs: {
      title: 'SQLite — documentation',
      url: 'https://www.sqlite.org/docs.html',
      usedFor: 'Behaviour of the database Lumen itself runs on.',
      read: 'reference',
    },
    owaspTop10: {
      title: 'OWASP Top 10',
      url: 'https://owasp.org/www-project-top-ten/',
      usedFor: 'Security requirements in the auth and security lessons.',
      read: 'reference',
    },
    owaspAsvs: {
      title: 'OWASP Application Security Verification Standard',
      url: 'https://owasp.org/www-project-application-security-verification-standard/',
      usedFor: 'What "secure" means in checkable terms.',
      read: 'reference',
    },
    webDevCurriculum: {
      title: 'MDN — Learn web development (curriculum outline)',
      url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
      usedFor: 'Ordering of web fundamentals for beginners.',
      read: 'reference',
    },
    gitBook: {
      title: 'Pro Git (free book) — Git SCM',
      url: 'https://git-scm.com/book/en/v2',
      usedFor: 'Version-control topics and the branch/merge model.',
      read: 'reference',
    },
    testingLibrary: {
      title: 'Testing Library — guiding principles',
      url: 'https://testing-library.com/docs/guiding-principles',
      usedFor: 'Test-what-the-user-sees principle in the testing lesson.',
      read: 'reference',
    },
  },
};

/**
 * The stage vocabulary is shared, but each course selects and names the stages
 * that fit its subject. A course never uses a stage it has no modules for.
 */
export const STAGES = {
  foundations: 'Foundations',
  core: 'Core concepts',
  practice: 'Practical implementation',
  intermediate: 'Intermediate skills',
  advanced: 'Advanced concepts',
  projects: 'Real-world projects',
  portfolio: 'Evaluation and portfolio',
};

/**
 * What each stage means, so a roadmap reads as a journey rather than a list of
 * headings. A course may override `goal` / `skills` per stage in its own definition.
 */
export const STAGE_DEFAULTS = {
  foundations: {
    goal: 'Get the vocabulary and the mental model right, with small runnable examples.',
    skills: ['explain the core terms without notes', 'read and run a minimal example'],
  },
  core: {
    goal: 'Build the main working skills of the discipline and use them without hand-holding.',
    skills: ['apply the core techniques to a new problem', 'debug a broken example yourself'],
  },
  practice: {
    goal: 'Turn knowledge into working code through guided exercises.',
    skills: ['write the code from an empty file', 'read an error and fix it'],
  },
  intermediate: {
    goal: 'Work at the level a junior role expects: tooling, tests and structure.',
    skills: ['structure a small project', 'add tests and a README'],
  },
  advanced: {
    goal: 'Handle the harder cases: scale, failure, and trade-offs.',
    skills: ['reason about trade-offs', 'diagnose a failure from evidence'],
  },
  projects: {
    goal: 'Build something complete enough to show someone.',
    skills: ['ship a working project', 'explain your design decisions'],
  },
  portfolio: {
    goal: 'Evaluate your own work honestly and present it as evidence.',
    skills: ['self-assess against the competency list', 'present evidence, not claims'],
  },
};

/** The stage list of one course, with a goal and skills resolved. */
export function courseStages(course) {
  return (course.stages || []).map((stage) => {
    const base = STAGE_DEFAULTS[stage.key] || {};
    return {
      ...stage,
      title: stage.title || STAGES[stage.key] || stage.key,
      goal: stage.goal || base.goal || '',
      skills: stage.skills || base.skills || [],
    };
  });
}

export const COURSES = [
  /* ───────────────────────── 1. PYTHON ───────────────────────── */
  {
    slug: 'python-programming',
    title: 'Python Programming',
    audience: 'Complete beginners and career switchers who want a first language that leads to real work.',
    roles: [
      { title: 'Junior Python Developer', note: 'Scripts, services and data handling in Python.' },
      { title: 'Automation / QA Engineer', note: 'Test automation, tooling and CI helpers.' },
      { title: 'Data Analyst (entry)', note: 'Python for cleaning, analysis and reporting.' },
    ],
    benchmark: ['Python official tutorial and language reference', 'roadmap.sh Python roadmap (topic grouping)', 'University CS1 courses that teach Python first'],
    sources: ['pythonDocs', 'roadmapPython'],
    stages: [
      { key: 'foundations', modules: ['foundations'] },
      { key: 'core', modules: ['data-structures', 'objects-and-typing'] },
      { key: 'practice', modules: ['files-and-data'] },
      { key: 'intermediate', modules: ['project-tooling'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'foundations',
        title: 'Foundations',
        summary: 'How Python executes code, values and types, control flow.',
        level: 'beginner',
        currentLessons: ['how-python-runs', 'types-and-operators', 'control-flow'],
        planned: ['how-python-runs', 'types-and-operators', 'control-flow'],
      },
      {
        slug: 'data-structures',
        title: 'Data Structures & Functions',
        summary: 'Containers, comprehensions and functions that are hard to misuse.',
        level: 'beginner',
        currentLessons: ['collections-deep-dive', 'functions-and-scope'],
        planned: ['collections-deep-dive', 'functions-and-scope'],
      },
      {
        slug: 'objects-and-typing',
        title: 'Objects, Errors and Typing',
        summary: 'Classes, dataclasses, type hints and exception design.',
        level: 'intermediate',
        currentLessons: ['classes-and-dataclasses', 'exceptions'],
        planned: ['classes-and-dataclasses', 'exceptions'],
      },
      {
        slug: 'files-and-data',
        title: 'Files, Text and Data',
        summary: 'Reading and writing files, JSON/CSV, paths and encoding — the work most scripts actually do.',
        level: 'intermediate',
        currentLessons: [],
        planned: ['files-and-paths', 'json-csv', 'iterators-and-generators'],
      },
      {
        slug: 'project-tooling',
        title: 'Tooling & Project',
        summary: 'Virtual environments, packaging, testing and maintainability.',
        level: 'advanced',
        currentLessons: ['venv-and-packages', 'testing-and-project'],
        planned: ['venv-and-packages', 'testing-and-project'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'A command-line application with tests, packaging and a README someone else can follow.',
        level: 'advanced',
        currentLessons: [],
        planned: ['cli-capstone'],
      },
    ],
    capstone: 'A packaged command-line tool that reads real data, has tests, and ships with a README.',
    assessmentPlan: ['One assessment per module', 'Final course assessment covering the whole track'],
    estimatedHours: { foundation: 20, core: 24, practice: 14, intermediate: 16, portfolio: 10 },
  },

  /* ───────────────────── 2. DSA ───────────────────── */
  {
    slug: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    audience: 'Anyone who can write code and now needs it to be fast, correct and interview-ready.',
    roles: [
      { title: 'Software Engineer (interviews)', note: 'Complexity analysis and standard patterns.' },
      { title: 'Backend Engineer', note: 'Choosing structures that fit the access pattern.' },
    ],
    benchmark: ['CLRS-style topic coverage as taught in university algorithms courses', 'roadmap.sh Data Structures & Algorithms roadmap'],
    sources: ['roadmapDsa'],
    stages: [
      { key: 'foundations', modules: ['complexity'] },
      { key: 'core', modules: ['linear-structures', 'trees-graphs'] },
      { key: 'advanced', modules: ['advanced-patterns'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'complexity',
        title: 'Complexity Foundations',
        summary: 'Counting work, growth rates and recognising the algorithm behind the loop.',
        level: 'beginner',
        currentLessons: ['big-o', 'arrays-strings'],
        planned: ['big-o', 'arrays-strings'],
      },
      {
        slug: 'linear-structures',
        title: 'Linear Structures',
        summary: 'Linked lists, stacks, queues and the cost of each operation.',
        level: 'intermediate',
        currentLessons: ['linked-lists', 'stacks-queues'],
        planned: ['linked-lists', 'stacks-queues'],
      },
      {
        slug: 'trees-graphs',
        title: 'Trees, Graphs and Recursion',
        summary: 'Traversal, search and the recursion that makes them tractable.',
        level: 'intermediate',
        currentLessons: ['tree-traversal', 'graphs'],
        planned: ['tree-traversal', 'graphs'],
      },
      {
        slug: 'advanced-patterns',
        title: 'Advanced Patterns',
        summary: 'Dynamic programming, sorting and binary search under real constraints.',
        level: 'advanced',
        currentLessons: ['dynamic-programming', 'sorting-searching'],
        planned: ['dynamic-programming', 'sorting-searching'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'A measured comparison of two solutions to the same problem, with benchmarks.',
        level: 'advanced',
        currentLessons: [],
        planned: ['algorithm-benchmark-capstone'],
      },
    ],
    capstone: 'Implement one problem three ways, benchmark them, and defend the choice with numbers.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 16, core: 24, advanced: 20, portfolio: 8 },
  },

  /* ───────────────────── 3. FULL-STACK ───────────────────── */
  {
    slug: 'full-stack-development',
    title: 'Full Stack Development',
    audience: 'Learners who know some programming and want to build and ship a complete web application.',
    roles: [
      { title: 'Full Stack Developer', note: 'Front-end, back-end and deployment for one product.' },
      { title: 'Frontend Developer', note: 'Component architecture, state, accessibility.' },
      { title: 'Backend Developer', note: 'APIs, data modelling, auth and reliability.' },
    ],
    benchmark: [
      'The Odin Project Full Stack JavaScript path (HTML/CSS → JavaScript → React → Databases → NodeJS → hiring)',
      'roadmap.sh Full Stack Developer roadmap',
      'MDN Learn Web Development, React docs, Node.js docs',
    ],
    sources: ['odinPath', 'roadmapFullStack', 'webDevCurriculum', 'mdn', 'reactDocs', 'nodeDocs'],
    stages: [
      { key: 'foundations', modules: ['web-foundations'] },
      { key: 'core', modules: ['client-architecture', 'server-and-data'] },
      { key: 'practice', modules: ['auth-and-security', 'ship-it'] },
      { key: 'projects', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'web-foundations',
        title: 'How the Web Works',
        summary: 'HTTP, the browser pipeline, semantic HTML and layout that survives real content.',
        level: 'beginner',
        currentLessons: ['http-and-browser', 'semantic-html-css'],
        planned: ['http-and-browser', 'semantic-html-css', 'css-layout'],
      },
      {
        slug: 'client-architecture',
        title: 'Client Architecture',
        summary: 'Components, state, forms, accessibility and talking to a server.',
        level: 'intermediate',
        currentLessons: ['components-and-state', 'forms-and-validation'],
        planned: ['components-and-state', 'forms-and-validation', 'fetching-and-async-ui', 'accessibility'],
      },
      {
        slug: 'server-and-data',
        title: 'Server & Data',
        summary: 'Designing an API, modelling data, validation and querying without surprises.',
        level: 'intermediate',
        currentLessons: ['rest-api-design', 'auth-and-sessions'],
        planned: ['rest-api-design', 'data-modelling', 'auth-and-sessions'],
      },
      {
        slug: 'auth-and-security',
        title: 'Security & Reliability',
        summary: 'Sessions, CSRF, rate limits, error handling and testing a web application.',
        level: 'advanced',
        currentLessons: [],
        planned: ['csrf-and-web-security', 'errors-and-observability'],
      },
      {
        slug: 'ship-it',
        title: 'Ship It',
        summary: 'Testing, build and deploy — the difference between code and a product.',
        level: 'advanced',
        currentLessons: ['testing-web-apps', 'fullstack-capstone'],
        planned: ['testing-web-apps', 'deploying'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'A deployed application with auth, tests and a runbook.',
        level: 'advanced',
        currentLessons: [],
        planned: ['fullstack-capstone'],
      },
    ],
    capstone: 'Ship a small but real product: auth, CRUD, validation, tests, deployed with a runbook.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 16, core: 40, practice: 24, projects: 30 },
  },

  /* ───────────────────── 4. GENERATIVE AI ───────────────────── */
  {
    slug: 'generative-ai',
    title: 'Generative AI',
    audience: 'Developers building products on top of language models.',
    roles: [
      { title: 'AI Application Engineer', note: 'Prompting, RAG, evaluation and cost control.' },
      { title: 'ML Engineer (LLM)', note: 'Serving, batching and quality measurement.' },
    ],
    benchmark: ['Vendor model documentation (tokenisation, context windows)', 'OWASP Top 10 for LLM Applications', 'Anthropic/OpenAI prompting guidance'],
    sources: ['owaspTop10', 'anthropicDocs', 'openaiDocs'],
    stages: [
      { key: 'foundations', modules: ['how-llms-work'] },
      { key: 'core', modules: ['prompt-engineering'] },
      { key: 'practice', modules: ['rag'] },
      { key: 'advanced', modules: ['responsible-ai'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'how-llms-work',
        title: 'How Language Models Work',
        summary: 'Tokens, context windows and attention — the three facts that explain every cost and failure.',
        level: 'beginner',
        currentLessons: ['tokens-and-embeddings', 'attention'],
        planned: ['tokens-and-embeddings', 'attention'],
      },
      {
        slug: 'prompt-engineering',
        title: 'Prompt Engineering as Engineering',
        summary: 'Structured prompts, output contracts and measuring quality.',
        level: 'intermediate',
        currentLessons: ['prompt-structure', 'evaluation'],
        planned: ['prompt-structure', 'evaluation'],
      },
      {
        slug: 'rag',
        title: 'Retrieval-Augmented Generation',
        summary: 'Chunking, indexing, grounding and citations.',
        level: 'intermediate',
        currentLessons: ['rag-pipeline'],
        planned: ['rag-pipeline'],
      },
      {
        slug: 'responsible-ai',
        title: 'Safety, Privacy and Cost',
        summary: 'Prompt injection, redaction, budgets and the capstone.',
        level: 'advanced',
        currentLessons: ['safety-and-cost', 'genai-capstone'],
        planned: ['safety-and-cost', 'genai-capstone'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'A grounded assistant with a measured evaluation and a stated cost.',
        level: 'advanced',
        currentLessons: [],
        planned: ['grounded-assistant-capstone'],
      },
    ],
    capstone: 'A cited, evaluated assistant over a real corpus, with a cost statement.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 10, core: 20, practice: 14, advanced: 16, portfolio: 12 },
  },

  /* ───────────────────── 5. AGENTIC AI ───────────────────── */
  {
    slug: 'agentic-ai',
    title: 'Agentic AI',
    audience: 'Engineers who have built model calls and now need systems that act in several steps.',
    roles: [
      { title: 'AI Engineer (agents)', note: 'Tool design, planning loops, guardrails.' },
      { title: 'Automation Engineer', note: 'Reliable multi-step automation with review points.' },
    ],
    benchmark: ['Tool-calling documentation from major providers', 'OWASP LLM Top 10 (agentic risks: excessive agency)', 'Public agent framework documentation'],
    sources: ['anthropicDocs', 'openaiDocs', 'owaspTop10'],
    stages: [
      { key: 'foundations', modules: ['agent-fundamentals'] },
      { key: 'core', modules: ['tools-and-actions', 'memory-and-planning'] },
      { key: 'advanced', modules: ['reliability'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'agent-fundamentals',
        title: 'Agent Fundamentals',
        summary: 'The loop, the stopping condition and why agents fail differently from chatbots.',
        level: 'intermediate',
        currentLessons: ['agent-loop', 'tool-design'],
        planned: ['agent-loop', 'tool-design', 'tool-schemas'],
      },
      {
        slug: 'tools-and-actions',
        title: 'Tools & Actions',
        summary: 'Schemas, idempotency, permissions and the blast radius of an action.',
        level: 'intermediate',
        currentLessons: [],
        planned: ['permissions-and-blast-radius', 'idempotent-actions'],
      },
      {
        slug: 'memory-and-planning',
        title: 'Memory & Planning',
        summary: 'State that survives, plans that can be checked.',
        level: 'advanced',
        currentLessons: ['memory', 'self-verification'],
        planned: ['memory', 'self-verification', 'planning-and-decomposition'],
      },
      {
        slug: 'reliability',
        title: 'Reliability & Evaluation',
        summary: 'Retries, budgets, traces and measuring whether an agent actually works.',
        level: 'advanced',
        currentLessons: [],
        planned: ['retries-and-budgets', 'agent-evaluation'],
      },
      {
        slug: 'agent-projects',
        title: 'Capstone Project',
        summary: 'An agent with a written failure budget and an evaluation harness.',
        level: 'advanced',
        currentLessons: ['agent-capstone'],
        planned: ['agent-capstone'],
      },
    ],
    capstone: 'A multi-step agent with permissions, traces and a measured success rate.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 12, core: 18, advanced: 16, portfolio: 12 },
  },

  /* ───────────────────── 6. MACHINE LEARNING ───────────────────── */
  {
    slug: 'machine-learning',
    title: 'Machine Learning',
    audience: 'Programmers moving into modelling who need to know what a model is and when it lies.',
    roles: [
      { title: 'Machine Learning Engineer (entry)', note: 'Training, evaluating and serving classical models.' },
      { title: 'Data Scientist', note: 'Framing, features, evaluation and communication.' },
    ],
    benchmark: ['scikit-learn user guide (algorithms and evaluation)', 'Google Machine Learning Crash Course topic list', 'Hands-On ML topic outline'],
    sources: ['sklearnDocs', 'googleMlCrash'],
    stages: [
      { key: 'foundations', modules: ['foundations'] },
      { key: 'core', modules: ['core-algorithms'] },
      { key: 'practice', modules: ['features-and-pipelines'] },
      { key: 'advanced', modules: ['evaluation-and-deployment'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'ml-foundations',
        title: 'Foundations',
        summary: 'Framing a problem, splits, leakage and the baseline that must be beaten.',
        level: 'beginner',
        currentLessons: ['framing-problems', 'data-and-leakage'],
        planned: ['framing-problems', 'data-and-leakage', 'baselines'],
      },
      {
        slug: 'core-algorithms',
        title: 'Core Algorithms',
        summary: 'Linear models, trees and ensembles — what each assumes.',
        level: 'intermediate',
        currentLessons: ['linear-models', 'trees-ensembles'],
        planned: ['linear-models', 'trees-ensembles'],
      },
      {
        slug: 'features-and-pipelines',
        title: 'Features & Pipelines',
        summary: 'Preprocessing, encoding, imputation and pipelines that cannot leak.',
        level: 'intermediate',
        currentLessons: [],
        planned: ['feature-engineering', 'pipelines-and-leakage'],
      },
      {
        slug: 'evaluation-and-deployment',
        title: 'Evaluation & Deployment',
        summary: 'Metrics that match the decision, diagnosis, and serving a model.',
        level: 'advanced',
        currentLessons: ['diagnosis', 'ml-capstone'],
        planned: ['metrics-that-match', 'diagnosis', 'serving-a-model'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'A model, its evaluation, and an honest statement of its limits.',
        level: 'advanced',
        currentLessons: [],
        planned: ['ml-capstone'],
      },
    ],
    capstone: 'Predict a real outcome, beat a baseline, and report the confusion matrix that matters.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 12, core: 18, practice: 14, advanced: 16, portfolio: 10 },
  },

  /* ───────────────────── 7. DEEP LEARNING ───────────────────── */
  {
    slug: 'deep-learning',
    title: 'Deep Learning',
    audience: 'Learners who have used scikit-learn and want to understand and train neural networks.',
    roles: [
      { title: 'Deep Learning Engineer (entry)', note: 'Training, fine-tuning and evaluating networks.' },
      { title: 'Computer Vision / NLP Engineer (entry)', note: 'Transfer learning on real datasets.' },
    ],
    benchmark: ['PyTorch official tutorials', 'fast.ai course outline', 'd2l.ai (Dive into Deep Learning) table of contents'],
    sources: ['pytorchDocs', 'fastai', 'd2l'],
    stages: [
      { key: 'foundations', modules: ['neural-networks'] },
      { key: 'core', modules: ['architectures'] },
      { key: 'practice', modules: ['training'] },
      { key: 'advanced', modules: ['deployment'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'neural-networks',
        title: 'Neural Networks From Scratch',
        summary: 'A neuron, a layer, a loss and the gradient that trains them.',
        level: 'intermediate',
        currentLessons: ['perceptron-to-network', 'backpropagation'],
        planned: ['perceptron-to-network', 'backpropagation'],
      },
      {
        slug: 'architectures',
        title: 'Architectures',
        summary: 'Convolutions, transfer learning and what each architecture assumes.',
        level: 'intermediate',
        currentLessons: ['cnns', 'transfer-learning'],
        planned: ['cnns', 'transfer-learning', 'sequence-models'],
      },
      {
        slug: 'training-at-scale',
        title: 'Training That Converges',
        summary: 'Optimisers, schedules, regularisation and reading learning curves.',
        level: 'intermediate',
        currentLessons: ['training-recipes'],
        planned: ['training-recipes', 'debugging-training'],
      },
      {
        slug: 'deployment',
        title: 'Deployment',
        summary: 'Exporting, serving and measuring a model in production.',
        level: 'advanced',
        currentLessons: [],
        planned: ['serving-models'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'Train, evaluate and serve a network on a real dataset.',
        level: 'advanced',
        currentLessons: ['dl-capstone'],
        planned: ['dl-capstone'],
      },
    ],
    capstone: 'A fine-tuned model, its evaluation, and an honest report of where it fails.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 14, core: 18, practice: 14, advanced: 10, portfolio: 14 },
  },

  /* ───────────────────── 8. CYBERSECURITY ───────────────────── */
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity',
    audience: 'Developers and aspiring security engineers who need to defend systems they build.',
    roles: [
      { title: 'Application Security Engineer', note: 'Threat modelling, review, secure defaults.' },
      { title: 'Security Analyst (entry)', note: 'Detection, triage and hardening.' },
    ],
    benchmark: ['OWASP Top 10 and ASVS', 'NIST SSDF (secure development practices)', 'MDN web security guides'],
    sources: ['owaspTop10', 'owaspAsvs', 'mdn'],
    stages: [
      { key: 'foundations', modules: ['threat-modelling'] },
      { key: 'core', modules: ['application-controls'] },
      { key: 'advanced', modules: ['defence-in-depth'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'threat-model',
        title: 'Threat Modelling',
        summary: 'Assets, attackers and the OWASP categories that map onto them.',
        level: 'beginner',
        currentLessons: ['threat-modelling', 'owasp-top10'],
        planned: ['threat-modelling', 'owasp-top10', 'secure-design-principles'],
      },
      {
        slug: 'appsec-controls',
        title: 'Application Controls',
        summary: 'Input handling, output encoding, injection and access control.',
        level: 'intermediate',
        currentLessons: ['auth-controls', 'input-output'],
        planned: ['auth-controls', 'input-output', 'access-control'],
      },
      {
        slug: 'defence-in-depth',
        title: 'Defence in Depth',
        summary: 'Identity, secrets, hardening, detection and incident response.',
        level: 'advanced',
        currentLessons: ['hardening'],
        planned: ['auth-controls', 'secrets-management', 'hardening', 'logging-and-detection', 'incident-response'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'Audit an application you wrote and fix what you find.',
        level: 'advanced',
        currentLessons: ['security-capstone'],
        planned: ['security-capstone'],
      },
    ],
    capstone: 'A written audit of your own project with fixes applied and verified.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 10, core: 16, practice: 12, advanced: 14, portfolio: 10 },
  },

  /* ───────────────────── 9. CLOUD & DEVOPS ───────────────────── */
  {
    slug: 'cloud-devops',
    title: 'Cloud Computing & DevOps',
    audience: 'Developers who now have to run what they build.',
    roles: [
      { title: 'DevOps Engineer (entry)', note: 'CI/CD, containers, infrastructure basics.' },
      { title: 'Platform Engineer', note: 'Deployment reliability, observability, cost.' },
    ],
    benchmark: ['Docker documentation and best practices', 'Kubernetes concepts documentation', 'Google SRE Book (SLO/error-budget chapters)', 'AWS Well-Architected Framework'],
    sources: ['dockerDocs', 'kubernetesDocs', 'sreBook', 'awsWellArchitected'],
    stages: [
      { key: 'foundations', modules: ['cloud-primitives'] },
      { key: 'core', modules: ['containers'] },
      { key: 'practice', modules: ['pipelines'] },
      { key: 'advanced', modules: ['operations'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'cloud-primitives',
        title: 'Cloud Primitives',
        summary: 'Compute, storage, networking and the Linux you need to run them.',
        level: 'beginner',
        currentLessons: ['cloud-model', 'linux-basics'],
        planned: ['cloud-model', 'linux-basics', 'networking-basics'],
      },
      {
        slug: 'containers',
        title: 'Containers',
        summary: 'Images, layers, volumes and orchestration without mysticism.',
        level: 'intermediate',
        currentLessons: ['docker-essentials'],
        planned: ['docker-essentials', 'orchestration'],
      },
      {
        slug: 'pipelines',
        title: 'Pipelines & Observability',
        summary: 'CI/CD that earns its keep, and logs/metrics/alerts that page correctly.',
        level: 'intermediate',
        currentLessons: ['ci-cd', 'observability'],
        planned: ['ci-cd', 'observability', 'infrastructure-as-code'],
      },
      {
        slug: 'operations',
        title: 'Operations',
        summary: 'Rollbacks, incident response, cost and capacity.',
        level: 'advanced',
        currentLessons: [],
        planned: ['deploy-and-rollback', 'incidents-and-oncall'],
      },
      {
        slug: 'devops-capstone',
        title: 'Capstone Project',
        summary: 'Ship a service with a pipeline, alerts and a runbook.',
        level: 'advanced',
        currentLessons: ['devops-capstone'],
        planned: ['devops-capstone'],
      },
    ],
    capstone: 'A deployed service with automated deploy, health checks, alerts and a runbook.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 12, core: 14, practice: 16, advanced: 12, portfolio: 12 },
  },

  /* ───────────────────── 10. DATA SCIENCE ───────────────────── */
  {
    slug: 'data-science',
    title: 'Data Science',
    audience: 'Analysts and developers who need to turn messy data into defensible answers.',
    roles: [
      { title: 'Data Analyst', note: 'Cleaning, SQL, visualisation and reporting.' },
      { title: 'Data Scientist (entry)', note: 'Statistics, experiment design, communication.' },
    ],
    benchmark: ['pandas user guide', 'Google Data Analytics syllabus topics', 'Statistics references for sampling and inference'],
    sources: ['pandasDocs', 'googleDataAnalytics'],
    stages: [
      { key: 'foundations', modules: ['data-wrangling'] },
      { key: 'core', modules: ['analysis-and-stats'] },
      { key: 'practice', modules: ['sql-and-delivery'] },
      { key: 'advanced', modules: ['visualisation'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'data-wrangling',
        title: 'Data Wrangling',
        summary: 'Cleaning data you did not collect, grouping, reshaping and joins.',
        level: 'beginner',
        currentLessons: ['cleaning-data', 'reshaping-joining'],
        planned: ['cleaning-data', 'reshaping-joining', 'joins-and-keys'],
      },
      {
        slug: 'analysis-and-stats',
        title: 'Analysis & Statistics',
        summary: 'Exploration that finds real things; uncertainty, sampling and testing.',
        level: 'intermediate',
        currentLessons: ['eda', 'uncertainty'],
        planned: ['eda', 'uncertainty', 'experiments-and-causality'],
      },
      {
        slug: 'sql-and-delivery',
        title: 'SQL & Delivery',
        summary: 'Answering questions in SQL and handing over work someone can rerun.',
        level: 'intermediate',
        currentLessons: [],
        planned: ['analytical-sql'],
      },
      {
        slug: 'visualisation',
        title: 'Visualisation & Delivery',
        summary: 'Charts that do not lie, and analyses someone can reproduce.',
        level: 'intermediate',
        currentLessons: ['honest-charts', 'ds-capstone'],
        planned: ['honest-charts', 'reproducible-analysis'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'An end-to-end analysis with a notebook someone else can rerun.',
        level: 'advanced',
        currentLessons: [],
        planned: ['ds-capstone'],
      },
    ],
    capstone: 'A reproducible analysis that answers one business question and states its uncertainty.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 12, core: 16, practice: 10, advanced: 12, portfolio: 10 },
  },

  /* ───────────────────── 11. DATABASE ENGINEERING ───────────────────── */
  {
    slug: 'database-engineering',
    title: 'Database Engineering',
    audience: 'Backend developers who own a schema and have to change it safely.',
    roles: [
      { title: 'Backend / Database Engineer', note: 'Modelling, indexing, migrations.' },
      { title: 'Data Platform Engineer (entry)', note: 'Performance, transactions, operations.' },
    ],
    benchmark: ['PostgreSQL documentation (constraints, indexes, MVCC, isolation)', 'SQLite documentation', 'Use The Index, Luke (index fundamentals)'],
    sources: ['postgresDocs', 'sqliteDocs', 'useTheIndexLuke'],
    stages: [
      { key: 'foundations', modules: ['data-modelling'] },
      { key: 'core', modules: ['performance'] },
      { key: 'practice', modules: ['performance'] },
      { key: 'advanced', modules: ['operations'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'modelling',
        title: 'Data Modelling',
        summary: 'Normalisation, relationships, keys and constraints that make lies impossible.',
        level: 'beginner',
        currentLessons: ['normalisation', 'relationships'],
        planned: ['normalisation', 'relationships', 'constraints-and-integrity'],
      },
      {
        slug: 'performance',
        title: 'Indexes & Query Plans',
        summary: 'What an index costs and buys; reading a plan instead of guessing.',
        level: 'intermediate',
        currentLessons: ['indexes'],
        planned: ['indexes', 'reading-query-plans'],
      },
      {
        slug: 'concurrency',
        title: 'Transactions & Concurrency',
        summary: 'ACID in practice, isolation levels and the anomalies they allow.',
        level: 'intermediate',
        currentLessons: ['transactions'],
        planned: ['transactions', 'concurrency-anomalies'],
      },
      {
        slug: 'operations',
        title: 'Operations & Migrations',
        summary: 'Zero-downtime changes, backups and recovery you have actually tested.',
        level: 'advanced',
        currentLessons: ['migrations'],
        planned: ['migrations', 'backup-and-recovery'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'Design a schema that cannot lie, then prove it with constraints and tests.',
        level: 'advanced',
        currentLessons: ['db-capstone'],
        planned: ['db-capstone'],
      },
    ],
    capstone: 'A schema with enforced invariants, an index justification and a reversible migration.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 10, core: 14, practice: 14, advanced: 14, portfolio: 10 },
  },

  /* ───────────────────── 12. SYSTEM DESIGN ───────────────────── */
  {
    slug: 'system-design',
    title: 'System Design',
    audience: 'Engineers who can build a service and now must design one that survives scale.',
    roles: [
      { title: 'Software Engineer (mid/senior interviews)', note: 'Structured design under constraints.' },
      { title: 'Backend Architect (entry)', note: 'Partitioning, replication, trade-offs.' },
    ],
    benchmark: ['Google SRE Book and SRE Workbook', 'AWS Well-Architected Framework', 'AWS Builders’ Library articles', 'Designing Data-Intensive Applications topic outline'],
    sources: ['sreBook', 'awsWellArchitected', 'awsBuildersLibrary', 'ddia'],
    stages: [
      { key: 'foundations', modules: ['fundamentals'] },
      { key: 'core', modules: ['fundamentals'] },
      { key: 'advanced', modules: ['scaling'] },
      { key: 'portfolio', modules: ['project'] },
    ],
    modules: [
      {
        slug: 'fundamentals',
        title: 'Fundamentals',
        summary: 'A repeatable process: requirements, estimates, interfaces, trade-offs.',
        level: 'intermediate',
        currentLessons: ['design-process', 'building-blocks'],
        planned: ['design-process', 'building-blocks', 'back-of-envelope-estimation'],
      },
      {
        slug: 'building-blocks',
        title: 'The Standard Building Blocks',
        summary: 'Load balancers, caches, queues, CDNs and when each one hurts.',
        level: 'intermediate',
        currentLessons: [],
        planned: ['building-blocks', 'caching-strategies'],
      },
      {
        slug: 'scaling',
        title: 'Scaling & Reliability',
        summary: 'Partitioning, replication, consistency and failure modes.',
        level: 'advanced',
        currentLessons: ['partitioning'],
        planned: ['partitioning', 'consistency-and-failure-modes'],
      },
      {
        slug: 'project',
        title: 'Capstone Project',
        summary: 'Design a learning platform end to end, with numbers and a failure analysis.',
        level: 'advanced',
        currentLessons: ['sd-capstone'],
        planned: ['sd-capstone'],
      },
    ],
    capstone: 'A written design with capacity estimates, a data model and three named failure modes.',
    assessmentPlan: ['One assessment per module', 'Final course assessment'],
    estimatedHours: { foundation: 10, core: 12, advanced: 14, portfolio: 12 },
  },
];

/* ─────────────── additional research sources referenced above ─────────────── */
Object.assign(RESEARCH.sources, {
  pythonDocs: { title: 'The Python Tutorial and Language Reference', url: 'https://docs.python.org/3/', usedFor: 'Python lesson accuracy.', read: 'reference' },
  roadmapPython: { title: 'roadmap.sh — Python roadmap', url: 'https://roadmap.sh/python', usedFor: 'Python topic grouping.', read: 'reference' },
  roadmapDsa: { title: 'roadmap.sh — Data Structures & Algorithms roadmap', url: 'https://roadmap.sh/datastructures-and-algorithms', usedFor: 'DSA topic coverage.', read: 'reference' },
  anthropicDocs: { title: 'Anthropic — prompt engineering and tool use documentation', url: 'https://docs.anthropic.com/', usedFor: 'Prompting and tool-calling facts.', read: 'reference' },
  openaiDocs: { title: 'OpenAI — platform documentation (tokens, context, structured outputs)', url: 'https://platform.openai.com/docs', usedFor: 'Token, context-window and API behaviour facts.', read: 'reference' },
  sklearnDocs: { title: 'scikit-learn — User Guide', url: 'https://scikit-learn.org/stable/user_guide.html', usedFor: 'Algorithm assumptions and evaluation metrics.', read: 'reference' },
  googleMlCrash: { title: 'Google — Machine Learning Crash Course', url: 'https://developers.google.com/machine-learning/crash-course', usedFor: 'ML topic ordering and terminology.', read: 'reference' },
  pytorchDocs: { title: 'PyTorch — official tutorials', url: 'https://pytorch.org/tutorials/', usedFor: 'Training-loop and tensor API facts.', read: 'reference' },
  fastai: { title: 'fast.ai — Practical Deep Learning for Coders (course outline)', url: 'https://course.fast.ai/', usedFor: 'Practical DL topic ordering.', read: 'reference' },
  d2l: { title: 'Dive into Deep Learning — table of contents', url: 'https://d2l.ai/', usedFor: 'DL topic coverage.', read: 'reference' },
  dockerDocs: { title: 'Docker — documentation and best practices', url: 'https://docs.docker.com/', usedFor: 'Image, layer, volume facts.', read: 'reference' },
  kubernetesDocs: { title: 'Kubernetes — concepts documentation', url: 'https://kubernetes.io/docs/concepts/', usedFor: 'Orchestration concepts.', read: 'reference' },
  sreBook: { title: 'Google — Site Reliability Engineering (free online)', url: 'https://sre.google/sre-book/table-of-contents/', usedFor: 'SLOs, error budgets, on-call and incidents.', read: 'reference' },
  awsWellArchitected: { title: 'AWS Well-Architected Framework', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', usedFor: 'Cloud design pillars and trade-offs.', read: 'reference' },
  awsBuildersLibrary: { title: 'Amazon Builders’ Library', url: 'https://aws.amazon.com/builders-library/', usedFor: 'Real production failure modes.', read: 'reference' },
  ddia: { title: 'Designing Data-Intensive Applications — chapter outline', url: 'https://dataintensive.net/', usedFor: 'Replication, partitioning and consistency topics.', read: 'reference' },
  pandasDocs: { title: 'pandas — User Guide', url: 'https://pandas.pydata.org/docs/user_guide/', usedFor: 'Data-wrangling API and behaviour.', read: 'reference' },
  googleDataAnalytics: { title: 'Google Career Certificates — Data Analytics syllabus topics', url: 'https://grow.google/certificates/data-analytics/', usedFor: 'Analyst skill expectations.', read: 'reference (public syllabus summary)' },
  useTheIndexLuke: { title: 'Use The Index, Luke — SQL indexing and tuning', url: 'https://use-the-index-luke.com/', usedFor: 'Index and query-plan explanation.', read: 'reference' },
});
