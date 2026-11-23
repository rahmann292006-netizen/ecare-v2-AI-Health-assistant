/**
 * Courses 10–12: Data Science, Database Engineering, System Design.
 */

const DOC = (title, url, provider, licenseNote = 'Official documentation — linked, not redistributed.') => ({ title, url, provider, kind: 'docs', licenseNote });

export const COURSES_4 = [
  {
    slug: 'data-science',
    title: 'Data Science',
    tagline: 'From messy data to a defensible answer.',
    category: 'Data & Storage',
    icon: 'database',
    level: 'Beginner → Advanced',
    durationHours: 46,
    outcomes: [
      'Clean and reshape real-world tabular data',
      'Ask answerable questions and choose valid comparisons',
      'Visualise honestly and describe uncertainty',
      'Deliver analysis that another person can reproduce',
    ],
    prereqs: ['Python basics', 'High-school statistics helpful'],
    description:
      'Data science is judgement applied to data. This course covers pandas-style work, exploratory analysis, visualisation integrity and the statistical discipline that stops you from announcing a coincidence as a finding.',
    modules: [
      {
        slug: 'data-wrangling',
        title: 'Data Wrangling',
        summary: 'Loading, cleaning, reshaping, joins.',
        level: 'beginner',
        lessons: [
          {
            slug: 'cleaning-data',
            title: 'Cleaning Data You Did Not Collect',
            kind: 'reading',
            minutes: 26,
            objectives: ['Profile a dataset before analysing it', 'Handle missing values deliberately', 'Detect duplicates and impossible values'],
            body: `## Profile first

Before any analysis, answer: how many rows, how many nulls per column, what are the ranges, how many distinct categories, what does the distribution look like? Ten minutes here saves hours of wrong conclusions.

## Missing data is informative

| Mechanism | Meaning | Handling |
|---|---|---|
| MCAR | missing at random | drop or impute; low risk |
| MAR | depends on observed columns | model-based imputation |
| MNAR | depends on the missing value itself | investigate; do not silently impute |

Never fill with 0 by default: 0 is a real value for "minutes studied", and inventing it distorts every mean.

## Cleaning checklist

1. Trim whitespace, normalise casing for categories.
2. Parse dates explicitly (\`YYYY-MM-DD\`, ISO 8601).
3. Coerce numeric columns and count failures.
4. Remove exact duplicates; investigate near-duplicates.
5. Check impossible values (negative ages, future dates, percentages > 100).

## Document every decision

Cleaning choices change results. Keep a short log: what changed, how many rows, why.`,
            code: [
              {
                language: 'python',
                caption: 'A profile function in plain Python',
                source: `rows = [\n    {"name": "A", "minutes": 30, "date": "2026-11-01"},\n    {"name": "B", "minutes": None, "date": "2026-11-02"},\n    {"name": " A ", "minutes": 45, "date": "2026-11-03"},\n    {"name": "A", "minutes": 30, "date": "2026-11-01"},\n]\n\ndef profile(rows):\n    for k in rows[0]:\n        vals = [r[k] for r in rows]\n        nulls = sum(v is None for v in vals)\n        distinct = len({v for v in vals if v is not None})\n        print(f"{k:<10} nulls={nulls:<3} distinct={distinct}")\n\nprofile(rows)\ncleaned, seen = [], set()\nfor r in rows:\n    r = {**r, "name": r["name"].strip()}\n    key = (r["name"], r["minutes"], r["date"])\n    if key not in seen:\n        seen.add(key)\n        cleaned.append(r)\nprint("rows before:", len(rows), "after dedupe:", len(cleaned))`,
              },
            ],
            resources: [DOC('pandas — User Guide', 'https://pandas.pydata.org/docs/user_guide/index.html', 'pandas.pydata.org')],
          },
          {
            slug: 'reshaping-joining',
            title: 'Grouping, Reshaping and Joins',
            kind: 'code',
            minutes: 24,
            objectives: ['Summarise with group-by', 'Pivot long to wide and back', 'Avoid the fan-out join bug'],
            body: `## Group by, then aggregate

\`\`\`python
by_course = df.groupby("course").agg(learners=("user_id", "nunique"),
                                     minutes=("minutes", "sum"),
                                     avg=("minutes", "mean"))
\`\`\`

Always ask: how many rows per group? A group of one row produces a confident-looking average that means nothing.

## Long vs wide

Long format (one row per observation) is right for analysis and plotting. Wide format (one column per category) is right for reports. Convert deliberately, never by hand.

## The fan-out join bug

Joining one row to many duplicates the "one" side and inflates sums. Check row counts before and after every join:

\`\`\`python
before = len(left)
merged = left.merge(right, on="id", how="left", validate="one_to_many")
assert len(merged) >= before
\`\`\`

\`validate="one_to_one"\` (or the appropriate cardinality) makes pandas raise instead of silently duplicating.`,
            code: [
              {
                language: 'python',
                caption: 'Group-by and a fan-out check in pure Python',
                source: `sessions = [\n    {"user": 1, "course": "python", "minutes": 30},\n    {"user": 2, "course": "python", "minutes": 45},\n    {"user": 1, "course": "python", "minutes": 20},\n    {"user": 3, "course": "dsa", "minutes": 60},\n]\n\nagg = {}\nfor s in sessions:\n    a = agg.setdefault(s["course"], {"rows": 0, "users": set(), "minutes": 0})\n    a["rows"] += 1\n    a["users"].add(s["user"])\n    a["minutes"] += s["minutes"]\n\nfor course, a in agg.items():\n    print(course, "rows:", a["rows"], "users:", len(a["users"]), "avg:", round(a["minutes"] / a["rows"], 1))\n\nusers = {1: "Ana", 2: "Ben", 3: "Cy"}\njoined = [{"course": s["course"], "name": users[s["user"]]} for s in sessions]\nprint("rows before join:", len(sessions), "after:", len(joined))`,
              },
            ],
            resources: [DOC('pandas — Merge, join, concatenate', 'https://pandas.pydata.org/docs/user_guide/merging.html', 'pandas.pydata.org')],
          },
        ],
      },
      {
        slug: 'analysis-and-stats',
        title: 'Analysis & Statistics',
        summary: 'EDA, distributions, uncertainty, testing.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'eda',
            title: 'Exploratory Analysis That Finds Real Things',
            kind: 'reading',
            minutes: 26,
            objectives: ['Start with distributions, not averages', 'Separate signal from noise', 'Write findings as claims with evidence'],
            body: `## Distributions first

A mean of 24 minutes of study could be "everyone does 24" or "half do 0, half do 48". Look at the shape: median, quartiles, min/max, and a histogram. If it is skewed, report the median.

## Segmentation reveals what aggregates hide

Overall completion might be 40 %. Split by experience level and you may find 75 % for one group and 12 % for another — a completely different product decision.

## Simpson's paradox

A trend in every subgroup can reverse when groups are combined, because group sizes differ. Always check the split before you trust the aggregate.

## Correlation is not causation, but it is a hypothesis

Two variables moving together can mean A→B, B→A, or a third factor driving both. Say "associated with" unless you have an experiment.

## Write findings as claims

> "Among students who completed at least 3 lessons in week 1 (n=412), 61 % finished the course, compared with 18 % among those who completed fewer (n=588). This is an association; the two groups may differ in motivation."

Number, comparison, n, and a caveat. That sentence survives review.`,
            code: [
              {
                language: 'python',
                caption: "Simpson's paradox in a few lines",
                source: `A = [("small", 1)] * 81 + [("large", 0)] * 19     # 81/100 overall\nB = [("small", 1)] * 192 + [("large", 0)] * 108   # 192/300 overall\n\ndef rate(data):\n    return sum(y for _, y in data) / len(data)\n\nfor name, data in (("A", A), ("B", B)):\n    small = [y for g, y in data if g == "small"]\n    large = [y for g, y in data if g == "large"]\n    print(f"{name}: overall {rate(data):.0%}  small {sum(small)/len(small):.0%}  large {sum(large)/len(large):.0%}")`,
              },
            ],
            resources: [DOC('NIST — Engineering Statistics Handbook', 'https://www.itl.nist.gov/div898/handbook/', 'NIST')],
          },
          {
            slug: 'uncertainty',
            title: 'Uncertainty, Sampling and Testing',
            kind: 'reading',
            minutes: 26,
            objectives: ['Distinguish standard deviation from standard error', 'Interpret a confidence interval', 'Avoid p-hacking'],
            body: `## Two different "standard deviations"

- **SD**: spread of individual observations.
- **SE**: spread of the *mean* estimate, \`SD / sqrt(n)\`.

With n = 100, the mean is about 10× more precise than a single observation. This is why small samples produce jumpy conclusions.

## Confidence intervals

A 95 % interval means: if we repeated the sampling procedure many times, 95 % of the intervals built this way would contain the true value. It is a statement about the procedure, not a 95 % probability that *this* interval contains the truth.

Practical rule: report the estimate **with** its interval. A difference of 3 % with a ±8 % interval is not a finding.

## Testing

- State the hypothesis before looking at the data.
- Correct for multiple comparisons (Bonferroni or FDR) — testing 20 things at α = 0.05 yields one false positive on average.
- Effect size matters more than p-value: how big is the difference, in units a human cares about?

## p-hacking

Trying variants until p < 0.05 guarantees false positives. Pre-register the analysis, or label the result as exploratory and confirm it on fresh data.`,
            code: [
              {
                language: 'python',
                caption: 'Standard error and a bootstrap interval',
                source: `import random, math\nrandom.seed(11)\n\ndata = [random.gauss(24, 12) for _ in range(200)]\nmean = sum(data) / len(data)\nsd = math.sqrt(sum((x - mean) ** 2 for x in data) / (len(data) - 1))\nse = sd / math.sqrt(len(data))\nprint(f"mean {mean:.2f}  sd {sd:.2f}  se {se:.2f}")\n\nboot = sorted(sum(random.choice(data) for _ in data) / len(data) for _ in range(2000))\nprint(f"95% bootstrap CI: [{boot[50]:.2f}, {boot[1949]:.2f}]")`,
              },
            ],
            resources: [DOC('NIST — Measures of Scale', 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm', 'NIST')],
          },
        ],
      },
      {
        slug: 'visualisation',
        title: 'Visualisation & Delivery',
        summary: 'Honest charts, narrative, reproducible notebooks.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'honest-charts',
            title: 'Charts That Do Not Lie',
            kind: 'reading',
            minutes: 24,
            objectives: ['Choose chart types by question', 'Avoid truncated axes and dual axes', 'Design for reading, not decoration'],
            body: `## Chart by question

| Question | Chart |
|---|---|
| compare categories | bar (sorted, horizontal if long labels) |
| distribution | histogram, box plot, strip plot |
| trend over time | line, with time on x |
| relationship | scatter, with density where crowded |
| composition | stacked bar (avoid pie beyond 3 slices) |

## Three common distortions

1. **Truncated y-axis on bars** — bar length encodes magnitude, so starting at 90 exaggerates a 2 % difference into a cliff. Lines may truncate if labelled; bars must not.
2. **Dual axes** — two scales on one chart can manufacture any correlation. Use two stacked charts sharing an x-axis.
3. **Area for value** — scaling a circle's radius by value squares the visual impression.

## Colour

Use one accent colour and one neutral for emphasis. Sequential palette for magnitude, diverging for above/below zero. Never encode meaning by hue alone — pair with labels or patterns.

## Every chart needs

A title stating the finding (not "Chart 1"), axis labels with units, the n, and the source.`,
            code: [
              {
                language: 'python',
                caption: 'A truncated axis changes the story',
                source: `values = [100, 102, 101, 103]\nlabels = ["Q1", "Q2", "Q3", "Q4"]\n\ndef bars(v, width=40, lo=0, hi=None):\n    hi = hi if hi is not None else max(v)\n    return ["#" * max(1, round((x - lo) / (hi - lo) * width)) for x in v]\n\nprint("honest (0 to max):")\nfor l, b in zip(labels, bars(values)):\n    print(f"  {l} {b}")\n\nprint("\\nmisleading (100 to max):")\nfor l, b in zip(labels, bars(values, lo=100, hi=103)):\n    print(f"  {l} {b}")`,
              },
            ],
            resources: [DOC('Data-to-Viz — chart chooser', 'https://www.data-to-viz.com/', 'data-to-viz.com')],
          },
          {
            slug: 'ds-capstone',
            title: 'Capstone: An Analysis Someone Can Reproduce',
            kind: 'project',
            minutes: 40,
            objectives: ['Deliver a reproducible analysis', 'Separate data, code and narrative', 'State limitations explicitly'],
            body: `## Brief

Analyse a public dataset (or a synthetic one you clearly label as synthetic):

1. \`data/\` — raw files, untouched, with a source note.
2. \`clean.py\` — deterministic cleaning, logs row counts in and out.
3. \`analysis.py\` — every number in the report, computed from cleaned data.
4. \`report.md\` — findings with n, effect sizes, intervals and caveats.
5. Three charts, each titled with its finding.

## Completion criteria

- Running two commands from a fresh clone reproduces every figure.
- No hard-coded results in the report.
- Every claim has a number and a sample size.
- A limitations section listing at least three honest weaknesses.
- Synthetic data is labelled as synthetic in the first paragraph.

## Anti-patterns to avoid

Correlation language without causality checks, percentages without denominators, charts without units, and conclusions that outrun the data.`,
            code: [
              {
                language: 'python',
                caption: 'Deterministic cleaning with row-count logging',
                source: `import json\n\nraw = [\n    {"user": 1, "minutes": 30},\n    {"user": 2, "minutes": None},\n    {"user": 3, "minutes": 45},\n    {"user": 3, "minutes": 45},\n]\n\ndef clean(rows):\n    log = {"in": len(rows)}\n    rows = [r for r in rows if r.get("minutes") is not None]\n    log["after_null_drop"] = len(rows)\n    seen, out = set(), []\n    for r in rows:\n        key = (r["user"], r["minutes"])\n        if key not in seen:\n            seen.add(key)\n            out.append(r)\n    log["out"] = len(out)\n    return out, log\n\ncleaned, log = clean(raw)\nprint(json.dumps(log))\nprint(cleaned)`,
              },
            ],
            resources: [DOC('Kaggle — Dataset search', 'https://www.kaggle.com/datasets', 'Kaggle')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Data Science Foundations Check',
        moduleSlug: 'data-wrangling',
        passScore: 70,
        timeLimitMinutes: 8,
        questions: [
          {
            prompt: 'Filling missing study minutes with 0 is risky because:',
            options: ['It is slow', '0 is a real value and distorts means and comparisons', 'It breaks pandas', 'It changes the dtype'],
            correct: 1,
            explanation: 'You are inventing observations; the mechanism of missingness determines the correct handling.',
          },
          {
            prompt: 'Joining one row to many rows without validation can:',
            options: ['Speed up queries', 'Duplicate the "one" side and inflate sums', 'Change column types', 'Remove nulls'],
            correct: 1,
            explanation: 'This is fan-out; always check row counts and declare cardinality.',
          },
          {
            prompt: 'Standard error of the mean is:',
            options: ['The same as standard deviation', 'SD divided by sqrt(n)', 'The range divided by 2', 'Always 1'],
            correct: 1,
            explanation: 'Precision of the mean improves with the square root of sample size.',
          },
          {
            prompt: 'A bar chart whose y-axis starts at 90 instead of 0:',
            options: ['Is always fine', 'Exaggerates small differences because bar length encodes magnitude', 'Improves accuracy', 'Is required for percentages'],
            correct: 1,
            explanation: 'Bars encode magnitude by length; truncation misleads. Lines with labelled axes may truncate.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'ds-public-dataset-report',
        title: 'Reproducible Analysis Report',
        difficulty: 'intermediate',
        estHours: 10,
        brief:
          'Analyse a public dataset end to end: cleaning script, analysis script, three honest charts, and a report where every claim carries a number, a sample size and a caveat.',
      },
    ],
    exercises: [
      {
        slug: 'ds-median',
        title: 'Median, not mean',
        difficulty: 'easy',
        prompt:
          'Read a line of integers (space separated) and print the median to 1 decimal place. For an even count, average the two middle values.',
        starter: 'values = sorted(map(int, input().split()))\n# your code here\n',
        solution:
          'values = sorted(map(int, input().split()))\nn = len(values)\nif n % 2:\n    med = values[n // 2]\nelse:\n    med = (values[n // 2 - 1] + values[n // 2]) / 2\nprint(f"{med:.1f}")\n',
        tests: [
          { input: '1 2 3 4 100\n', expected: '3.0' },
          { input: '2 4\n', expected: '3.0' },
        ],
      },
    ],
  },
  {
    slug: 'database-engineering',
    title: 'Database Engineering',
    tagline: 'Model data so the application cannot corrupt it.',
    category: 'Data & Storage',
    icon: 'table',
    level: 'Beginner → Advanced',
    durationHours: 42,
    outcomes: [
      'Design normalised schemas with real constraints',
      'Write and read query plans',
      'Use transactions and isolation levels correctly',
      'Migrate a live schema without downtime',
    ],
    prereqs: ['Basic SQL familiarity', 'Understanding of a web app'],
    description:
      'A schema is the strongest constraint system you will ever write. This course covers modelling, indexing, transactions and migrations — the four areas where database mistakes become production incidents.',
    modules: [
      {
        slug: 'modelling',
        title: 'Data Modelling',
        summary: 'Entities, relationships, normal forms, constraints.',
        level: 'beginner',
        lessons: [
          {
            slug: 'normalisation',
            title: 'Normalisation, and When to Break It',
            kind: 'reading',
            minutes: 26,
            objectives: ['Apply 1NF–3NF', 'Recognise update anomalies', 'Denormalise deliberately'],
            body: `## The forms, practically

- **1NF**: atomic values, no repeating groups. A \`tags\` column holding "a,b,c" is not 1NF — use a join table.
- **2NF**: no partial dependency on part of a composite key.
- **3NF**: no non-key column depending on another non-key column.

## The anomalies normalisation prevents

\`\`\`
enrollments(user_id, course_id, course_title, instructor)
\`\`\`

Renaming a course means updating thousands of rows, and any missed row now disagrees. That is an **update anomaly**. Deleting the last enrollee loses the course: a **delete anomaly**.

Fix: \`courses(id, title, instructor_id)\` + \`enrollments(user_id, course_id)\`.

## When to denormalise

- Read-heavy aggregates that are expensive to compute (counters, materialised views).
- Reporting tables rebuilt on a schedule.
- Caching a value the application can verify.

Every denormalisation is a trade: faster reads, plus an invariant you must now maintain in code. Write that invariant down and enforce it in a transaction.

## Constraints are documentation

\`\`\`sql
email TEXT NOT NULL UNIQUE,
role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','moderator','admin'))
\`\`\`

The database rejects bad data from *every* code path — including the one you write next year.`,
            code: [
              {
                language: 'sql',
                caption: 'Normalised vs denormalised',
                source: `-- ✗ repeating group + duplicated course title\nCREATE TABLE bad_enrollments (\n  user_id INTEGER,\n  course_id INTEGER,\n  course_title TEXT\n);\n\n-- ✓ normalised with real constraints\nCREATE TABLE courses (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL,\n  slug TEXT NOT NULL UNIQUE\n);\nCREATE TABLE enrollments (\n  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,\n  enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (user_id, course_id)\n);`,
              },
            ],
            resources: [DOC('PostgreSQL — Constraints', 'https://www.postgresql.org/docs/current/ddl-constraints.html', 'postgresql.org')],
          },
          {
            slug: 'relationships',
            title: 'Relationships, Keys and Cascades',
            kind: 'reading',
            minutes: 24,
            objectives: ['Choose primary keys', 'Decide ON DELETE behaviour per relationship', 'Avoid orphan rows'],
            body: `## Primary keys

- Surrogate integer/ULID keys: stable, small, no business meaning.
- Natural keys (email, ISBN): meaningful but change, and are painful to reference.

Prefer a surrogate key plus a UNIQUE constraint on the natural key.

## Foreign keys and cascade behaviour

| ON DELETE | Use when |
|---|---|
| CASCADE | child cannot exist without parent (lesson → module) |
| RESTRICT | deletion must be blocked until children are handled (user with content) |
| SET NULL | relationship is optional (lesson → optional exercise) |

Without a foreign key you get orphan rows that break joins months later.

## Cardinality

- 1:1 — split rarely; a separate table for optional heavy columns is valid.
- 1:N — foreign key on the many side.
- M:N — join table with its own primary key and, often, its own columns (enrolled_at, role).

## Audit columns

\`created_at\`, \`updated_at\` on every mutable table. They are free to add now and expensive to backfill later.`,
            code: [
              {
                language: 'sql',
                caption: 'Cascade choices',
                source: `CREATE TABLE course_modules (\n  id INTEGER PRIMARY KEY,\n  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,\n  title TEXT NOT NULL,\n  sort_order INTEGER NOT NULL\n);\n\nCREATE TABLE community_posts (\n  id INTEGER PRIMARY KEY,\n  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  accepted_comment_id INTEGER REFERENCES community_comments(id) ON DELETE SET NULL,\n  title TEXT NOT NULL\n);`,
              },
            ],
            resources: [DOC('SQLite — Foreign Keys', 'https://www.sqlite.org/foreignkeys.html', 'sqlite.org')],
          },
        ],
      },
      {
        slug: 'performance',
        title: 'Indexes & Query Plans',
        summary: 'B-tree indexes, selectivity, EXPLAIN, N+1.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'indexes',
            title: 'Indexes: What They Cost and Buy',
            kind: 'reading',
            minutes: 28,
            objectives: ['Choose composite index column order', 'Read EXPLAIN output', 'Spot N+1 queries'],
            body: `## An index is a sorted structure

A B-tree lets the engine find a range in O(log n) instead of scanning every row. The cost: extra storage and slower writes, because every insert updates every index.

## Composite index order matters

\`(user_id, created_at)\` serves:

- \`WHERE user_id = ?\` ✔
- \`WHERE user_id = ? ORDER BY created_at DESC\` ✔
- \`WHERE created_at > ?\` ✘ (leftmost column missing)

Rule of thumb: equality columns first, then the range/sort column.

## Reading a plan

\`\`\`
EXPLAIN QUERY PLAN
SELECT * FROM lesson_progress WHERE user_id = 42 ORDER BY updated_at DESC;
-- SEARCH lesson_progress USING INDEX idx_progress_user (user_id=?)
\`\`\`

\`SCAN\` on a large table is your signal. \`SEARCH ... USING INDEX\` is what you want.

## N+1 queries

Loading 50 posts then one query per post for its author is 51 queries. Fix with a join or a batched \`WHERE id IN (...)\`. This is the most common application-level performance bug.

## Measure, do not guess

Add an index only for a query you have seen in a plan or a slow log. Unused indexes cost writes for nothing.`,
            code: [
              {
                language: 'sql',
                caption: 'Index design for a feed query',
                source: `-- feed: posts in a group, newest first\nCREATE INDEX idx_posts_group_created ON community_posts(group_id, created_at DESC);\n\n-- progress lookup for one user, newest first\nCREATE INDEX idx_progress_user_updated ON lesson_progress(user_id, updated_at DESC);\n\nEXPLAIN QUERY PLAN\nSELECT id, title FROM community_posts\nWHERE group_id = 3\nORDER BY created_at DESC\nLIMIT 20;`,
              },
            ],
            resources: [DOC('SQLite — Query Planning', 'https://www.sqlite.org/optoverview.html', 'sqlite.org')],
          },
          {
            slug: 'transactions',
            title: 'Transactions and Isolation',
            kind: 'reading',
            minutes: 26,
            objectives: ['Use transactions for multi-step writes', 'Understand lost updates and write skew', 'Keep transactions short'],
            body: `## What a transaction guarantees

\`\`\`sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
\`\`\`

Atomicity: either both updates happen or neither. Without it, a crash between the two lines loses money.

## Anomalies and isolation levels

| Anomaly | Example | Fix |
|---|---|---|
| dirty read | reading uncommitted data | READ COMMITTED or higher |
| non-repeatable read | same row differs within a transaction | REPEATABLE READ |
| lost update | two writers overwrite each other | row lock / atomic UPDATE |
| write skew | two reads both pass a check | SERIALIZABLE or explicit locking |

SQLite serialises writers, so lost updates are rarer there — but the pattern matters when you move to PostgreSQL.

## Keep transactions short

Never do network calls, file I/O or model inference inside a transaction. Locks held during a 3-second HTTP call will stall every other writer.

## Read-modify-write

\`\`\`sql
-- ✗ read then write: race
UPDATE counters SET count = 42 WHERE id = 1;
-- ✓ atomic increment
UPDATE counters SET count = count + 1 WHERE id = 1;
\`\`\``,
            code: [
              {
                language: 'sql',
                caption: 'A transactional enrolment with idempotency',
                source: `BEGIN;\nINSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (42, 7);\nUPDATE enrollments\n   SET last_accessed_at = CURRENT_TIMESTAMP\n WHERE user_id = 42 AND course_id = 7;\nINSERT INTO activity_events (user_id, kind, ref_type, ref_id)\nVALUES (42, 'enrolled', 'course', 7);\nCOMMIT;`,
              },
            ],
            resources: [DOC('PostgreSQL — Transaction Isolation', 'https://www.postgresql.org/docs/current/transaction-iso.html', 'postgresql.org')],
          },
        ],
      },
      {
        slug: 'operations',
        title: 'Operations & Migrations',
        summary: 'Safe migrations, backups, replication, the capstone.',
        level: 'advanced',
        lessons: [
          {
            slug: 'migrations',
            title: 'Migrations Without Downtime',
            kind: 'reading',
            minutes: 26,
            objectives: ['Write backwards-compatible migrations', 'Backfill in batches', 'Plan a rollback'],
            body: `## Expand → migrate → contract

1. **Expand**: add the new nullable column or table. Old code keeps working.
2. **Migrate**: deploy code that writes to both shapes, then backfill in batches.
3. **Contract**: once nothing reads the old shape, drop it.

Each step is deployable and reversible on its own.

## Backfill in batches

\`\`\`sql
UPDATE users SET theme = 'system' WHERE theme IS NULL AND id BETWEEN 1 AND 1000;
\`\`\`

One giant UPDATE locks rows and bloats the log. Batch by id range, commit each batch, and log progress so a restart resumes.

## Never rewrite history

Migrations are append-only files applied in order. Editing an applied migration means environments silently diverge.

## Test the rollback

A migration you cannot reverse is a one-way door. Write the down-migration, and practise restoring from backup at least once.

## Backups

\`\`\`bash
sqlite3 app.db ".backup backup-$(date +%F).db"
\`\`\`

Take one before every migration. A backup you have never restored is a hope, not a backup.`,
            code: [
              {
                language: 'sql',
                caption: 'Additive migration, then a guarded backfill',
                source: `-- 0007_add_theme.sql (expand)\nALTER TABLE user_preferences ADD COLUMN theme TEXT NOT NULL DEFAULT 'system';\n\n-- 0008_backfill_theme.sql (migrate, batched)\nUPDATE user_preferences\n   SET theme = 'dark'\n WHERE theme = 'system'\n   AND user_id BETWEEN 1 AND 500;`,
              },
            ],
            resources: [DOC('PostgreSQL — ALTER TABLE', 'https://www.postgresql.org/docs/current/sql-altertable.html', 'postgresql.org')],
          },
          {
            slug: 'db-capstone',
            title: 'Capstone: Design a Schema That Cannot Lie',
            kind: 'project',
            minutes: 45,
            objectives: ['Model a real domain', 'Enforce invariants in the schema', 'Prove it with queries and a rollback'],
            body: `## Brief

Design the database for a small course platform:

1. ER diagram: users, courses, modules, lessons, enrolments, progress, assessments, submissions.
2. \`schema.sql\` with foreign keys, unique constraints, checks and indexes.
3. Seed script with at least 2 courses, 6 lessons and 3 users.
4. Five queries that answer real product questions (e.g. "which lessons does this user have left?"), each with an index that supports it and a query plan shown.
5. A migration that adds a column, plus its rollback.

## Completion criteria

- Attempting to insert a duplicate progress row fails (unique constraint), not silently duplicates.
- Deleting a course removes its modules and lessons (cascade verified with a query).
- Every one of the five queries uses an index (plan attached).
- Backup taken, restored into a fresh file, and row counts compared.

## Review question

For each table: what prevents two rows from contradicting each other? If the answer is "the application code", consider whether a constraint would be better.`,
            code: [
              {
                language: 'sql',
                caption: 'Invariants enforced by the schema',
                source: `CREATE TABLE lesson_progress (\n  id INTEGER PRIMARY KEY,\n  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,\n  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),\n  completed_at TEXT,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE (user_id, lesson_id)\n);\n\n-- completed_at must exist exactly when status = completed\nCREATE TRIGGER trg_progress_completed_at\nBEFORE UPDATE ON lesson_progress\nWHEN NEW.status = 'completed' AND NEW.completed_at IS NULL\nBEGIN\n  SELECT RAISE(ABORT, 'completed_at required for completed lessons');\nEND;`,
              },
            ],
            resources: [DOC('SQLite — CREATE TRIGGER', 'https://www.sqlite.org/lang_createtrigger.html', 'sqlite.org')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Database Foundations Check',
        moduleSlug: 'modelling',
        passScore: 70,
        timeLimitMinutes: 8,
        questions: [
          {
            prompt: 'A `tags` column containing "python,dsa,ai" violates:',
            options: ['1NF (atomic values)', '2NF', '3NF', 'No normal form'],
            correct: 0,
            explanation: 'Repeating groups inside one column break first normal form; use a join table.',
          },
          {
            prompt: 'In a composite index (user_id, created_at), which query benefits least?',
            options: ['WHERE user_id = 5', 'WHERE user_id = 5 ORDER BY created_at DESC', 'WHERE created_at > \'2026-01-01\'', 'WHERE user_id = 5 AND created_at > \'2026-01-01\''],
            correct: 2,
            explanation: 'The leftmost column must be constrained for the index to be used for the range on the second column.',
          },
          {
            prompt: 'The classic N+1 problem is:',
            options: ['An off-by-one error', 'One query to list rows plus one query per row for related data', 'A missing foreign key', 'An isolation level'],
            correct: 1,
            explanation: 'Batch the related fetch with a join or an IN clause to collapse N+1 into 2 queries.',
          },
          {
            prompt: 'The safest way to add a NOT NULL column to a large live table is:',
            options: ['ALTER TABLE with a default in one step during peak traffic', 'Add it nullable, backfill in batches, then enforce NOT NULL', 'Drop and recreate the table', 'Skip the column'],
            correct: 1,
            explanation: 'Expand, migrate, contract keeps every step deployable and reversible.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'db-schema-design',
        title: 'Course Platform Schema',
        difficulty: 'intermediate',
        estHours: 10,
        brief:
          'Design and implement the capstone schema: ER diagram, constraints, indexes, five product queries with plans, and a reversible migration.',
      },
    ],
    exercises: [
      {
        slug: 'db-select-left-join',
        title: 'Lessons remaining for a user',
        difficulty: 'medium',
        prompt:
          'Read: number of lessons `n`, then n lines `lessonId` (all lessons of a course), then number of completed lessons `m`, then m lines of completed lesson ids. Print the ids of lessons NOT completed, one per line, in the original order.',
        starter: 'n = int(input())\nlessons = [int(input()) for _ in range(n)]\nm = int(input())\ndone = {int(input()) for _ in range(m)}\n# your code here\n',
        solution:
          'n = int(input())\nlessons = [int(input()) for _ in range(n)]\nm = int(input())\ndone = {int(input()) for _ in range(m)}\nfor l in lessons:\n    if l not in done:\n        print(l)\n',
        tests: [
          { input: '3\n1\n2\n3\n1\n2\n', expected: '1\n3' },
          { input: '2\n5\n6\n2\n5\n6\n', expected: '' },
        ],
      },
    ],
  },
  {
    slug: 'system-design',
    title: 'System Design',
    tagline: 'Reason about scale, failure and trade-offs out loud.',
    category: 'Architecture',
    icon: 'network',
    level: 'Intermediate → Advanced',
    durationHours: 40,
    outcomes: [
      'Run a structured design interview',
      'Estimate capacity and identify bottlenecks',
      'Choose consistency and caching strategies deliberately',
      'Describe failure modes and their mitigations',
    ],
    prereqs: ['Web fundamentals', 'Databases', 'Basic networking'],
    description:
      'System design is applied trade-off reasoning. This course gives you a repeatable process, the numbers to reason with, and the standard building blocks — then has you design six real systems end to end.',
    modules: [
      {
        slug: 'fundamentals',
        title: 'Fundamentals',
        summary: 'The design process, requirements, capacity estimation.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'design-process',
            title: 'A Process You Can Repeat',
            kind: 'reading',
            minutes: 24,
            objectives: ['Run the seven-step process', 'Ask clarifying questions first', 'State trade-offs explicitly'],
            body: `## Seven steps

1. **Clarify requirements** — functional (what it does) and non-functional (scale, latency, availability).
2. **Estimate** — QPS, storage, bandwidth. Order-of-magnitude is enough.
3. **API sketch** — the few endpoints that matter.
4. **Data model** — entities, access patterns, indexes.
5. **High-level diagram** — client, API, services, stores, queues.
6. **Deep dive** — the one or two hard parts.
7. **Failure and scale** — what breaks first, and what you do about it.

## Ask before you draw

"Who are the users?", "Read-heavy or write-heavy?", "Is eventual consistency acceptable?", "What is the latency budget?" Every one of these changes the design.

## State trade-offs, not opinions

> "I'll cache the course catalogue for 60 s because it changes rarely and a stale minute is acceptable; progress data is not cached because correctness matters more than latency there."

That sentence is worth more than a diagram.

## Numbers to keep in your head

- One modern server: ~10k simple requests/s, ~1 GB/s network.
- SSD random read: ~100 µs. Network round trip in a datacentre: ~0.5 ms.
- 1 million requests/day ≈ 12 requests/s average.
- 1 KB × 1 M rows = 1 GB.`,
            code: [
              {
                language: 'python',
                caption: 'Capacity estimation worksheet',
                source: `dau = 1_000_000\nrequests_per_user_per_day = 20\nrows_per_request = 2\nrow_bytes = 512\npeak_factor = 3\n\nrequests_per_day = dau * requests_per_user_per_day\ndaily_rps = requests_per_day / 86_400\npeak_rps = daily_rps * peak_factor\nstorage_per_day_gb = requests_per_day * rows_per_request * row_bytes / 1e9\n\nprint(f"requests/day: {requests_per_day:,}")\nprint(f"avg {daily_rps:.1f} rps, peak {peak_rps:.1f} rps")\nprint(f"new data/day: {storage_per_day_gb:.1f} GB, per year: {storage_per_day_gb * 365:.0f} GB")`,
              },
            ],
            resources: [DOC('System Design Primer (GitHub)', 'https://github.com/donnemartin/system-design-primer', 'GitHub')],
          },
          {
            slug: 'building-blocks',
            title: 'The Standard Building Blocks',
            kind: 'reading',
            minutes: 28,
            objectives: ['Know what each component buys you', 'Avoid premature complexity', 'Pick a cache invalidation strategy'],
            body: `## Components and what they solve

| Component | Solves | Costs |
|---|---|---|
| Load balancer | distributing traffic | one more hop |
| Read replica | read scaling | replication lag |
| Cache (Redis) | latency and read load | staleness |
| CDN | static asset latency | invalidation complexity |
| Message queue | decoupling, bursts | eventual consistency |
| Object store | large blobs | not queryable |
| Search index | text search | second source of truth |
| Sharded database | write scaling | cross-shard queries |

## Caching strategies

- **Cache-aside**: app reads cache, on miss reads DB and fills. Simple, most common.
- **Write-through**: write cache and DB together. Consistent, slower writes.
- **Write-behind**: write cache, flush later. Fast, risks loss.

Invalidation is the hard part. TTL is honest and simple; explicit invalidation is precise but bug-prone. Start with short TTLs.

## Consistency choices

Strong consistency is simpler to reason about and harder to scale. Eventual consistency scales and forces you to design for stale reads (idempotent retries, monotonic UI).

## The complexity rule

Add a component only when you can name the specific problem it solves **and** the failure it introduces. A single well-indexed database handles far more than people expect.`,
            code: [
              {
                language: 'python',
                caption: 'Cache-aside with TTL and single-flight',
                source: `import time\n\ncache = {}\nTTL = 60\n\ndef get_catalogue(db_read):\n    now = time.time()\n    hit = cache.get("catalogue")\n    if hit and now - hit[0] < TTL:\n        return hit[1], "cache"\n    value = db_read()          # in production: coalesce concurrent misses\n    cache["catalogue"] = (now, value)\n    return value, "db"\n\nreads = {"n": 0}\ndef fake_db():\n    reads["n"] += 1\n    return ["python", "dsa"]\n\nfor _ in range(3):\n    value, source = get_catalogue(fake_db)\n    print(source, value)\nprint("db reads:", reads["n"])`,
              },
            ],
            resources: [DOC('AWS — Caching best practices', 'https://aws.amazon.com/caching/best-practices/', 'AWS')],
          },
        ],
      },
      {
        slug: 'scaling',
        title: 'Scaling & Reliability',
        summary: 'Partitioning, replication, queues, failure modes.',
        level: 'advanced',
        lessons: [
          {
            slug: 'partitioning',
            title: 'Partitioning and Replication',
            kind: 'reading',
            minutes: 26,
            objectives: ['Choose a shard key', 'Understand replication lag effects', 'Design for hot partitions'],
            body: `## Sharding

Split rows across databases by a key. Choose the key by your dominant access pattern:

- Shard by \`user_id\`: every query for one user hits one shard. Good for per-user data.
- Shard by \`created_at\`: good for time-range analytics, terrible for per-user reads.
- Hash keys spread evenly but destroy range queries.

## Hot partitions

A celebrity user, a viral post, a single popular course — one key takes most traffic. Mitigations: key salting (append a random suffix, then fan-in), caching in front, or splitting that entity out.

## Replication

Leader accepts writes; followers serve reads. Lag means a user may not see their own write — the "read your writes" problem. Fix: route that user's reads to the leader briefly after a write, or pass a consistency token.

## Failure modes to name

| Failure | Mitigation |
|---|---|
| one replica dies | failover, retry with backoff |
| leader dies | promote a follower, accept brief write unavailability |
| network partition | quorum writes, explicit behaviour choice (CP or AP) |
| retry storm | jittered exponential backoff, circuit breaker |

## Queues

Queues absorb bursts and decouple producers from consumers. They also mean: duplicate deliveries (make consumers idempotent), ordering is not guaranteed (use a partition key), and poison messages need a dead-letter queue.`,
            code: [
              {
                language: 'python',
                caption: 'Jittered exponential backoff',
                source: `import random, time\nrandom.seed(2)\n\ndef backoff_delays(attempts=5, base=0.1, cap=5.0):\n    for i in range(attempts):\n        delay = min(cap, base * 2 ** i)\n        jitter = random.uniform(0, delay / 2)\n        yield round(delay + jitter, 3)\n\nprint(list(backoff_delays()))\nprint("without jitter, all clients retry at once -> thundering herd")`,
              },
            ],
            resources: [DOC('AWS — Timeouts, retries and backoff with jitter', 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/', 'AWS')],
          },
          {
            slug: 'design-capstone',
            title: 'Capstone: Design a Learning Platform',
            kind: 'project',
            minutes: 50,
            objectives: ['Produce a complete design document', 'Estimate capacity with numbers', 'Name failure modes and mitigations'],
            body: `## Brief

Design a learning platform serving 1 M monthly users:

1. Requirements: functional and non-functional, with numbers.
2. Capacity estimate: QPS, storage, bandwidth for year one and year three.
3. API sketch: six endpoints with methods and status codes.
4. Data model: entities, keys, the two most important indexes.
5. Architecture diagram: client, CDN, API tier, database, cache, queue, code-execution workers.
6. Deep dive: secure code execution at scale, or the progress-tracking write path.
7. Failure analysis: three failures, their blast radius, and mitigation.
8. One thing you deliberately did **not** build, and why.

## Completion criteria

- Every component has a stated reason and a stated cost.
- The estimate arithmetic is shown and checkable.
- Failure analysis names detection as well as mitigation.
- The document is readable by an engineer who was not in the room.

## Review

Exchange documents with a peer. Each reviews the other's: find one unstated assumption and one component that could be removed without harm.`,
            code: [
              {
                language: 'python',
                caption: 'Year-three storage estimate',
                source: `users = 1_000_000\nlessons = 12 * 4 * 6                 # courses x modules x lessons\nprogress_rows = users * lessons * 0.3  # 30% engaged\nrow_bytes = 200\nindex_overhead = 1.4\n\nraw_gb = progress_rows * row_bytes / 1e9\nprint(f"progress rows: {progress_rows:,.0f}")\nprint(f"raw {raw_gb:.1f} GB, with indexes {raw_gb * index_overhead:.1f} GB")\nprint("fits comfortably on one primary with a replica; shard only past ~10x this")`,
              },
            ],
            resources: [DOC('AWS — Well-Architected: Reliability Pillar', 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html', 'AWS')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'System Design Check',
        moduleSlug: 'fundamentals',
        passScore: 70,
        timeLimitMinutes: 8,
        questions: [
          {
            prompt: 'The first thing to do in a system design discussion is:',
            options: ['Draw the database schema', 'Clarify functional and non-functional requirements', 'Choose a cloud provider', 'Write the API'],
            correct: 1,
            explanation: 'Requirements determine every later decision; guessing them wastes the whole design.',
          },
          {
            prompt: 'Sharding by created_at is a poor choice when:',
            options: ['Data is write-heavy', 'Queries mostly fetch per user', 'You need analytics', 'You use a queue'],
            correct: 1,
            explanation: 'Per-user reads would have to fan out across all shards.',
          },
          {
            prompt: 'Replication lag causes:',
            options: ['Lost writes', 'A user not seeing their own recent write on a replica read', 'Index corruption', 'Deadlocks'],
            correct: 1,
            explanation: 'Read-your-writes consistency requires routing recent writes to the leader or carrying a consistency token.',
          },
          {
            prompt: 'The main risk of a write-behind cache is:',
            options: ['Slower reads', 'Data loss if the cache fails before flushing', 'Higher latency writes', 'Index bloat'],
            correct: 1,
            explanation: 'Acknowledging writes before they are durable trades durability for speed.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'system-design-document',
        title: 'Learning Platform Design Document',
        difficulty: 'advanced',
        estHours: 10,
        brief:
          'Write the capstone design document: requirements, capacity numbers, API, data model, architecture, one deep dive, failure analysis and an explicit non-goal.',
      },
    ],
    exercises: [
      {
        slug: 'sysdesign-qps',
        title: 'Peak QPS estimate',
        difficulty: 'easy',
        prompt:
          'Read three integers `dailyActiveUsers requestsPerUser peakFactor` and print the peak requests per second as an integer (floor of dau*reqPerUser/86400*peakFactor).',
        starter: 'dau, rpu, pf = map(int, input().split())\n# your code here\n',
        solution: 'dau, rpu, pf = map(int, input().split())\nprint(int(dau * rpu / 86400 * pf))\n',
        tests: [
          { input: '1000000 20 3\n', expected: '694' },
          { input: '86400 1 1\n', expected: '1' },
        ],
      },
    ],
  },
];
