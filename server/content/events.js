/**
 * Event seed data — one quiz, one competition, and one closed example with results.
 *
 * Every challenge here is original, and every test case is checked against a reference
 * solution when the seed runs, so a challenge that cannot be solved cannot be published.
 * Nothing is dated in the past except the closed example, so the student experience is
 * "upcoming / registration open / live" rather than a wall of finished events.
 */
import { all, get, run, tx } from '../db/index.js';
import { runTests } from '../sandbox/index.js';

const DAY = 86_400_000;

function at(daysFromNow, hourUtc = 4) {
  const d = new Date(Date.now() + daysFromNow * DAY);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
}

export const EVENTS = [
  {
    slug: 'python-placement-quiz-1',
    title: 'Python Placement Quiz — Round 1',
    summary: 'Twelve minutes, ten questions on Python fundamentals, ranked on real scores.',
    description_md:
      'A quick check of the Python you will be asked about in a first interview: values and types, slicing, mutation, scope, exceptions and the standard library. Every question is graded the moment you submit, with the reason shown.',
    courseSlug: 'python-programming',
    format: 'quiz',
    durationMinutes: 15,
    rules_md:
      '- One attempt per question; your best score counts.\n- No negative marking.\n- The leaderboard is published after the event closes.\n- You can open your notes — this tests understanding, not memory.',
    eligibility_md: 'Open to every Lumen learner. No prerequisites.',
    challenges: [
      {
        slug: 'floor-division',
        title: 'Floor division',
        prompt_md: 'What is the value of `7 // 2` in Python 3?',
        options: ['3', '3.5', '4', '1'],
        correct: 0,
        explanation: '`//` is floor division: 7/2 is 3.5, floored to 3. Use `/` for true division.',
        points: 10,
      },
      {
        slug: 'mutable-default',
        title: 'The mutable default trap',
        prompt_md: 'What does this print?\n\n```python\ndef add(x, bucket=[]):\n    bucket.append(x)\n    return bucket\n\nprint(add(1))\nprint(add(2))\n```',
        options: ['`[1]` then `[2]`', '`[1]` then `[1, 2]`', '`[1]` then `[1]`', 'A TypeError'],
        correct: 1,
        explanation: 'Default arguments are evaluated once, when the function is defined, so the same list is reused.',
        points: 10,
      },
      {
        slug: 'slice-copy',
        title: 'Slicing is a copy',
        prompt_md: '```python\na = [1, 2, 3]\nb = a[:]\nb.append(4)\nprint(a)\n```\n\nWhat is printed?',
        options: ['`[1, 2, 3, 4]`', '`[1, 2, 3]`', '`[]`', '`None`'],
        correct: 1,
        explanation: '`a[:]` makes a shallow copy, so appending to `b` does not touch `a`.',
        points: 10,
      },
      {
        slug: 'truthy-empty',
        title: 'Empty collections',
        prompt_md: 'Which of these is **falsy** in Python?',
        options: ['`0`', '`[]`', '`""`', 'All of them'],
        correct: 3,
        explanation: 'Empty containers, empty strings and numeric zero are all falsy.',
        points: 10,
      },
      {
        slug: 'string-immutable',
        title: 'Strings do not change',
        prompt_md: '```python\ns = "lumen"\ns.upper()\nprint(s)\n```\n\nWhat is printed?',
        options: ['`LUMEN`', '`lumen`', '`Lumen`', 'An error'],
        correct: 1,
        explanation: 'Strings are immutable: `upper()` returns a new string and the original is unchanged.',
        points: 10,
      },
      {
        slug: 'dict-get',
        title: 'Missing keys',
        prompt_md: '`d = {"a": 1}` — which expression returns `0` instead of raising?',
        options: ['`d["b"]`', '`d.get("b", 0)`', '`d.b`', '`d.pop("b")`'],
        correct: 1,
        explanation: '`get` returns the default when the key is absent; indexing and `pop` raise `KeyError`.',
        points: 10,
      },
      {
        slug: 'range-off-by-one',
        title: 'Range boundaries',
        prompt_md: '`list(range(1, 5))` is:',
        options: ['`[1, 2, 3, 4, 5]`', '`[1, 2, 3, 4]`', '`[0, 1, 2, 3, 4]`', '`[2, 3, 4, 5]`'],
        correct: 1,
        explanation: '`range` stops before its stop value: 1, 2, 3, 4.',
        points: 10,
      },
      {
        slug: 'exception-order',
        title: 'Catching precisely',
        prompt_md: 'Why is `except Exception:` worse than `except ValueError:` in most code?',
        options: [
          'It is slower',
          'It hides bugs you did not expect, including typos and real failures',
          'It is not valid syntax',
          'It cannot be used with `finally`',
        ],
        correct: 1,
        explanation: 'A broad handler swallows everything, so a genuine bug looks like handled input.',
        points: 10,
      },
      {
        slug: 'comprehension-scope',
        title: 'Comprehension variables',
        prompt_md: '```python\nsquares = [n * n for n in range(3)]\nprint(squares, n)\n```',
        options: ['`[0, 1, 4] 2`', '`[0, 1, 4]` then a NameError', '`[1, 4, 9] 3`', 'A SyntaxError'],
        correct: 1,
        explanation: 'In Python 3 a comprehension has its own scope, so `n` does not exist afterwards.',
        points: 10,
      },
      {
        slug: 'is-vs-equals',
        title: 'Identity or equality',
        prompt_md: 'When should you use `is` rather than `==`?',
        options: [
          'To compare strings',
          'To compare numbers',
          'To compare against `None`',
          'They are interchangeable',
        ],
        correct: 2,
        explanation: '`is` compares identity. `None` is a singleton, so `x is None` is correct and idiomatic.',
        points: 10,
      },
    ],
  },

  {
    slug: 'dsa-sprint-autumn',
    title: 'DSA Sprint — Arrays and Two Pointers',
    summary: 'Three timed coding challenges, graded by the real runtime with hidden-style tests shown after grading.',
    description_md:
      'A short competitive sprint on the patterns that show up first in interviews: running sums, two pointers, and in-place work. Each solution is executed on the server and checked against test cases; you see exactly which case failed and why.',
    courseSlug: 'data-structures-algorithms',
    format: 'code',
    durationMinutes: 120,
    rules_md:
      '- Each challenge is graded automatically against test cases.\n- Partial credit is given per passing test.\n- Your best score per challenge counts.\n- Only standard library code; no network, no files.',
    eligibility_md: 'Comfortable writing loops and functions in Python.',
    challenges: [
      {
        slug: 'prefix-sums',
        title: 'Running total',
        prompt_md:
          'Read one line of space-separated integers and print the running total after each number, space-separated.\n\nInput `1 2 3` → output `1 3 6`.',
        language: 'python',
        starter_code: 'nums = [int(x) for x in input().split()]\n# print the running totals\n',
        reference: 'nums = [int(x) for x in input().split()]\ntotal = 0\nout = []\nfor n in nums:\n    total += n\n    out.append(str(total))\nprint(" ".join(out))\n',
        tests: [
          { input: '1 2 3\n', expected: '1 3 6' },
          { input: '5\n', expected: '5' },
          { input: '-1 1 -1\n', expected: '-1 0 -1' },
        ],
        points: 100,
      },
      {
        slug: 'two-sum-sorted',
        title: 'Pair that adds up',
        prompt_md:
          'Read a target on the first line and a sorted list on the second. Print the two numbers (smaller first) that add to the target, or `none`.\n\nInput:\n```\n9\n1 2 4 7 11\n```\nOutput: `2 7`',
        language: 'python',
        starter_code: 'target = int(input())\nnums = [int(x) for x in input().split()]\n',
        reference:
          'target = int(input())\nnums = [int(x) for x in input().split()]\ni, j = 0, len(nums) - 1\nwhile i < j:\n    s = nums[i] + nums[j]\n    if s == target:\n        print(nums[i], nums[j])\n        break\n    if s < target:\n        i += 1\n    else:\n        j -= 1\nelse:\n    print("none")\n',
        tests: [
          { input: '9\n1 2 4 7 11\n', expected: '2 7' },
          { input: '100\n1 2 3\n', expected: 'none' },
          { input: '5\n1 4 5\n', expected: '1 4' },
        ],
        points: 100,
      },
      {
        slug: 'reverse-in-place',
        title: 'Reverse without slicing',
        prompt_md:
          'Read a list of words and print it reversed, using swaps rather than `[::-1]`.\n\nInput `a b c` → output `c b a`.',
        language: 'python',
        starter_code: 'words = input().split()\n',
        reference:
          'words = input().split()\ni, j = 0, len(words) - 1\nwhile i < j:\n    words[i], words[j] = words[j], words[i]\n    i += 1\n    j -= 1\nprint(" ".join(words))\n',
        tests: [
          { input: 'a b c\n', expected: 'c b a' },
          { input: 'one\n', expected: 'one' },
          { input: 'x y\n', expected: 'y x' },
        ],
        points: 100,
      },
    ],
  },

  {
    slug: 'logic-puzzle-warmup',
    title: 'Logic Puzzle Warm-up',
    summary: 'A completed example event, so you can see how results and rankings are published.',
    description_md: 'Five reasoning questions from the aptitude track. This event is closed and its results are published.',
    courseSlug: null,
    format: 'quiz',
    durationMinutes: 10,
    closedExample: true,
    rules_md: 'Standard multiple choice, no negative marking.',
    eligibility_md: 'Open to everyone.',
    challenges: [
      {
        slug: 'series-next',
        title: 'Next in the series',
        prompt_md: 'What comes next: 2, 6, 12, 20, 30, ?',
        options: ['36', '40', '42', '45'],
        correct: 2,
        explanation: 'Differences are 4, 6, 8, 10, so the next difference is 12: 30 + 12 = 42. The terms are n(n+1).',
        points: 10,
      },
      {
        slug: 'blood-relation',
        title: 'Blood relations',
        prompt_md: 'A is B\u2019s sister. C is B\u2019s mother. D is C\u2019s father. How is A related to D?',
        options: ['Daughter', 'Granddaughter', 'Sister', 'Grandmother'],
        correct: 1,
        explanation: 'C is A\u2019s mother and D is C\u2019s father, so D is A\u2019s grandfather and A is his granddaughter.',
        points: 10,
      },
      {
        slug: 'direction',
        title: 'Direction sense',
        prompt_md: 'You walk 3 km north, turn right and walk 4 km. How far are you from the start?',
        options: ['5 km', '7 km', '1 km', '12 km'],
        correct: 0,
        explanation: 'A 3-4-5 right triangle: √(3² + 4²) = 5 km.',
        points: 10,
      },
      {
        slug: 'odd-one-out',
        title: 'Odd one out',
        prompt_md: 'Which does not belong: 8, 27, 64, 100?',
        options: ['8', '27', '64', '100'],
        correct: 3,
        explanation: '8 = 2³, 27 = 3³, 64 = 4³ are perfect cubes; 100 is a square but not a cube.',
        points: 10,
      },
      {
        slug: 'clock-angle',
        title: 'Clock angle',
        prompt_md: 'What is the angle between the hands at 3:30?',
        options: ['90°', '75°', '85°', '60°'],
        correct: 1,
        explanation: 'Minute hand 180°, hour hand 105°, difference 75°.',
        points: 10,
      },
    ],
  },
];

