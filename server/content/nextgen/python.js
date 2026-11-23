/**
 * Next-generation lesson content — hand-written, not generated.
 *
 * Every lesson follows the same shape so a student always knows where they are:
 *   ## The situation      a real problem, before any theory
 *   ## What you can do afterwards   objectives in plain language
 *   ## The idea, in plain words     beginner-friendly explanation
 *   ## The terms, precisely         accurate definitions
 *   ## Walk through it              worked example with expected output
 *   ## Where this shows up          real-world applications
 *   ## Mistakes worth avoiding      common bugs and their fixes
 *   ## Practise now                 a practical exercise
 *   ## Check yourself               a short knowledge check with answers
 *   ## Challenge                    a smaller assignment than a full project
 *   ## In one paragraph             summary
 *   ## Go further                   honest resources
 *
 * Lessons declare `module` and `slug` so the upgrader can match them to existing
 * rows without changing ids — progress, bookmarks and enrolments are preserved.
 */

export const pythonLessons = [
  /* ─────────────────────────── Module: foundations ─────────────────────────── */
  {
    module: 'foundations',
    slug: 'how-python-runs',
    kind: 'reading',
    durationMinutes: 24,
    title: 'What Actually Happens When You Press Run',
    technicalTitle: 'Python execution model, the REPL and bytecode',
    level: 'beginner',
    objectives: [
      'Trace what Python does between pressing Run and seeing output',
      'Use the REPL to answer one-line questions in seconds',
      'Explain the difference between a source file, a module and a process',
      'Read a simple traceback without panicking',
    ],
    body: String.raw`## The situation

You press Run. A tenth of a second later, ` + '`3`' + String.raw` appears on screen. In that tenth of a second Python read your file, checked its grammar, turned it into another language, and executed that. When the output is wrong, you need to know **which of those steps** failed — because a syntax error, a typo in a name, and a wrong calculation all feel like "it doesn't work" but live at completely different stages.

## What you can do afterwards

- Say what happens at each stage between source text and a printed result.
- Use the interactive prompt to check a single line instead of editing a file.
- Place a traceback's line of code in the correct stage.

## The idea, in plain words

Python does the work in stages, and every program you write passes through all of them in the same order.

1. **Read.** Python loads the file as text. Nothing has run yet.
2. **Parse.** It checks the grammar — the way words and punctuation are arranged. ` + '`def f(:`' + String.raw` fails here: the shape is wrong, so Python never even looks for what a function is.
3. **Compile to bytecode.** The grammar tree becomes a short list of simple instructions (stored as ` + '`.pyc`' + String.raw` files in ` + '`__pycache__`' + String.raw`). This is a translation step, not a speed trick you need to tune.
4. **Execute.** The interpreter walks the instructions, creating objects and calling functions. This is the only stage where data actually moves.

Beginners often imagine Python "reads a line, runs a line, reads the next". That is only true for the *interactive prompt*, where you feed it one statement at a time. A file is compiled as a whole first, which is why a syntax error on line 40 stops a program that would have printed something on line 2.

## The terms, precisely

- **Interpreter** — the program (` + '`python`' + String.raw`) that runs your code. It is not your code.
- **REPL** — Read–Evaluate–Print Loop. The prompt you get by typing ` + '`python`' + String.raw`.
- **Module** — one ` + '`.py`' + String.raw` file as a unit of import.
- **Bytecode** — the simplified instructions your source is compiled to.
- **Traceback** — the report Python prints when an exception escapes, from the outermost call to the failing line.

## Walk through it

Save this as ` + '`hello.py`' + String.raw` and run ` + '`python hello.py`' + String.raw`.

` + '```python\nimport sys\n\nprint("starting on", sys.version.split()[0])\n\nprint(3 + 4)\n\n# A name that does not exist is only a problem when it is evaluated.\nprint("about to fail")\nprint(undefined_name)\n```' + String.raw`

Expected output (the version number will differ):

` + '```\nstarting on 3.14.3\n7\nabout to fail\nTraceback (most recent call last):\n  File "hello.py", line 9, in <module>\n    print(undefined_name)\n          ^^^^^^^^^^^^^^\nNameError: name \'undefined_name\' is not defined\n```' + String.raw`

Read the traceback from the bottom: the **last line says what went wrong** (` + '`NameError`' + String.raw`), and the lines above say where. Notice that ` + '`7`' + String.raw` was printed first — execution reached line 9 only after the earlier lines ran. The program was *valid*; it failed while *running*.

Now compare with a syntax error. Change the file to contain ` + '`print(3 + )`' + String.raw`: nothing is printed at all, not even ` + '`starting on`' + String.raw`. It failed during parsing, before the first instruction ran.

## Where this shows up

- **Debugging** — knowing whether you have a parse error or a runtime error halves the time to fix it.
- **Notebooks and data science** — each cell is closer to a REPL, so the file-is-compiled-first guarantee does not apply; that is why a notebook can hold working state you cannot find in any file.
- **Deployment** — "works on my machine" is usually a difference in what the interpreter found in ` + '`sys.path`' + String.raw`, not in your logic.

## Mistakes worth avoiding

- **Pasting a whole program into the REPL and losing the variables between blocks.** Long multi-line structures need a blank line to close in some frontends; a file is the safer place.
- **Reading a traceback top-down.** The useful sentence is the last one.
- **Assuming Python skips code that "shrinks" when you edit a file mid-run.** It does not: the run used the old bytes.
- **Editing in ` + '`__pycache__`' + String.raw`.** It is regenerated; change the ` + '`.py`' + String.raw`.

## Practise now

1. Write a file with three prints on separate lines. Run it.
2. Break the third print with a missing bracket. Run again and confirm **nothing** prints.
3. Fix it. Break it a different way — ` + '`print(1/0)`' + String.raw`. Confirms the first two prints *do* print.
4. In one sentence for each, note why the two failures behaved differently.

## Check yourself

1. Does Python execute line 1 before parsing line 40?
2. What is the difference between a ` + '`NameError`' + String.raw` and a ` + '`SyntaxError`' + String.raw`?
3. Where in a traceback is the cause?

**Answers:** (1) No — the file is compiled as a whole first. (2) The second is found before any code runs; the first is found while running. (3) The last line names the exception; the frame just above points at the code.

## Challenge

Write a 15-line script that uses only ` + '`print`' + String.raw`, ` + '`input`' + String.raw` and arithmetic. Deliberately introduce one parse error and one runtime error, save the exact traceback text of each in notes, and label the stage each belongs to. You now have a reference you will actually use.

## In one paragraph

Python reads your whole file, checks its grammar, compiles it to bytecode, then executes the instructions. Parse errors stop everything before it starts; runtime errors stop at the line that fails, after everything before it has already happened. The REPL is a different mode — one statement at a time.

## Go further

- The official documentation's *Using Python* chapter, which covers invocation and the interpreter environment.
- Any short article on "what is bytecode" — the concept transfers to Java and .NET unchanged.
- Read one traceback from a real library you use, bottom line first, and explain it to someone.`,
    code: [
      {
        language: 'python',
        caption: 'Two failures, two stages — run it and watch what prints',
        source: `import sys

print("starting on", sys.version.split()[0])
print(3 + 4)

# This line fails while running, after everything above has already printed.
print("about to fail")
try:
    print(undefined_name)
except NameError as err:
    print("NameError caught:", err)

# Remove the try/except and the traceback names this line:
# NameError: name 'undefined_name' is not defined`,
      },
    ],
  },
];

export default pythonLessons;
