/**
 * Course seed data — 12 courses, each with modules, lessons and real written content.
 * Kept as JS so long markdown bodies stay readable; ids are derived from slugs so
 * re-seeding is idempotent and never disturbs student progress.
 *
 * Every lesson body is original material written for Lumen. External links point only
 * to officially published, freely accessible resources (documentation, MDN, Python docs,
 * MIT OCW, Kaggle docs) and are attributed.
 */

const DOC = (title, url, provider, licenseNote = 'Official documentation — linked, not redistributed.') => ({ title, url, provider, kind: 'docs', licenseNote });
const VIDEO = (title, url, provider) => ({ title, url, provider, kind: 'video', licenseNote: 'Hosted by the provider — embedded as a link, never copied.' });

export const COURSES = [
  /* ───────────────────────── 01 PYTHON ───────────────────────── */
  {
    slug: 'python-programming',
    title: 'Python Programming',
    tagline: 'From first script to well-structured programs.',
    category: 'Programming',
    icon: 'code',
    level: 'Beginner → Advanced',
    durationHours: 48,
    outcomes: [
      'Write idiomatic Python using functions, data structures and comprehensions',
      'Model problems with classes, dataclasses and type hints',
      'Handle files, errors and virtual environments confidently',
      'Test and package code that other people can run',
    ],
    prereqs: ['A computer with Python 3.11+ installed', 'Comfort with a text editor', 'No prior programming required'],
    description:
      'Python is the most practical first language for technology work: readable enough to learn from, powerful enough to build data pipelines, APIs and AI systems. This course starts from variables and control flow and ends with tested, typed, installable packages. Every module pairs explanation with runnable code in the lab.',
    modules: [
      {
        slug: 'foundations',
        title: 'Foundations',
        summary: 'How Python executes code, values and types, control flow.',
        level: 'beginner',
        lessons: [
          {
            slug: 'how-python-runs',
            title: 'How Python Actually Runs Your Code',
            kind: 'reading',
            minutes: 18,
            objectives: ['Describe the difference between source, bytecode and the interpreter loop', 'Use the REPL to explore values interactively'],
            body: `## Two ways to run Python

When you type \`python hello.py\`, the interpreter reads your file, compiles it to **bytecode** (a compact instruction set), and then a virtual machine executes those instructions. You rarely see this layer, but knowing it exists explains three everyday behaviours:

1. **Syntax errors appear before any code runs** — the whole file must compile first.
2. **\`.pyc\` files** in \`__pycache__\` are the cached bytecode. Deleting them is safe.
3. **Tracebacks are read bottom-up**: the last line is the error type and message, the lines above show the call path.

## The REPL is a tool, not a toy

Start \`python\` with no arguments and you get a read-eval-print loop. It is the fastest way to answer "what does this expression actually return?" — far faster than guessing.

\`\`\`python
>>> 7 // 2
3
>>> 7 / 2
3.5
>>> 0.1 + 0.2
0.30000000000000004
\`\`\`

That last result is not a bug. Binary floating point cannot represent 0.1 exactly. When money is involved, use \`decimal.Decimal\` — this single fact prevents a whole class of production incidents.

## Names are labels, not boxes

\`\`\`python
a = [1, 2, 3]
b = a          # b is another label on the same list
b.append(4)
print(a)       # [1, 2, 3, 4]
\`\`\`

Python variables hold *references* to objects. Assignment never copies. Understanding this makes the classic bug — "I modified a list and my original changed" — obvious instead of mysterious. Use \`a.copy()\` or \`list(a)\` when you want a new list.

## Check your understanding

- Why does a syntax error in line 40 stop line 1 from running?
- What does \`id(a) == id(b)\` tell you after \`b = a\`?
- When would you reach for \`Decimal\` instead of \`float\`?`,
            code: [
              {
                language: 'python',
                caption: 'References in action',
                source: `a = [1, 2, 3]\nb = a\nb.append(4)\nprint("same object:", a is b, a)\n\nc = a.copy()\nc.append(5)\nprint("different object:", a is c, c)\n\nfrom decimal import Decimal\nprint(Decimal("0.1") + Decimal("0.2"))`,
              },
            ],
            resources: [
              DOC('The Python Tutorial — Using the Interpreter', 'https://docs.python.org/3/tutorial/interpreter.html', 'python.org'),
              DOC('Floating Point Arithmetic: Issues and Limitations', 'https://docs.python.org/3/tutorial/floatingpoint.html', 'python.org'),
            ],
          },
          {
            slug: 'types-and-operators',
            title: 'Values, Types and Operators',
            kind: 'reading',
            minutes: 22,
            objectives: ['Choose the right built-in type', 'Use truthiness deliberately', 'Avoid mutable default argument bugs'],
            body: `## The built-in types you actually use

| Type | Literal | Use for |
|---|---|---|
| \`int\` | \`42\` | counts, ids, anything exact |
| \`float\` | \`3.5\` | measurements, not money |
| \`str\` | \`"text"\` | human-readable text |
| \`bool\` | \`True\` | flags |
| \`None\` | \`None\` | "no value yet" |
| \`list\` | \`[1, 2]\` | ordered, changeable |
| \`tuple\` | \`(1, 2)\` | ordered, fixed (safe as dict keys) |
| \`dict\` | \`{"k": 1}\` | lookup by key |
| \`set\` | \`{1, 2}\` | membership, uniqueness |

## Truthiness

Empty containers, \`0\`, \`""\` and \`None\` are falsy; nearly everything else is truthy.

\`\`\`python
if not items:            # idiomatic
    print("empty")
\`\`\`

But be careful: \`if value:\` is wrong when \`0\` is a valid value. Then write \`if value is not None:\`.

## Strings are immutable

\`\`\`python
name = "lumen"
name.upper()      # returns a NEW string
print(name)       # still "lumen"
\`\`\`

Method calls on strings never mutate. f-strings are the default formatting tool:

\`\`\`python
score = 91
print(f"Score: {score:>5} | {score/100:.1%}")
\`\`\`

## The mutable-default trap

\`\`\`python
def add(item, bucket=[]):   # BUG: one list shared across all calls
    bucket.append(item)
    return bucket
\`\`\`

Default values are evaluated **once**, when the function is defined. Use \`bucket=None\` and create the list inside. This is one of the most common Python bugs in code review.

## Practice now

Open the Lab, choose Python, and predict the output before you run it.`,
            code: [
              {
                language: 'python',
                caption: 'Predict the output, then run',
                source: `def add(item, bucket=None):\n    if bucket is None:\n        bucket = []\n    bucket.append(item)\n    return bucket\n\nprint(add(1))\nprint(add(2))\n\nvalues = [0, 1, "", "a", None, []]\nprint([bool(v) for v in values])`,
              },
            ],
            resources: [DOC('Built-in Types', 'https://docs.python.org/3/library/stdtypes.html', 'python.org')],
          },
          {
            slug: 'control-flow',
            title: 'Control Flow Without the Tangles',
            kind: 'reading',
            minutes: 20,
            objectives: ['Write clear branching logic', 'Use loops with early exit', 'Recognise when a loop should be a comprehension'],
            body: `## Branching: prefer flat over nested

\`\`\`python
def access(user):
    if user is None:
        return "guest"
    if user.banned:
        return "blocked"
    return "member"
\`\`\`

Guard clauses ("return early") keep the happy path at one indent level. Deep nesting is a smell that usually means the function is doing too much.

## Loops that exit clearly

\`for\` iterates anything iterable: lists, strings, dicts, files, generators. \`while\` repeats until a condition breaks. Both support \`break\` and \`continue\`, and \`for/else\` — which runs only if no \`break\` happened:

\`\`\`python
for n in numbers:
    if n < 0:
        print("found a negative")
        break
else:
    print("all non-negative")
\`\`\`

## \`range\` and \`enumerate\`

\`range(start, stop, step)\` excludes \`stop\`. Use \`enumerate\` instead of manual counters:

\`\`\`python
for i, name in enumerate(names, start=1):
    print(i, name)
\`\`\`

## Comprehensions: readable transformations

\`\`\`python
squares = [n * n for n in range(10) if n % 2 == 0]
lookup = {user.id: user.name for user in users}
\`\`\`

Use them for a single transformation plus an optional filter. If you need two \`for\` clauses or a nested condition, write the loop — clarity beats cleverness.

## Mental model

A loop is a state machine with three parts: initialisation, condition, and update. Most loop bugs are a missing update (infinite loop) or an off-by-one in the condition.`,
            code: [
              {
                language: 'python',
                caption: 'FizzBuzz, idiomatically',
                source: `def fizzbuzz(n: int) -> list[str]:\n    out = []\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            out.append("FizzBuzz")\n        elif i % 3 == 0:\n            out.append("Fizz")\n        elif i % 5 == 0:\n            out.append("Buzz")\n        else:\n            out.append(str(i))\n    return out\n\nprint(fizzbuzz(16))`,
              },
            ],
            resources: [DOC('More Control Flow Tools', 'https://docs.python.org/3/tutorial/controlflow.html', 'python.org')],
          },
        ],
      },
      {
        slug: 'data-structures',
        title: 'Data Structures & Functions',
        summary: 'Collections, comprehensions, functions, scope and modules.',
        level: 'beginner',
        lessons: [
          {
            slug: 'collections-deep-dive',
            title: 'Lists, Dicts, Sets and When to Use Each',
            kind: 'reading',
            minutes: 25,
            objectives: ['Pick collections by complexity, not habit', 'Know the cost of membership tests', 'Use defaultdict and Counter'],
            body: `## Cost matters more than syntax

| Operation | list | dict | set |
|---|---|---|---|
| append / insert | O(1) / O(n) | — | — |
| lookup by key | O(n) scan | O(1) avg | O(1) avg |
| membership \`x in\` | O(n) | O(1) | O(1) |
| ordered | yes | yes (3.7+) | no |

The single most common performance mistake in beginner code is \`if item in my_list\` inside a loop over thousands of items. Convert the list to a set once and the loop drops from O(n²) to O(n).

\`\`\`python
seen = set()
duplicates = []
for row in rows:
    if row.id in seen:
        duplicates.append(row.id)
    seen.add(row.id)
\`\`\`

## Counter and defaultdict

\`\`\`python
from collections import Counter, defaultdict

counts = Counter(words)                 # word -> frequency
top = counts.most_common(3)
by_department = defaultdict(list)       # no KeyError on first append
for person in people:
    by_department[person.dept].append(person)
\`\`\`

## Sorting with keys

\`sorted(items, key=lambda x: (-x.score, x.name))\` sorts by score descending, then name ascending. Sorting is stable, so a second \`sorted\` preserves earlier order for ties — useful when you need multi-level ordering without a tuple.

## Copies: shallow vs deep

\`list.copy()\` copies the outer list only; inner lists are shared. \`copy.deepcopy\` duplicates everything, but is slow — reach for it only when nesting is real.`,
            code: [
              {
                language: 'python',
                caption: 'Set membership vs list membership',
                source: `import timeit\n\nnums = list(range(20000))\nas_list = nums\nas_set = set(nums)\n\nt_list = timeit.timeit(lambda: 19999 in as_list, number=2000)\nt_set = timeit.timeit(lambda: 19999 in as_set, number=2000)\nprint(f"list: {t_list:.4f}s  set: {t_set:.6f}s")`,
              },
            ],
            resources: [DOC('collections — Container datatypes', 'https://docs.python.org/3/library/collections.html', 'python.org')],
          },
          {
            slug: 'functions-and-scope',
            title: 'Functions, Arguments and Scope',
            kind: 'reading',
            minutes: 24,
            objectives: ['Design function signatures with keyword-only args', 'Understand LEGB scope', 'Use closures and decorators'],
            body: `## Signatures are design

\`\`\`python
def retry(fn, *, attempts=3, backoff=0.5, on_error=None):
    ...
\`\`\`

The \`*\` makes everything after it **keyword-only**: callers must write \`retry(work, attempts=5)\`. That prevents the classic bug where someone passes two numbers and nobody knows which is which.

## LEGB: name resolution

Python looks for a name in **L**ocal → **E**nclosing → **G**lobal → **B**uiltin order. Assigning inside a function creates a local; to modify a module-level name you must declare \`global\` (avoid) or, better, pass values in and return new ones.

## Closures

A function can capture variables from the scope where it was defined:

\`\`\`python
def make_counter():
    count = 0
    def inc():
        nonlocal count
        count += 1
        return count
    return inc
\`\`\`

## Decorators are just functions taking functions

\`\`\`python
import functools, time

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__}: {time.perf_counter() - start:.4f}s")
    return wrapper
\`\`\`

\`functools.wraps\` preserves the original name and docstring — without it, debugging and documentation tools lose the function's identity.`,
            code: [
              {
                language: 'python',
                caption: 'A closure and a decorator',
                source: `import functools\n\ndef make_multiplier(factor):\n    def multiply(x):\n        return x * factor\n    return multiply\n\ndouble = make_multiplier(2)\nprint(double(21))\n\ndef logged(fn):\n    @functools.wraps(fn)\n    def wrapper(*a, **kw):\n        print("calling", fn.__name__)\n        return fn(*a, **kw)\n    return wrapper\n\n@logged\ndef greet(name: str) -> str:\n    return f"Hello, {name}"\n\nprint(greet("Ada"))`,
              },
            ],
            resources: [DOC('Defining Functions', 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions', 'python.org')],
          },
        ],
      },
      {
        slug: 'objects-and-typing',
        title: 'Objects, Errors and Typing',
        summary: 'Classes, dataclasses, exceptions, type hints.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'classes-and-dataclasses',
            title: 'Classes, dataclasses and Composition',
            kind: 'reading',
            minutes: 26,
            objectives: ['Model data with dataclasses', 'Prefer composition to inheritance', 'Use properties for computed values'],
            body: `## When you need a class

A dict is fine until the same three keys travel together through ten functions. Then a class pays for itself: named fields, validation, and behaviour that belongs to the data.

\`\`\`python
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class Money:
    amount: int          # minor units, e.g. paise
    currency: str = "INR"

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("amount must be non-negative")
\`\`\`

\`frozen=True\` makes it immutable (hashable, safe to share). \`slots=True\` drops the per-instance \`__dict__\`, saving memory in large collections.

## Composition over inheritance

Inheritance is for "is-a" relationships that are stable. Most real designs are "has-a":

\`\`\`python
class Report:
    def __init__(self, source, renderer):
        self.source = source
        self.renderer = renderer
    def build(self):
        return self.renderer.render(self.source.fetch())
\`\`\`

You can now swap the renderer in tests without subclassing anything.

## Properties for computed values

\`\`\`python
@property
def total(self) -> int:
    return sum(item.price * item.qty for item in self.items)
\`\`\`

Callers write \`order.total\`, the value is always current, and nothing can set it to an inconsistent number.`,
            code: [
              {
                language: 'python',
                caption: 'dataclass with a computed property',
                source: `from dataclasses import dataclass, field\n\n@dataclass\nclass LineItem:\n    name: str\n    price: int\n    qty: int\n\n@dataclass\nclass Order:\n    items: list[LineItem] = field(default_factory=list)\n\n    @property\n    def total(self) -> int:\n        return sum(i.price * i.qty for i in self.items)\n\no = Order([LineItem("keyboard", 2499, 1), LineItem("cable", 299, 2)])\nprint(o.total)`,
              },
            ],
            resources: [DOC('dataclasses', 'https://docs.python.org/3/library/dataclasses.html', 'python.org')],
          },
          {
            slug: 'exceptions',
            title: 'Errors: Handling, Raising and Not Hiding',
            kind: 'reading',
            minutes: 22,
            objectives: ['Distinguish recoverable from programmer errors', 'Use exception chaining', 'Write finally blocks that clean up'],
            body: `## Two kinds of failure

- **Expected failure**: file missing, network timeout, invalid user input. Handle it.
- **Programmer error**: \`TypeError\` from a wrong shape of data. Let it surface loudly in development; catch it in production only at the boundary that can recover.

\`\`\`python
try:
    config = load_config(path)
except FileNotFoundError:
    config = DEFAULT_CONFIG
\`\`\`

## Never swallow

\`\`\`python
except Exception:
    pass          # ← the bug that hides every future bug
\`\`\`

If you must catch broadly, log with context and re-raise or return a typed error:

\`\`\`python
except Exception as exc:
    log.exception("config load failed", extra={"path": path})
    raise ConfigError("could not load config") from exc
\`\`\`

\`raise ... from exc\` keeps the original traceback — the single most useful debugging detail.

## finally and context managers

\`\`\`python
with open(path) as f:      # closes even if an exception is raised
    data = f.read()
\`\`\`

Custom resources use \`contextlib.contextmanager\` so cleanup cannot be forgotten.`,
            code: [
              {
                language: 'python',
                caption: 'Exception chaining and cleanup',
                source: `class ConfigError(Exception):\n    pass\n\ndef load(path):\n    try:\n        with open(path) as f:\n            return f.read()\n    except OSError as exc:\n        raise ConfigError(f"cannot read {path}") from exc\n\ntry:\n    load("missing.toml")\nexcept ConfigError as err:\n    print("handled:", err)\n    print("cause:", type(err.__cause__).__name__)`,
              },
            ],
            resources: [DOC('Errors and Exceptions', 'https://docs.python.org/3/tutorial/errors.html', 'python.org')],
          },
        ],
      },
      {
        slug: 'project-tooling',
        title: 'Tooling & Project',
        summary: 'Virtual environments, tests, packaging, a real project.',
        level: 'advanced',
        lessons: [
          {
            slug: 'venv-and-packages',
            title: 'Virtual Environments and Dependency Discipline',
            kind: 'reading',
            minutes: 20,
            objectives: ['Create reproducible environments', 'Pin dependencies', 'Understand why global installs break projects'],
            body: `## Why environments

Every project needs a specific set of package versions. Installing everything globally means two projects fight over the same version of the same library. A virtual environment is just a directory with its own \`site-packages\`.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`

## Pin what you ship

\`\`\`
# requirements.txt
fastapi==0.115.0
httpx==0.27.2
pytest==8.3.3
\`\`\`

Exact pins make builds reproducible. For libraries you *publish*, use compatible-release ranges (\`>=1.2,<2\`) instead.

## Layout that scales

\`\`\`
project/
  src/app/__init__.py
  tests/test_app.py
  pyproject.toml
\`\`\`

A \`src/\` layout prevents "it works in my folder" imports: tests run against the installed package, the same way users will.`,
            code: [
              {
                language: 'bash',
                caption: 'Typical session',
                source: `python -m venv .venv\n. .venv/bin/activate\npip install --upgrade pip\npip install pytest\npython -m pytest -q`,
              },
            ],
            resources: [DOC('venv — Creation of virtual environments', 'https://docs.python.org/3/library/venv.html', 'python.org')],
          },
          {
            slug: 'testing-and-project',
            title: 'Testing, and the Capstone Project',
            kind: 'project',
            minutes: 40,
            objectives: ['Write focused unit tests', 'Structure a small CLI application', 'Ship a project with a README'],
            body: `## Tests are executable documentation

\`\`\`python
def test_total_sums_line_items():
    order = Order([LineItem("a", 100, 2), LineItem("b", 50, 1)])
    assert order.total == 250
\`\`\`

A good test names the behaviour, arranges one thing, and asserts one thing. Prefer many small tests over one giant one: when it fails you know exactly what broke.

## Arrange – Act – Assert

1. **Arrange** the smallest possible world.
2. **Act** — one call.
3. **Assert** the observable outcome, not internals.

## Capstone: a study-tracker CLI

Build a command-line tool that:

- reads and writes a JSON file of study sessions,
- reports total minutes per course and the current streak,
- has \`add\`, \`report\` and \`streak\` commands,
- is covered by at least six tests, including one for a corrupt file.

### Completion criteria

1. All tests pass with \`pytest\`.
2. \`python -m app report\` prints a correct table.
3. A README explains setup in under ten lines.
4. Code has type hints on every public function.

Submit the repository in the **Community → Project Showcase** group for feedback.`,
            code: [
              {
                language: 'python',
                caption: 'A testable core function',
                source: `from datetime import date\n\ndef streak(days: list[str], today: str | None = None) -> int:\n    """Consecutive days up to today with at least one session."""\n    if not days:\n        return 0\n    today = today or date.today().isoformat()\n    seen = set(days)\n    count = 0\n    from datetime import timedelta\n    d = date.fromisoformat(today)\n    while d.isoformat() in seen:\n        count += 1\n        d -= timedelta(days=1)\n    return count\n\nprint(streak(["2026-11-16", "2026-11-15", "2026-11-14", "2026-11-12"], today="2026-11-16"))`,
              },
            ],
            resources: [
              DOC('pytest — Get Started', 'https://docs.pytest.org/en/stable/getting-started.html', 'pytest.org'),
              DOC('Python Packaging User Guide', 'https://packaging.python.org/en/latest/tutorials/packaging-projects/', 'python.org'),
            ],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Python Foundations Check',
        moduleSlug: 'foundations',
        passScore: 70,
        timeLimitMinutes: 10,
        questions: [
          {
            prompt: 'What is the value of `7 // 2` in Python?',
            options: ['3', '3.5', '4', '2'],
            correct: 0,
            explanation: '`//` is floor division. 7/2 is 3.5, floored to 3. Use `/` for true division.',
          },
          {
            prompt: 'Why does `0.1 + 0.2 == 0.3` evaluate to False?',
            options: [
              'Because Python rounds all floats to two decimals',
              'Because binary floating point cannot represent 0.1, 0.2 and 0.3 exactly',
              'Because `==` is not defined for floats',
              'Because 0.3 is stored as an integer',
            ],
            correct: 1,
            explanation: 'These decimals have no exact binary representation, so the sum is 0.30000000000000004. Compare with a tolerance or use Decimal.',
          },
          {
            prompt: 'After `a = [1, 2]; b = a; b.append(3)`, what is `a`?',
            options: ['[1, 2]', '[1, 2, 3]', 'Error', '[3]'],
            correct: 1,
            explanation: 'Assignment binds a second name to the same list object; mutating through either name is visible through both.',
          },
          {
            prompt: 'Which default argument is a bug?',
            options: ['`def f(x=None)`', '`def f(x=0)`', '`def f(x=[])`', '`def f(x="")`'],
            correct: 2,
            explanation: 'Mutable defaults are created once at definition time and shared across calls. Use None and build inside the function.',
          },
          {
            prompt: 'What does `enumerate(names, start=1)` give you?',
            options: ['Only the names', 'Pairs of (index, name) starting at 1', 'A reversed list', 'A dict of names'],
            correct: 1,
            explanation: 'enumerate yields (index, value) tuples; start sets the first index.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'python-expense-tracker',
        title: 'Personal Expense Tracker',
        difficulty: 'beginner',
        estHours: 6,
        brief:
          'Build a CLI that records expenses (date, category, amount) to a JSON file, prints monthly totals per category, and validates input. Requirements: argparse commands, a dataclass model, tests for parsing and totals, and graceful handling of a corrupted file. Deliverable: repository with README.',
      },
    ],
    exercises: [
      {
        slug: 'py-sum-evens',
        title: 'Sum of even numbers',
        difficulty: 'easy',
        prompt:
          'Read an integer `n` from standard input and print the sum of all even numbers from 1 to n inclusive. Example: input `10` → output `30`.',
        starter: 'n = int(input())\n# your code here\n',
        solution: 'n = int(input())\nprint(sum(i for i in range(1, n + 1) if i % 2 == 0))\n',
        tests: [
          { input: '10\n', expected: '30' },
          { input: '1\n', expected: '0' },
          { input: '7\n', expected: '12' },
        ],
      },
      {
        slug: 'py-word-frequency',
        title: 'Word frequency',
        difficulty: 'medium',
        prompt:
          'Read one line of text. Print each word (lowercased, split on whitespace) and its count, one per line, sorted by count descending then alphabetically. Format: `word count`.',
        starter: 'text = input()\n# your code here\n',
        solution:
          'from collections import Counter\ntext = input()\ncounts = Counter(text.lower().split())\nfor word, c in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):\n    print(word, c)\n',
        tests: [
          { input: 'the cat the dog the\n', expected: 'the 3\ncat 1\ndog 1' },
          { input: 'a A b\n', expected: 'a 2\nb 1' },
        ],
      },
    ],
  },

  /* ───────────────────────── 02 DSA ───────────────────────── */
  {
    slug: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    tagline: 'Think in complexity, then write the solution.',
    category: 'Computer Science',
    icon: 'binary',
    level: 'Beginner → Advanced',
    durationHours: 56,
    outcomes: [
      'Analyse time and space complexity of your own code',
      'Implement and choose between core data structures',
      'Recognise patterns: two pointers, sliding window, BFS/DFS, DP',
      'Solve interview-style problems with tested code',
    ],
    prereqs: ['Basic programming in any language', 'Comfort with functions and loops'],
    description:
      'Interviews and real systems both reward the same skill: choosing the right structure before writing the code. This course builds that instinct from complexity analysis upward, with every pattern implemented and tested in the lab.',
    modules: [
      {
        slug: 'complexity',
        title: 'Complexity Foundations',
        summary: 'Big-O, growth rates, and how to measure real code.',
        level: 'beginner',
        lessons: [
          {
            slug: 'big-o',
            title: 'Big-O Without the Hand-Waving',
            kind: 'reading',
            minutes: 24,
            objectives: ['Derive Big-O from loops and recursion', 'Separate time from space complexity', 'Avoid premature optimisation'],
            body: `## What Big-O actually says

Big-O describes how the number of operations **grows** as input size grows, ignoring constants. It answers "will this still be fast at 100× the data?", not "how many milliseconds is it?".

| Complexity | n = 10 | n = 1,000 | n = 1,000,000 |
|---|---|---|---|
| O(1) | 1 | 1 | 1 |
| O(log n) | 3 | 10 | 20 |
| O(n) | 10 | 1,000 | 1,000,000 |
| O(n log n) | 33 | 10,000 | 20,000,000 |
| O(n²) | 100 | 1,000,000 | 10¹² — too slow |

## Reading loops

\`\`\`python
for i in range(n):          # n iterations
    for j in range(n):      # n × n
        work()              # → O(n²)
\`\`\`

Nested loops over *different* sizes multiply; sequential loops add:

\`\`\`python
for x in a: ...             # O(a)
for y in b: ...             # O(b)
# total O(a + b), not O(a*b)
\`\`\`

Halving the search space each step gives O(log n) — binary search, balanced trees.

## Space complexity

Recursion costs stack frames. A recursive Fibonacci is O(n) stack *and* O(2ⁿ) time; the memoised version is O(n) time and O(n) space. Always state both.

## The interview sentence

"It's O(n log n) time because of the sort, O(n) extra space for the map." Saying it precisely signals you understand your own solution.`,
            code: [
              {
                language: 'python',
                caption: 'Three solutions to "contains duplicate"',
                source: `import timeit\n\nnums = list(range(5000))\n\ndef brute(xs):\n    for i in range(len(xs)):\n        for j in range(i + 1, len(xs)):\n            if xs[i] == xs[j]:\n                return True\n    return False\n\ndef sort_first(xs):\n    s = sorted(xs)\n    return any(s[i] == s[i + 1] for i in range(len(s) - 1))\n\ndef hashed(xs):\n    seen = set()\n    for x in xs:\n        if x in seen:\n            return True\n        seen.add(x)\n    return False\n\nfor fn in (sort_first, hashed):\n    print(fn.__name__, f"{timeit.timeit(lambda: fn(nums), number=3):.4f}s")`,
              },
            ],
            resources: [DOC('TimeComplexity — Python Wiki', 'https://wiki.python.org/moin/TimeComplexity', 'python.org')],
          },
          {
            slug: 'arrays-strings',
            title: 'Arrays and Strings: The Two-Pointer Pattern',
            kind: 'code',
            minutes: 28,
            objectives: ['Apply two pointers to sorted arrays', 'Use the sliding window for subarrays', 'Handle edge cases explicitly'],
            body: `## Two pointers

When the array is sorted, one pointer at each end turns an O(n²) search into O(n):

\`\`\`python
def two_sum_sorted(nums, target):
    i, j = 0, len(nums) - 1
    while i < j:
        s = nums[i] + nums[j]
        if s == target:
            return (i, j)
        if s < target:
            i += 1
        else:
            j -= 1
    return None
\`\`\`

**Why it is correct:** if the sum is too small, the only way to increase it is to move the left pointer right; if too large, move right left. Each step eliminates one candidate.

## Sliding window

For "longest/shortest subarray satisfying X" where X is monotone:

\`\`\`python
def longest_unique(s):
    seen = {}
    best = 0
    left = 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1
        seen[ch] = right
        best = max(best, right - left + 1)
    return best
\`\`\`

The window only expands right and shrinks left — O(n) total, even though there is a nested-looking adjustment.

## Edge cases that break solutions

Empty input, single element, all elements equal, negative numbers, target unreachable. Write them as tests *before* the algorithm.`,
            code: [
              {
                language: 'python',
                caption: 'Sliding window, verified',
                source: `def longest_unique(s: str) -> int:\n    seen, left, best = {}, 0, 0\n    for right, ch in enumerate(s):\n        if ch in seen and seen[ch] >= left:\n            left = seen[ch] + 1\n        seen[ch] = right\n        best = max(best, right - left + 1)\n    return best\n\nassert longest_unique("abcabcbb") == 3\nassert longest_unique("") == 0\nassert longest_unique("bbbbb") == 1\nprint("all checks passed")`,
              },
            ],
            resources: [DOC('Python Sorting HOW TO', 'https://docs.python.org/3/howto/sorting.html', 'python.org')],
          },
        ],
      },
      {
        slug: 'linear-structures',
        title: 'Linear Structures',
        summary: 'Linked lists, stacks, queues, hash maps.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'linked-lists',
            title: 'Linked Lists: Pointers You Can See',
            kind: 'code',
            minutes: 26,
            objectives: ['Implement insertion and reversal', 'Use the fast/slow pointer technique', 'Know when a list beats an array'],
            body: `## Nodes and references

\`\`\`python
class Node:
    __slots__ = ("value", "next")
    def __init__(self, value, next=None):
        self.value = value
        self.next = next
\`\`\`

Insertion at the head is O(1); lookup is O(n). That trade is the whole point: linked lists shine when you insert and remove frequently at known positions and rarely index.

## Reversal in one pass

\`\`\`python
def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev
\`\`\`

Draw it once on paper. Three variables, one pass, O(n) time and O(1) space — a favourite interview question because it exposes whether you can reason about aliasing.

## Fast and slow pointers

\`\`\`python
def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow
\`\`\`

Same trick finds cycles (Floyd's algorithm): if fast ever meets slow, there is a loop.

## Python reality check

\`list\` is an array of references: indexing O(1), insertion in the middle O(n). For most Python code the built-in list wins. Learn linked lists for the reasoning, not as a default container.`,
            code: [
              {
                language: 'python',
                caption: 'Reverse and detect a cycle',
                source: `class Node:\n    __slots__ = ("value", "next")\n    def __init__(self, value, next=None):\n        self.value, self.next = value, next\n\ndef to_list(head):\n    out = []\n    while head:\n        out.append(head.value)\n        head = head.next\n    return out\n\ndef reverse(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev\n\nhead = Node(1, Node(2, Node(3)))\nprint(to_list(reverse(head)))\n\ndef has_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow, fast = slow.next, fast.next.next\n        if slow is fast:\n            return True\n    return False\n\nprint("cycle:", has_cycle(Node(1)))\na, b = Node(1), Node(2)\na.next = b\nprint("cycle:", has_cycle(a))\nb.next = a\nprint("cycle:", has_cycle(a))`,
              },
            ],
            resources: [DOC('Data Structures (Python Tutorial)', 'https://docs.python.org/3/tutorial/datastructures.html', 'python.org')],
          },
          {
            slug: 'stacks-queues',
            title: 'Stacks, Queues and Deques',
            kind: 'code',
            minutes: 22,
            objectives: ['Implement both structures correctly', 'Use a deque for O(1) popleft', 'Recognise stack/queue problem shapes'],
            body: `## Stack: last in, first out

Use a Python list: \`append\` and \`pop\` are both O(1) at the end.

Classic uses: matching brackets, undo history, DFS iteratively, evaluating postfix expressions.

\`\`\`python
def balanced(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
\`\`\`

## Queue: first in, first out

\`list.pop(0)\` is O(n) — it shifts every element. Use \`collections.deque\`:

\`\`\`python
from collections import deque
q = deque()
q.append(1); q.append(2)
q.popleft()   # O(1)
\`\`\`

BFS requires a queue; using a list here silently turns an O(n) traversal into O(n²).

## Choosing

Ask what order the data must leave: newest first → stack; oldest first → queue; both ends → deque; highest priority → heap.`,
            code: [
              {
                language: 'python',
                caption: 'Balanced brackets',
                source: `def balanced(s: str) -> bool:\n    pairs = {")": "(", "]": "[", "}": "{"}\n    stack = []\n    for ch in s:\n        if ch in "([{":\n            stack.append(ch)\n        elif ch in pairs:\n            if not stack or stack.pop() != pairs[ch]:\n                return False\n    return not stack\n\nfor t in ["()[]{}", "(]", "([{}])", "("]:\n    print(t, balanced(t))`,
              },
            ],
            resources: [DOC('collections.deque', 'https://docs.python.org/3/library/collections.html#collections.deque', 'python.org')],
          },
        ],
      },
      {
        slug: 'trees-graphs',
        title: 'Trees, Graphs and Recursion',
        summary: 'Traversal, BFS/DFS, shortest paths.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'tree-traversal',
            title: 'Tree Traversal: Recursion Made Concrete',
            kind: 'code',
            minutes: 26,
            objectives: ['Write preorder, inorder and postorder traversals', 'Convert recursion to an explicit stack', 'Compute height and diameter'],
            body: `## A binary tree in ten lines

\`\`\`python
class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value, self.left, self.right = value, left, right
\`\`\`

## The three orders

- **Preorder** (node, left, right): copy a tree, serialise it.
- **Inorder** (left, node, right): on a BST, gives sorted output.
- **Postorder** (left, right, node): delete a tree, evaluate an expression tree.

\`\`\`python
def inorder(node, out=None):
    out = [] if out is None else out
    if node:
        inorder(node.left, out)
        out.append(node.value)
        inorder(node.right, out)
    return out
\`\`\`

Recursion is just the call stack made visible. The iterative version uses a list explicitly — same algorithm, different storage.

## Height and diameter

Height is \`1 + max(height(left), height(right))\`. Diameter is the longest path between any two nodes, which may not pass through the root — so it must be tracked globally while computing heights. That distinction is the whole difficulty of the problem.`,
            code: [
              {
                language: 'python',
                caption: 'Traversals and diameter',
                source: `class T:\n    def __init__(self, v, l=None, r=None):\n        self.v, self.l, self.r = v, l, r\n\nroot = T(4, T(2, T(1), T(3)), T(6, T(5), T(7)))\n\ndef inorder(n):\n    return inorder(n.l) + [n.v] + inorder(n.r) if n else []\n\ndef height(n):\n    return 0 if not n else 1 + max(height(n.l), height(n.r))\n\ndef diameter(n):\n    best = 0\n    def walk(node):\n        nonlocal best\n        if not node:\n            return 0\n        lh, rh = walk(node.l), walk(node.r)\n        best = max(best, lh + rh)\n        return 1 + max(lh, rh)\n    walk(n)\n    return best\n\nprint("inorder:", inorder(root))\nprint("height:", height(root))\nprint("diameter:", diameter(root))`,
              },
            ],
            resources: [DOC('Recursion (Python docs glossary)', 'https://docs.python.org/3/glossary.html', 'python.org')],
          },
          {
            slug: 'graphs',
            title: 'Graphs: BFS, DFS and Shortest Paths',
            kind: 'reading',
            minutes: 30,
            objectives: ['Represent graphs as adjacency lists', 'Choose BFS for unweighted shortest paths', 'Use Dijkstra for weighted edges'],
            body: `## Representation

\`\`\`python
graph = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
\`\`\`

Adjacency lists are O(V + E) space; adjacency matrices are O(V²) but answer "is there an edge?" in O(1). Choose by density.

## BFS gives the shortest unweighted path

\`\`\`python
from collections import deque

def bfs(graph, start):
    dist = {start: 0}
    q = deque([start])
    while q:
        node = q.popleft()
        for nxt in graph[node]:
            if nxt not in dist:
                dist[nxt] = dist[node] + 1
                q.append(nxt)
    return dist
\`\`\`

Because a queue processes nodes in order of distance, the first time you reach a node is via a shortest path.

## DFS explores deeply

Useful for cycle detection, topological sort, connected components. Iterative DFS uses a stack; recursive DFS can overflow on very deep graphs.

## Dijkstra for weighted graphs

Replace the queue with a min-heap ordered by distance. O((V + E) log V). It requires non-negative weights — otherwise use Bellman-Ford.`,
            code: [
              {
                language: 'python',
                caption: 'BFS distances and Dijkstra',
                source: `from collections import deque\nimport heapq\n\ngraph = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": ["E"], "E": []}\n\ndef bfs(g, s):\n    dist = {s: 0}\n    q = deque([s])\n    while q:\n        n = q.popleft()\n        for m in g[n]:\n            if m not in dist:\n                dist[m] = dist[n] + 1\n                q.append(m)\n    return dist\n\nprint("bfs:", bfs(graph, "A"))\n\nweighted = {"A": [("B", 4), ("C", 1)], "B": [("D", 1)], "C": [("B", 2), ("D", 5)], "D": []}\ndef dijkstra(g, s):\n    best = {s: 0}\n    heap = [(0, s)]\n    while heap:\n        d, n = heapq.heappop(heap)\n        if d > best.get(n, float("inf")):\n            continue\n        for m, w in g[n]:\n            nd = d + w\n            if nd < best.get(m, float("inf")):\n                best[m] = nd\n                heapq.heappush(heap, (nd, m))\n    return best\n\nprint("dijkstra:", dijkstra(weighted, "A"))`,
              },
            ],
            resources: [DOC('heapq — Heap queue algorithm', 'https://docs.python.org/3/library/heapq.html', 'python.org')],
          },
        ],
      },
      {
        slug: 'advanced-patterns',
        title: 'Advanced Patterns',
        summary: 'Dynamic programming, greedy, sorting and binary search on answers.',
        level: 'advanced',
        lessons: [
          {
            slug: 'dynamic-programming',
            title: 'Dynamic Programming: From Recursion to Table',
            kind: 'code',
            minutes: 32,
            objectives: ['Identify overlapping subproblems', 'Write top-down memoisation', 'Convert to bottom-up iteration'],
            body: `## The test

A problem is a DP candidate when it has **optimal substructure** (the answer is built from answers to subproblems) and **overlapping subproblems** (the same subproblem recurs).

## Step 1: naive recursion

\`\`\`python
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)   # O(2ⁿ)
\`\`\`

## Step 2: memoise

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)   # O(n)
\`\`\`

One decorator, exponential to linear. Always try this before writing a table.

## Step 3: bottom-up when you need space control

\`\`\`python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a                                         # O(1) space
\`\`\`

## The canonical 0/1 knapsack

State: \`dp[i][w]\` = best value using the first i items with capacity w.
Transition: \`dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i]] + val[i])\`.

Writing the state definition in words *before* the code is the technique. If you cannot describe the state in one sentence, the recurrence will be wrong.`,
            code: [
              {
                language: 'python',
                caption: 'Knapsack, top-down and bottom-up',
                source: `from functools import lru_cache\n\nweights = [1, 3, 4, 5]\nvalues = [1, 4, 5, 7]\ncap = 7\n\n@lru_cache(maxsize=None)\ndef best(i, w):\n    if i == 0 or w == 0:\n        return 0\n    if weights[i - 1] > w:\n        return best(i - 1, w)\n    return max(best(i - 1, w), values[i - 1] + best(i - 1, w - weights[i - 1]))\n\nprint("memo:", best(len(weights), cap))\n\ndp = [0] * (cap + 1)\nfor wt, val in zip(weights, values):\n    for w in range(cap, wt - 1, -1):\n        dp[w] = max(dp[w], dp[w - wt] + val)\nprint("bottom-up:", dp[cap])`,
              },
            ],
            resources: [DOC('functools.lru_cache', 'https://docs.python.org/3/library/functools.html#functools.lru_cache', 'python.org')],
          },
          {
            slug: 'sorting-searching',
            title: 'Sorting, Binary Search and Search on Answers',
            kind: 'reading',
            minutes: 26,
            objectives: ['Use stable sorts with key functions', 'Write a correct binary search', 'Apply binary search to non-array problems'],
            body: `## Sorting

Python's \`sorted\` is Timsort: O(n log n) worst case, O(n) on nearly-sorted input, stable. The \`key\` function is called once per element, so keep it cheap.

\`\`\`python
people.sort(key=lambda p: (-p.score, p.name))
\`\`\`

## Binary search: three details that matter

1. Use \`lo, hi = 0, len(a)\` with \`while lo < hi\` and \`hi = mid\` (lower-bound form), or \`lo <= hi\` with \`hi = mid - 1\`. Mixing the two causes infinite loops.
2. Compute \`mid = lo + (hi - lo) // 2\` to avoid overflow in languages with fixed integers.
3. Decide explicitly whether you return the first match, any match, or an insertion point.

\`\`\`python
def lower_bound(a, target):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
\`\`\`

## Binary search on answers

If "can we achieve X?" is monotone (true for all values ≥ some threshold), search the answer space, not the array. Examples: minimum ship capacity in D days, smallest divisor, koko eating bananas. The predicate is the algorithm.`,
            code: [
              {
                language: 'python',
                caption: 'Lower bound + search on answers',
                source: `def lower_bound(a, target):\n    lo, hi = 0, len(a)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if a[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo\n\nprint(lower_bound([1, 3, 3, 5, 9], 3), lower_bound([1, 3, 3, 5, 9], 4))\n\ndef min_days(weights, capacity):\n    days, load = 1, 0\n    for w in weights:\n        if load + w > capacity:\n            days += 1\n            load = 0\n        load += w\n    return days\n\ndef ship_within_days(weights, days):\n    lo, hi = max(weights), sum(weights)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if min_days(weights, mid) <= days:\n            hi = mid\n        else:\n            lo = mid + 1\n    return lo\n\nprint(ship_within_days([1,2,3,4,5,6,7,8,9,10], 5))`,
              },
            ],
            resources: [DOC('bisect — Array bisection algorithm', 'https://docs.python.org/3/library/bisect.html', 'python.org')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Complexity & Arrays Check',
        moduleSlug: 'complexity',
        passScore: 70,
        timeLimitMinutes: 10,
        questions: [
          {
            prompt: 'What is the time complexity of `x in some_set` for a set of n elements?',
            options: ['O(1) average', 'O(n)', 'O(log n)', 'O(n log n)'],
            correct: 0,
            explanation: 'Sets are hash-based: membership is O(1) on average, degrading to O(n) only with pathological hash collisions.',
          },
          {
            prompt: 'Two sequential loops, one over n items and one over m items, cost:',
            options: ['O(n × m)', 'O(n + m)', 'O(max(n, m)²)', 'O(n log m)'],
            correct: 1,
            explanation: 'Sequential loops add their costs. Only nested loops multiply.',
          },
          {
            prompt: 'For an unweighted graph, which traversal gives shortest path lengths from a source?',
            options: ['Depth-first search', 'Breadth-first search', 'Inorder traversal', 'Quicksort'],
            correct: 1,
            explanation: 'BFS visits nodes in order of increasing distance, so the first visit to a node is a shortest path.',
          },
          {
            prompt: 'Which operation is O(n) on a Python list?',
            options: ['append', 'pop from the end', 'insert at index 0', 'index lookup a[i]'],
            correct: 2,
            explanation: 'Inserting at the front shifts every existing element. Use a deque for front operations.',
          },
          {
            prompt: 'Memoising a naive recursive Fibonacci changes its time complexity from:',
            options: ['O(n) to O(1)', 'O(2ⁿ) to O(n)', 'O(n²) to O(n log n)', 'Nothing changes'],
            correct: 1,
            explanation: 'Each subproblem is computed once, so the work is proportional to n.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'dsa-pathfinder-visualiser',
        title: 'Grid Pathfinder',
        difficulty: 'intermediate',
        estHours: 10,
        brief:
          'Implement BFS, DFS and A* on a 2D grid with walls. Compare visited-node counts and path lengths across algorithms on identical maps. Deliver a CLI report plus tests. Extension: render the search with ASCII animation.',
      },
    ],
    exercises: [
      {
        slug: 'dsa-two-sum-sorted',
        title: 'Two Sum (sorted input)',
        difficulty: 'easy',
        prompt:
          'Read a sorted line of space-separated integers and then a target on the next line. Print the two 1-based indices (smaller first) that sum to the target, or `none`. Use the two-pointer approach.',
        starter: 'nums = list(map(int, input().split()))\ntarget = int(input())\n# your code here\n',
        solution:
          'nums = list(map(int, input().split()))\ntarget = int(input())\ni, j = 0, len(nums) - 1\nwhile i < j:\n    s = nums[i] + nums[j]\n    if s == target:\n        print(i + 1, j + 1)\n        break\n    if s < target:\n        i += 1\n    else:\n        j -= 1\nelse:\n    print("none")\n',
        tests: [
          { input: '1 2 3 4 6\n6\n', expected: '2 4' },
          { input: '1 2\n10\n', expected: 'none' },
          { input: '-3 0 5 9\n6\n', expected: '1 4' },
        ],
      },
    ],
  },

  /* ───────────────────────── 03 FULL STACK ───────────────────────── */
  {
    slug: 'full-stack-development',
    title: 'Full Stack Development',
    tagline: 'Design, build and ship a real web application.',
    category: 'Web Engineering',
    icon: 'layers',
    level: 'Beginner → Advanced',
    durationHours: 64,
    outcomes: [
      'Build accessible interfaces with modern component patterns',
      'Design REST APIs with validation and correct status codes',
      'Model data relationally and query it safely',
      'Deploy with authentication, logging and backups',
    ],
    prereqs: ['Basic programming', 'Willingness to read browser docs'],
    description:
      'The web stack, taught as one system: HTTP and the browser, then components and state, then the server, the database, authentication and deployment. Each module ends with a working increment of one application you keep building.',
    modules: [
      {
        slug: 'web-foundations',
        title: 'How the Web Works',
        summary: 'HTTP, the browser pipeline, HTML semantics, CSS layout.',
        level: 'beginner',
        lessons: [
          {
            slug: 'http-and-browser',
            title: 'HTTP, Requests and the Browser Pipeline',
            kind: 'reading',
            minutes: 24,
            objectives: ['Read a request/response cycle', 'Know what each status class means', 'Understand caching headers'],
            body: `## One request, five layers

Typing a URL triggers: DNS resolution → TCP/TLS handshake → HTTP request → server response → parsing, layout, paint. Every slow page is slow at one of these steps; the developer tools Network panel shows which.

\`\`\`http
GET /api/courses/12 HTTP/1.1
Host: example.com
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, max-age=60
\`\`\`

## Status codes that matter

| Code | Meaning | Typical cause |
|---|---|---|
| 200 / 201 | OK / created | success |
| 204 | No content | successful delete |
| 304 | Not modified | cache revalidation |
| 400 | Bad request | malformed JSON |
| 401 | Unauthenticated | no/expired session |
| 403 | Forbidden | authenticated, not allowed |
| 404 | Not found | missing resource |
| 409 | Conflict | duplicate email |
| 422 | Unprocessable | validation failed |
| 429 | Too many requests | rate limit |
| 500 | Server error | bug — never the user's fault |

Using 200 for errors is the most common API mistake; clients cannot distinguish success from failure without parsing the body.

## Caching is a feature

\`Cache-Control: private, max-age=60\` lets the browser reuse a response for a minute. Immutable static assets get a year and a content hash in the filename. Never cache authenticated JSON publicly.`,
            code: [
              {
                language: 'bash',
                caption: 'Inspect a real response',
                source: `curl -s -D - https://api.github.com/repos/python/cpython -o /dev/null | head -20`,
              },
            ],
            resources: [
              DOC('MDN — HTTP overview', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', 'MDN'),
              DOC('MDN — HTTP response status codes', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status', 'MDN'),
            ],
          },
          {
            slug: 'semantic-html-css',
            title: 'Semantic HTML and Layout That Holds',
            kind: 'reading',
            minutes: 26,
            objectives: ['Choose elements by meaning', 'Use flexbox and grid deliberately', 'Build a responsive layout without media-query soup'],
            body: `## Semantics first

\`<button>\` is focusable, keyboard-operable and announced as a button. A \`<div onclick>\` is none of those. Accessibility is mostly a byproduct of choosing the right element.

Landmarks: \`header\`, \`nav\`, \`main\`, \`aside\`, \`footer\`. One \`<h1>\` per page; headings in order.

## Flexbox vs grid

- **Flexbox**: one dimension, distribution and alignment. Toolbars, button rows, card contents.
- **Grid**: two dimensions, explicit tracks. Page layouts, dashboards.

\`\`\`css
.layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 300px;
  gap: 24px;
}
@media (max-width: 1080px) {
  .layout { grid-template-columns: 1fr; }
}
\`\`\`

\`minmax(0, 1fr)\` prevents long code blocks from forcing the column wider than the viewport — the fix for a very common overflow bug.

## Design tokens

Define colour, spacing and radius once as CSS variables; themes then swap variables rather than components:

\`\`\`css
:root { --bg: #faf9f6; --text: #1c1b19; --accent: #b4561e; }
[data-theme="dark"] { --bg: #0f1011; --text: #edebe7; --accent: #e08a3c; }
\`\`\`

Every component reads \`var(--bg)\` and automatically works in both themes.`,
            code: [
              {
                language: 'html',
                caption: 'A semantic, accessible card',
                source: `<article class="card" aria-labelledby="t1">\n  <h2 id="t1">Course progress</h2>\n  <p>You have completed <strong>12 of 40</strong> lessons.</p>\n  <div role="progressbar" aria-valuenow="30" aria-valuemin="0" aria-valuemax="100" aria-label="Course progress">\n    <span style="width:30%"></span>\n  </div>\n  <button type="button">Continue learning</button>\n</article>`,
              },
            ],
            resources: [DOC('MDN — CSS Grid Layout', 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout', 'MDN')],
          },
        ],
      },
      {
        slug: 'client-architecture',
        title: 'Client Architecture',
        summary: 'Components, state, data fetching, forms.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'components-and-state',
            title: 'Components, Props and State Boundaries',
            kind: 'reading',
            minutes: 28,
            objectives: ['Separate server state from UI state', 'Lift state only as far as needed', 'Avoid derived-state duplication'],
            body: `## Three kinds of state

1. **Server state** — courses, progress, messages. Owned by the database; the client caches it.
2. **URL state** — filters, sort, page. Belongs in the URL so links and the back button work.
3. **UI state** — modal open, tab selected. Local to the component that needs it.

Most "state management" pain comes from putting server data in a global store and then hand-syncing it. Let the server be the source of truth; refetch or invalidate.

## Derive, do not duplicate

\`\`\`jsx
// ✗ two sources of truth
const [items, setItems] = useState([]);
const [count, setCount] = useState(0);

// ✓ derive
const count = items.length;
\`\`\`

## Props down, events up

A component that fetches, formats, and renders everything is untestable. Split: container (data), presenter (props in, JSX out).

## Every async view has four states

Loading, empty, error, and data. If you only build "data", the first slow network makes the app look broken.`,
            code: [
              {
                language: 'jsx',
                caption: 'Four states, one component',
                source: `function CourseList({ status, courses, error, onRetry }) {\n  if (status === "loading") return <Skeleton rows={3} />;\n  if (status === "error") return <ErrorState message={error} onRetry={onRetry} />;\n  if (courses.length === 0) return <EmptyState title="No courses yet" />;\n  return <ul>{courses.map((c) => <li key={c.id}>{c.title}</li>)}</ul>;\n}`,
              },
            ],
            resources: [DOC('React — Managing State', 'https://react.dev/learn/managing-state', 'react.dev')],
          },
          {
            slug: 'forms-and-validation',
            title: 'Forms: Validation on Both Sides',
            kind: 'code',
            minutes: 24,
            objectives: ['Validate client-side for UX, server-side for truth', 'Show errors next to fields', 'Never trust the client'],
            body: `## The rule

Client validation improves the experience. **Server validation is the security boundary.** Anyone can call your API with curl.

## Field-level errors

\`\`\`jsx
const errors = {};
if (!email.includes("@")) errors.email = "Enter a valid email address.";
if (password.length < 10) errors.password = "Use at least 10 characters.";
\`\`\`

Return the same shape from the server:

\`\`\`json
{ "ok": false, "error": { "code": "invalid_input", "fields": { "email": "..." } } }
\`\`\`

The form then renders one code path for both sources of error.

## Accessibility details that matter

- \`<label for>\` on every input.
- \`aria-invalid\` and \`aria-describedby\` linking the message.
- Disable the submit button **while submitting**, not based on validity — otherwise users never learn why.
- Announce success with a live region.`,
            code: [
              {
                language: 'jsx',
                caption: 'Accessible field',
                source: `<div className="field">\n  <label htmlFor="email">Email</label>\n  <input id="email" name="email" type="email" autoComplete="email"\n         aria-invalid={Boolean(errors.email)}\n         aria-describedby={errors.email ? "email-error" : undefined} />\n  {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}\n</div>`,
              },
            ],
            resources: [DOC('MDN — Client-side form validation', 'https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation', 'MDN')],
          },
        ],
      },
      {
        slug: 'server-and-data',
        title: 'Server & Data',
        summary: 'REST design, SQL, transactions, authentication.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'rest-api-design',
            title: 'Designing an API People Can Use',
            kind: 'reading',
            minutes: 26,
            objectives: ['Name resources, not actions', 'Use status codes and envelopes consistently', 'Version and paginate'],
            body: `## Resources, not verbs

\`\`\`
GET    /api/courses
GET    /api/courses/:slug
POST   /api/courses/:slug/enrollments
DELETE /api/courses/:slug/enrollments
\`\`\`

## One response envelope

\`\`\`json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "not_found", "message": "Course not found." } }
\`\`\`

A stable envelope means the client's fetch wrapper has exactly one place to handle failures.

## Pagination

Offset pagination is simple but skips/duplicates rows when data changes. Cursor pagination (\`?after=<id>\`) is stable and fast for feeds. Pick one and document it.

## Idempotency

\`PUT\` and \`DELETE\` should be safe to retry. \`POST\` creating a resource should tolerate a retried request — accept an idempotency key or a natural unique constraint.`,
            code: [
              {
                language: 'js',
                caption: 'Express route with validation',
                source: `router.post("/courses/:slug/enrollments", requireAuth, (req, res) => {\n  const course = get("SELECT id FROM courses WHERE slug = ?", [req.params.slug]);\n  if (!course) return res.status(404).json({ ok: false, error: { code: "not_found", message: "Course not found." } });\n  run("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)", [req.user.id, course.id]);\n  res.status(201).json({ ok: true, data: { enrolled: true } });\n});`,
              },
            ],
            resources: [DOC('MDN — REST', 'https://developer.mozilla.org/en-US/docs/Glossary/REST', 'MDN')],
          },
          {
            slug: 'auth-and-sessions',
            title: 'Authentication: Passwords, Sessions and Cookies',
            kind: 'reading',
            minutes: 30,
            objectives: ['Hash passwords correctly', 'Explain cookie flags', 'Revoke sessions on demand'],
            body: `## Never store passwords

Store a slow, salted hash. Lumen uses scrypt with N=2¹⁵. bcrypt and argon2id are equally acceptable; SHA-256 alone is not.

\`\`\`js
const hash = scrypt(password, salt, 64, { N: 32768, r: 8, p: 1 });
\`\`\`

## Sessions vs tokens

| | Server session | JWT |
|---|---|---|
| Revocation | instant (delete row) | needs a blocklist |
| Storage | DB row | stateless |
| Leak impact | one session | often long-lived |

For a product where "log out everywhere" must work, server sessions are simpler and safer. Lumen stores the **hash** of the session token, so a database leak does not hand out live sessions.

## Cookie flags

\`\`\`
HttpOnly        JS cannot read it → XSS cannot steal it
Secure          HTTPS only
SameSite=Lax    blocks most CSRF while keeping normal navigation working
Path=/          
\`\`\`

For state-changing requests also verify the \`Origin\` header.

## Password reset done right

Single-use token, hashed at rest, 60-minute expiry, all sessions revoked on success, and the request endpoint returns the same message whether or not the account exists.`,
            code: [
              {
                language: 'js',
                caption: 'Cookie and session creation',
                source: `res.cookie("lumen_session", token, {\n  httpOnly: true,\n  sameSite: "lax",\n  secure: process.env.NODE_ENV === "production",\n  path: "/",\n  expires,\n});\n// stored: sha256(token) — never the raw token`,
              },
            ],
            resources: [DOC('OWASP — Password Storage Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', 'OWASP')],
          },
        ],
      },
      {
        slug: 'ship-it',
        title: 'Ship It',
        summary: 'Testing, deployment, observability, the capstone.',
        level: 'advanced',
        lessons: [
          {
            slug: 'testing-web-apps',
            title: 'Testing a Web Application',
            kind: 'reading',
            minutes: 22,
            objectives: ['Choose the right test level', 'Test behaviour, not implementation', 'Cover auth and permission paths'],
            body: `## The pyramid, practically

- **Unit** (many, fast): pure functions, validators, formatters.
- **Integration** (some): HTTP route + database in a transaction that rolls back.
- **End-to-end** (few): the critical journeys — sign up, learn a lesson, submit code.

## Test the security paths

Most real incidents live in the paths nobody tested: unauthenticated access to a private route, another user's resource, a role escalation. Lumen's own smoke test asserts 401 on every protected route.

## Deterministic tests

Fixed clock, seeded random, isolated database file per run, no network. A flaky test is worse than no test: people start ignoring red.`,
            code: [
              {
                language: 'js',
                caption: 'Route test with a transaction rollback',
                source: `it("rejects unauthenticated progress writes", async () => {\n  const res = await request(app).post("/api/progress").send({ lessonId: 1, status: "completed" });\n  expect(res.status).toBe(401);\n  expect(res.body.error.code).toBe("unauthenticated");\n});`,
              },
            ],
            resources: [DOC('OWASP — Web Security Testing Guide', 'https://owasp.org/www-project-web-security-testing-guide/', 'OWASP')],
          },
          {
            slug: 'fullstack-capstone',
            title: 'Capstone: Ship a Learning App',
            kind: 'project',
            minutes: 45,
            objectives: ['Combine every layer into one deployable app', 'Write a deployment runbook', 'Instrument logging'],
            body: `## Brief

Build a small learning tracker with:

- email/password auth with hashed passwords and server sessions,
- one relational schema with foreign keys and unique constraints,
- three REST resources with validation and correct status codes,
- a responsive UI with loading, empty and error states,
- structured request logging and a health endpoint.

## Completion criteria

1. \`GET /health\` returns status and database connectivity.
2. Every protected route returns 401 without a session and 403 for the wrong role.
3. A database migration can be applied to an empty file and the app starts.
4. The README contains a runbook: install, migrate, run, back up, restore.
5. At least six automated tests, including one auth-negative test.

## Review checklist

- No secret in the client bundle (\`grep -r "api_key" dist/\`).
- No raw SQL string concatenation.
- Every form has labels and error text tied by \`aria-describedby\`.`,
            code: [
              {
                language: 'js',
                caption: 'Health endpoint with real checks',
                source: `app.get("/api/health", (req, res) => {\n  let dbOk = true;\n  try { get("SELECT 1 AS ok"); } catch { dbOk = false; }\n  res.status(dbOk ? 200 : 503).json({\n    ok: dbOk,\n    data: { db: dbOk, sandbox: sandboxMode(), uptimeSeconds: Math.round(process.uptime()) },\n  });\n});`,
              },
            ],
            resources: [DOC('12 Factor App', 'https://12factor.net/', '12factor.net')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Web Fundamentals Check',
        moduleSlug: 'web-foundations',
        passScore: 70,
        timeLimitMinutes: 10,
        questions: [
          {
            prompt: 'Which status code means "authenticated but not allowed"?',
            options: ['401', '403', '404', '422'],
            correct: 1,
            explanation: '401 is missing or invalid authentication; 403 is an authenticated principal lacking permission.',
          },
          {
            prompt: 'Why is `<div onclick="...">` worse than `<button>` for a clickable action?',
            options: [
              'It renders slower',
              'It is not focusable or keyboard-operable and is not announced as a button',
              'It cannot have styles',
              'It breaks CSS grid',
            ],
            correct: 1,
            explanation: 'Native elements carry focus, keyboard and screen-reader behaviour for free.',
          },
          {
            prompt: 'Which cookie flag prevents JavaScript from reading the session cookie?',
            options: ['Secure', 'SameSite', 'HttpOnly', 'Path'],
            correct: 2,
            explanation: 'HttpOnly removes the cookie from document.cookie, limiting XSS impact.',
          },
          {
            prompt: 'Where must input validation be authoritative?',
            options: ['Client only', 'Server', 'CSS', 'Database triggers only'],
            correct: 1,
            explanation: 'Clients can be bypassed with curl; the server is the trust boundary.',
          },
          {
            prompt: '`grid-template-columns: minmax(0, 1fr)` prevents:',
            options: ['Borders collapsing', 'A grid column being forced wider by long unbroken content', 'Grid gaps', 'Z-index conflicts'],
            correct: 1,
            explanation: 'The default min-content floor lets long code lines overflow; minmax(0, 1fr) removes that floor.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'fullstack-habit-api',
        title: 'Habit Tracker API + UI',
        difficulty: 'intermediate',
        estHours: 14,
        brief:
          'Build a habit tracker: users, habits, daily check-ins. Requirements: session auth, three resources, validation, pagination on check-ins, and a UI with optimistic toggling that rolls back on error. Include a runbook.',
      },
    ],
    exercises: [
      {
        slug: 'fs-status-codes',
        title: 'Pick the right status code',
        difficulty: 'easy',
        prompt:
          'Read one line: a scenario keyword among `created`, `duplicate`, `unauthenticated`, `forbidden`, `validation`, `ratelimit`. Print the matching HTTP status code as an integer.',
        starter: 'scenario = input().strip()\n# your code here\n',
        solution:
          'm = {"created": 201, "duplicate": 409, "unauthenticated": 401, "forbidden": 403, "validation": 422, "ratelimit": 429}\nprint(m[input().strip()])\n',
        tests: [
          { input: 'created\n', expected: '201' },
          { input: 'validation\n', expected: '422' },
          { input: 'ratelimit\n', expected: '429' },
        ],
      },
    ],
  },
];