/**
 * Verify every code challenge against its reference solution before anything is written.
 * Returns a list of problems; an empty list means every challenge is solvable.
 */
export async function verifyEvents() {
  const problems = [];
  for (const event of EVENTS) {
    for (const ch of event.challenges) {
      if (event.format !== 'code') {
        if (!Array.isArray(ch.options) || ch.options.length < 2) problems.push(`${event.slug}/${ch.slug}: needs options`);
        if (!Number.isInteger(ch.correct) || ch.correct < 0 || ch.correct >= (ch.options || []).length) {
          problems.push(`${event.slug}/${ch.slug}: correct index out of range`);
        }
        continue;
      }
      if (!ch.reference) {
        problems.push(`${event.slug}/${ch.slug}: no reference solution`);
        continue;
      }
      const r = await runTests({ language: ch.language, source: ch.reference, tests: ch.tests });
      if (!r.ok) {
        problems.push(`${event.slug}/${ch.slug}: sandbox ${r.error.code}`);
        continue;
      }
      if (!r.data.allPassed) {
        const failed = r.data.results.filter((x) => !x.passed).map((x) => `${JSON.stringify(x.input)} → got ${JSON.stringify(x.actual)}, want ${JSON.stringify(x.expected)}`);
        problems.push(`${event.slug}/${ch.slug}: reference fails ${failed.join('; ')}`);
      }
    }
  }
  return problems;
}

/** Write the events into the database. Idempotent by slug. */
export async function seedEvents() {
  const problems = await verifyEvents();
  if (problems.length) return { ok: false, problems };

  return tx(() => {
    let created = 0;
    let challenges = 0;
    for (const event of EVENTS) {
      const course = event.courseSlug ? get('SELECT id FROM courses WHERE slug = ?', [event.courseSlug]) : null;
      const existing = get('SELECT * FROM competitions WHERE slug = ?', [event.slug]);
      const status = event.closedExample ? 'published' : 'announced';
      const window = event.closedExample
        ? { ro: at(-14), rc: at(-10), s: at(-9), e: at(-7) }
        : event.format === 'quiz'
          ? { ro: at(-1), rc: at(9), s: at(10), e: at(12) }
          : { ro: at(2), rc: at(16), s: at(17), e: at(18) };

      if (existing) {
        run(
          `UPDATE competitions SET title = ?, summary = ?, description_md = ?, course_id = ?, format = ?, duration_minutes = ?,
                  registration_opens_at = ?, registration_closes_at = ?, starts_at = ?, ends_at = ?, rules_md = ?, eligibility_md = ?, updated_at = ?
            WHERE id = ?`,
          [
            event.title, event.summary, event.description_md, course?.id ?? null, event.format, event.durationMinutes,
            window.ro, window.rc, window.s, window.e, event.rules_md, event.eligibility_md, new Date().toISOString(), existing.id,
          ],
        );
      } else {
        run(
          `INSERT INTO competitions (slug, title, summary, description_md, course_id, status, format, duration_minutes,
                  registration_opens_at, registration_closes_at, starts_at, ends_at, rules_md, eligibility_md)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            event.slug, event.title, event.summary, event.description_md, course?.id ?? null, status, event.format, event.durationMinutes,
            window.ro, window.rc, window.s, window.e, event.rules_md, event.eligibility_md,
          ],
        );
        created += 1;
      }
      const competition = get('SELECT * FROM competitions WHERE slug = ?', [event.slug]);

      event.challenges.forEach((ch, i) => {
        const exists = get('SELECT id FROM competition_challenges WHERE competition_id = ? AND slug = ?', [competition.id, ch.slug]);
        const values = [
          ch.title,
          ch.prompt_md,
          event.format === 'quiz' ? 'quiz' : ch.language || 'python',
          ch.starter_code || '',
          JSON.stringify(ch.tests || []),
          JSON.stringify(ch.options || []),
          event.format === 'quiz' ? ch.correct : null,
          ch.explanation || '',
          ch.points,
          i,
        ];
        if (exists) {
          run(
            `UPDATE competition_challenges SET title = ?, prompt_md = ?, language = ?, starter_code = ?, test_json = ?,
                    options_json = ?, correct_index = ?, explanation = ?, points = ?, sort_order = ? WHERE id = ?`,
            [...values, exists.id],
          );
        } else {
          run(
            `INSERT INTO competition_challenges (competition_id, slug, title, prompt_md, language, starter_code, test_json,
                    options_json, correct_index, explanation, points, sort_order)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [competition.id, ch.slug, ...values],
          );
          challenges += 1;
        }
      });
    }
    return { ok: true, created, challenges };
  });
}

export function eventCounts() {
  return {
    events: get('SELECT COUNT(*) AS n FROM competitions').n,
    challenges: get('SELECT COUNT(*) AS n FROM competition_challenges').n,
    byStatus: all('SELECT status, COUNT(*) AS n FROM competitions GROUP BY status'),
  };
}
