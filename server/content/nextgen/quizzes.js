/**
 * Knowledge checks for the next-generation lessons, keyed by
 * `<course-slug>/<module-slug>/<lesson-slug>`.
 *
 * Each question has four options, one correct index, and an explanation that says
 * why the wrong answers are wrong — the explanation is the point, not the score.
 */

export const quizBank = {
  'python-programming/foundations/how-python-runs': [
    {
      prompt: 'A file has a syntax error on line 40. What happens to the `print` on line 2?',
      options: ['It prints, then execution stops at line 40', 'Nothing prints — the file never starts running', 'Line 2 prints twice', 'Python skips line 40 and finishes'],
      correct: 1,
      explanation: 'The whole file is parsed and compiled before the first instruction runs, so a syntax error anywhere stops the program before any output.',
    },
    {
      prompt: 'Where in a traceback do you find what went wrong?',
      options: ['The first line', 'The last line', 'The line starting with "File"', 'Nowhere — you must read the code'],
      correct: 1,
      explanation: 'The last line names the exception type and message. The frames above it show the path that led there.',
    },
    {
      prompt: 'What is bytecode?',
      options: [
        'The text of your .py file',
        'A simplified instruction list your source is compiled to before execution',
        'Machine code for your CPU',
        'The output of `print()`',
      ],
      correct: 1,
      explanation: 'Bytecode is the intermediate form the interpreter executes. Machine code is produced only by an ahead-of-time compiler or a JIT, not by CPython at this stage.',
    },
  ],
};

export default quizBank;

// ── Python part 2 and part 3 ────────────────────────────────────────────────
Object.assign(quizBank, {
  'python-programming/foundations/types-and-operators': [
    {
      prompt: 'Why is `0.1 + 0.2 == 0.3` false in Python?',
      options: [
        ['Because floats store binary fractions, and neither 0.1 nor 0.2 is exact', true],
        ['Because Python truncates floats to 16 digits before comparing', false],
        ['Because 0.3 is a Decimal and the left side is a float', false],
        ['Because == compares object identity for floats', false],
      ],
      explanation: 'Much of the precision loss comes from binary representation itself. 0.1 and 0.2 cannot be stored exactly in base 2, so their sum is 0.30000000000000004 and equality fails.',
    },
    {
      prompt: 'A function must accept `0` as a valid limit. Which check is correct?',
      options: [
        ['`if limit is None:`', true],
        ['`if not limit:`', false],
        ['`if limit == False:`', false],
        ['`if not bool(limit):`', false],
      ],
      explanation: '`not 0` is True, so `if not limit:` would treat a real limit of zero as missing. `is None` asks the actual question.',
    },
    {
      prompt: 'Which value can be used as a dictionary key?',
      options: [
        ['A tuple of hashable values', true],
        ['A list of strings', false],
        ['A set of integers', false],
        ['A dictionary', false],
      ],
      explanation: 'Keys must be hashable. Lists, sets and dicts are mutable and therefore unhashable; a tuple of hashable values is fine.',
    },
  ],
  'python-programming/foundations/control-flow': [
    {
      prompt: 'What is the main advantage of a guard clause?',
      options: [
        ['It removes special cases early, so the main path stays flat', true],
        ['It runs faster than a nested `if`', false],
        ['It catches exceptions raised inside the function', false],
        ['It replaces the need for tests', false],
      ],
      explanation: 'A guard exits as soon as a special case is known. The remaining code has one path, which is easier to read and change.',
    },
    {
      prompt: '`for i in range(3): print(i)` prints:',
      options: [
        ['0, 1, 2', true],
        ['1, 2, 3', false],
        ['0, 1, 2, 3', false],
        ['3 only', false],
      ],
      explanation: '`range(3)` starts at 0 and stops before 3. Most off-by-one bugs come from forgetting the stop-before rule.',
    },
    {
      prompt: 'What does `continue` do inside a loop?',
      options: [
        ['Skips the rest of this iteration and starts the next one', true],
        ['Leaves the loop entirely', false],
        ['Restarts the loop from the first item', false],
        ['Repeats the same iteration', false],
      ],
      explanation: '`break` leaves the loop; `continue` abandons only the current iteration.',
    },
  ],
  'python-programming/data-structures/collections-deep-dive': [
    {
      prompt: 'Why is `x in my_set` usually faster than `x in my_list`?',
      options: [
        ['A set hashes the value and jumps near it; a list must be scanned', true],
        ['A set stores items in sorted order', false],
        ['A set uses less memory, so it is always faster', false],
        ['A list copies itself before every check', false],
      ],
      explanation: 'Set membership is roughly constant time because the hash points at the bucket. List membership is a linear scan.',
    },
    {
      prompt: 'You need to deduplicate values but keep the original order. What do you use?',
      options: [
        ['A dict used as an ordered set of seen keys', true],
        ['`set(values)`, because sets preserve order', false],
        ['`sorted(values)`', false],
        ['A list with `values.remove()` inside the loop', false],
      ],
      explanation: 'Dicts preserve insertion order, so `list(dict.fromkeys(values))` deduplicates while keeping first occurrences.',
    },
    {
      prompt: 'What does `len({1, 2, 2, 3})` return?',
      options: ['3', '4', '2', 'An error'],
      correct: 0,
      explanation: 'A set holds unique values, so the duplicate 2 collapses and the length is 3.',
    },
  ],
  'python-programming/data-structures/functions-and-scope': [
    {
      prompt: 'Why is `def f(x, acc=[])` dangerous?',
      options: [
        ['The default list is created once and shared across all calls', true],
        ['Lists cannot be default arguments', false],
        ['The list is recreated on every call, which is slow', false],
        ['It makes the function return None', false],
      ],
      explanation: 'Defaults are evaluated when the `def` runs, not per call. Use `None` as the sentinel and build the list inside.',
    },
    {
      prompt: 'What does a `*` in a signature such as `def f(a, *, b)` mean?',
      options: [
        ['`b` must be passed by keyword', true],
        ['Any number of positional arguments is allowed', false],
        ['`a` is optional', false],
        ['The function returns a tuple', false],
      ],
      explanation: 'Everything after `*` is keyword-only, which makes call sites self-describing and prevents silent argument reordering.',
    },
    {
      prompt: 'What is the difference between `sorted(xs)` and `xs.sort()`?',
      options: [
        ['`sorted` returns a new list; `sort` mutates and returns None', true],
        ['They are identical', false],
        ['`sorted` only works on numbers', false],
        ['`sort` returns a sorted copy and leaves `xs` alone', false],
      ],
      explanation: 'This is the standard mutable-versus-copy distinction in Python. Accidentally using the return value of `.sort()` is a common bug.',
    },
  ],
  'python-programming/objects-and-typing/classes-and-dataclasses': [
    {
      prompt: 'When is a dict a better choice than a dataclass?',
      options: [
        ['When the field names are not known until runtime', true],
        ['When you need methods on the value', false],
        ['When you want type hints', false],
        ['When the object must be immutable', false],
      ],
      explanation: 'A dataclass is for a fixed set of fields. Unknown, data-driven keys are what dicts are for.',
    },
    {
      prompt: 'What does `field(default_factory=list)` solve in a dataclass?',
      options: [
        ['It creates a fresh list per instance instead of one shared default', true],
        ['It makes the list immutable', false],
        ['It converts the list to a tuple', false],
        ['It shares the list to save memory', false],
      ],
      explanation: 'A plain `= []` would be shared by every instance — the same mutable-default trap as in functions.',
    },
    {
      prompt: 'Why prefer composition over inheritance by default?',
      options: [
        ['"Has-a" relationships change less often than "is-a" hierarchies', true],
        ['Inheritance is not supported at scale', false],
        ['Composition runs faster in all cases', false],
        ['Inheritance prevents type hints', false],
      ],
      explanation: 'Composition keeps each piece independently testable and replaceable; deep hierarchies become rigid as requirements change.',
    },
  ],
  'python-programming/objects-and-typing/exceptions': [
    {
      prompt: 'Why is a bare `except:` a problem?',
      options: [
        ['It also catches KeyboardInterrupt and SystemExit, and hides real bugs', true],
        ['It is slower than `except Exception`', false],
        ['It only catches your own custom exceptions', false],
        ['It re-raises the exception automatically', false],
      ],
      explanation: 'A bare except swallows everything, including the signal that you pressed Ctrl-C, and makes failures invisible.',
    },
    {
      prompt: 'What does `raise ConfigError(...) from err` add?',
      options: [
        ['It keeps the original exception as the cause in the traceback', true],
        ['It ignores the original exception completely', false],
        ['It retries the failing operation', false],
        ['It converts the error into a warning', false],
      ],
      explanation: 'Chaining preserves the low-level detail while the new exception explains the business meaning.',
    },
    {
      prompt: 'When should you *not* catch an exception?',
      options: [
        ['When this code cannot fix it or report it meaningfully', true],
        ['Always — catching is bad practice', false],
        ['Only when the exception is a ValueError', false],
        ['When the function is called from a loop', false],
      ],
      explanation: 'Letting it surface to a boundary that logs and fails visibly is better than a silent swallow.',
    },
  ],
  'python-programming/project-tooling/venv-and-packages': [
    {
      prompt: 'What does activating a virtual environment change?',
      options: [
        ['Which interpreter and package directory the shell resolves', true],
        ['The Python language version of the system', false],
        ['The operating system PATH permanently', false],
        ['The code inside the project', false],
      ],
      explanation: 'It changes the resolved `python` and `pip`, which is why a fresh shell needs activating again.',
    },
    {
      prompt: 'Why should `.venv/` not be committed?',
      options: [
        ['It is large and platform-specific; the lockfile describes the set', true],
        ['It contains secrets', false],
        ['Git cannot store binary files', false],
        ['It breaks type hints', false],
      ],
      explanation: 'Commit the dependency list and lockfile; rebuild the environment on each machine.',
    },
    {
      prompt: 'What is a transitive dependency?',
      options: [
        ['A package required by a package you asked for', true],
        ['A package you deleted', false],
        ['A dependency only used in tests', false],
        ['A package with no version pin', false],
      ],
      explanation: 'You install requests; it needs urllib3, certifi and others. Those are transitive and belong in the lockfile.',
    },
  ],
  'python-programming/project-tooling/testing-and-project': [
    {
      prompt: 'Why write a failing test before fixing a bug?',
      options: [
        ['It proves the bug exists and later proves the fix addresses it', true],
        ['It makes the fix run faster', false],
        ['It is required by Python', false],
        ['It removes the need for a code review', false],
      ],
      explanation: 'A regression test written from the bug report turns an opinion into evidence, and stops the bug returning.',
    },
    {
      prompt: 'What makes a good test name?',
      options: [
        ['It names the behaviour the test guarantees', true],
        ['It names the function and line number', false],
        ['It is short, such as `test1`', false],
        ['It includes the ticket number only', false],
      ],
      explanation: 'A failing test should read like a sentence describing what broke.',
    },
    {
      prompt: 'What is the minimum a README needs?',
      options: [
        ['What it does, how to install, the exact run command, sample output', true],
        ['A screenshot and a licence', false],
        ['A list of every file', false],
        ['A changelog', false],
      ],
      explanation: 'Someone should be able to run the project from the README alone, in two commands.',
    },
  ],
});

// ── Data Structures & Algorithms ────────────────────────────────────────────
Object.assign(quizBank, {
  'data-structures-algorithms/complexity/big-o': [
    {
      prompt: 'A single loop over n items contains `item in my_list`. What is the complexity?',
      options: [
        ['O(n^2), because the membership test is itself O(n)', true],
        ['O(n), because there is only one loop', false],
        ['O(log n), because list lookups are binary searches', false],
        ['O(1), because Python optimises it', false],
      ],
      explanation: 'A list membership test scans the list, so the outer loop multiplies: n * n.',
    },
    {
      prompt: 'A function takes about 4x longer when the input doubles. Which class fits?',
      options: [
        ['O(n^2)', true],
        ['O(n)', false],
        ['O(log n)', false],
        ['O(1)', false],
      ],
      explanation: 'Doubling n gives 2^2 = 4x work. Linear would double, logarithmic would barely change.',
    },
    {
      prompt: 'What does Big-O deliberately ignore?',
      options: [
        ['Constant factors and hardware speed', true],
        ['The number of loop iterations', false],
        ['Whether the input is sorted', false],
        ['Memory usage, always', false],
      ],
      explanation: 'Big-O describes growth, not milliseconds. Two O(n) functions can differ by a large constant.',
    },
  ],
  'data-structures-algorithms/complexity/arrays-strings': [
    {
      prompt: 'Why is the sorted two-pointer pair sum O(n) after sorting?',
      options: [
        ['Each pointer only moves inward, so every element is visited once', true],
        ['Because sorting removes duplicates', false],
        ['Because Python lists are hash maps', false],
        ['Because the loop has a break statement', false],
      ],
      explanation: 'The scan is linear; the sort that enables it is O(n log n). No nested loop remains.',
    },
    {
      prompt: 'When should you prefer a seen-set over sorting?',
      options: [
        ['When you must preserve original positions or avoid the sort cost', true],
        ['Always — sets are never slower', false],
        ['When the data is already sorted', false],
        ['When memory must be minimal', false],
      ],
      explanation: 'A set trades memory for linear time and keeps the original order; sorting changes indices.',
    },
    {
      prompt: '`while lo < hi` is used instead of `while lo <= hi` in a pair-sum scan because:',
      options: [
        ['The same element must not be paired with itself', true],
        ['`lo <= hi` is invalid Python syntax', false],
        ['It makes the loop faster', false],
        ['`lo` and `hi` start at 1', false],
      ],
      explanation: 'With `<=` the pointers can meet, pairing an element with itself and producing a false match.',
    },
  ],
  'data-structures-algorithms/linear-structures/linked-lists': [
    {
      prompt: 'Why is removing the first element of a Python list O(n)?',
      options: [
        ['Every remaining element shifts one position', true],
        ['The list must be re-hashed', false],
        ['Python copies the whole list', false],
        ['It is actually O(1)', false],
      ],
      explanation: 'A list is a contiguous array; removing the front leaves a gap that must be closed by shifting.',
    },
    {
      prompt: 'What does a dummy head node protect you from?',
      options: [
        ['A separate code path for removing the head node', true],
        ['Cycles in the list', false],
        ['Null pointer exceptions in Python', false],
        ['Running out of memory', false],
      ],
      explanation: 'With a dummy in front, every real node has a predecessor, so removal has one code path.',
    },
    {
      prompt: 'How does Floyd’s cycle detection work without extra memory?',
      options: [
        ['A fast pointer laps a slow pointer, so they must meet inside a cycle', true],
        ['It marks each node as visited in the node itself', false],
        ['It uses a set of node ids', false],
        ['It counts nodes and compares with the length', false],
      ],
      explanation: 'Two pointers at different speeds meet if and only if there is a cycle.',
    },
  ],
  'data-structures-algorithms/linear-structures/stacks-queues': [
    {
      prompt: 'Why is a stack the right structure for matching brackets?',
      options: [
        ['The most recently opened bracket must be closed first', true],
        ['Because brackets are stored alphabetically', false],
        ['Because a stack sorts its contents', false],
        ['Because it keeps the input order', false],
      ],
      explanation: 'Nesting is LIFO: the last opener is the first thing that must be closed.',
    },
    {
      prompt: 'Which deque operations are O(1)?',
      options: [
        ['append and popleft', true],
        ['insert in the middle only', false],
        ['index lookup by value', false],
        ['sort', false],
      ],
      explanation: 'A deque is built for both ends; searching by value is still linear.',
    },
    {
      prompt: 'Reading a Python traceback, where is the actual error?',
      options: [
        ['On the last line, which names the exception', true],
        ['On the first line', false],
        ['In the middle frame', false],
        ['It is not shown; you must read the code', false],
      ],
      explanation: 'The final line has the exception type and message; the frames above show the path taken.',
    },
  ],
  'data-structures-algorithms/trees-graphs/tree-traversal': [
    {
      prompt: 'Which traversal yields sorted output for a binary search tree?',
      options: ['In-order', 'Pre-order', 'Post-order', 'Breadth-first'],
      correct: 0,
      explanation: 'In-order visits left subtree, node, then right subtree, which is ascending order in a BST.',
    },
    {
      prompt: 'Which traversal computes folder sizes correctly?',
      options: [
        ['Post-order, because children finish before the parent', true],
        ['Pre-order, because the parent is seen first', false],
        ['Breadth-first, because it is level-based', false],
        ['Any of them — order does not matter', false],
      ],
      explanation: 'A folder total needs its children’s totals, so children must be processed first.',
    },
    {
      prompt: 'What does BFS guarantee in an unweighted graph?',
      options: [
        ['The shortest path in number of edges', true],
        ['The cheapest path by edge weight', false],
        ['That every node is visited exactly once in sorted order', false],
        ['Nothing beyond reachability', false],
      ],
      explanation: 'BFS explores level by level, so the first arrival is by the fewest edges.',
    },
  ],
  'data-structures-algorithms/trees-graphs/graphs': [
    {
      prompt: 'When is BFS sufficient for shortest path?',
      options: [
        ['When every edge has the same cost', true],
        ['Always', false],
        ['Only for trees', false],
        ['Never — Dijkstra is required', false],
      ],
      explanation: 'With equal weights, fewest edges equals cheapest path.',
    },
    {
      prompt: 'Why does Dijkstra refuse negative edge weights?',
      options: [
        ['A cheaper path could be discovered later, breaking the finalised assumption', true],
        ['Negative numbers are not allowed in Python heaps', false],
        ['It would loop forever', false],
        ['It cannot store floats', false],
      ],
      explanation: 'Dijkstra finalises a node when popped; a later negative edge could still improve it.',
    },
    {
      prompt: 'An adjacency list uses memory proportional to:',
      options: ['V + E', 'V^2', 'E^2', 'V * E'],
      correct: 0,
      explanation: 'It stores each vertex once plus each edge (twice if undirected), unlike a matrix at V^2.',
    },
  ],
  'data-structures-algorithms/advanced-patterns/dynamic-programming': [
    {
      prompt: 'What two conditions must hold for dynamic programming to apply?',
      options: [
        ['Optimal substructure and overlapping subproblems', true],
        ['Sorted input and unique values', false],
        ['Recursion and a global cache', false],
        ['A monotonic predicate and a heap', false],
      ],
      explanation: 'Without repetition of subproblems, caching gains nothing; that is divide-and-conquer.',
    },
    {
      prompt: 'When is bottom-up preferable to memoisation?',
      options: [
        ['When recursion depth is a risk or constant memory is needed', true],
        ['Always — memoisation is never used in practice', false],
        ['Only when the cache would be small', false],
        ['When the input is sorted', false],
      ],
      explanation: 'Bottom-up avoids the recursion limit and allows rolling-variable space optimisation.',
    },
    {
      prompt: 'Why does memoising the climb function change it from exponential to linear?',
      options: [
        ['There are only n distinct inputs, each computed once', true],
        ['Because `lru_cache` uses a faster loop', false],
        ['Because it converts recursion to iteration', false],
        ['Because the numbers get smaller', false],
      ],
      explanation: 'Exponential time came from recomputation; caching leaves one computation per state.',
    },
  ],
  'data-structures-algorithms/advanced-patterns/sorting-searching': [
    {
      prompt: 'What does a lower-bound search return when the target is absent?',
      options: [
        ['The index where it would be inserted to keep the list sorted', true],
        ['-1', false],
        ['None', false],
        ['The nearest larger value', false],
      ],
      explanation: 'Lower bound is the first index with value >= target, present or not — exactly what ranges need.',
    },
    {
      prompt: 'Why can binary search work when there is no array?',
      options: [
        ['It only needs a monotonic predicate over the candidate range', true],
        ['Because Python fakes an array internally', false],
        ['It cannot — an array is required', false],
        ['Because the answer is always an integer', false],
      ],
      explanation: 'Search-over-answers bisects a value range where "is c enough?" is monotonic.',
    },
    {
      prompt: 'What does a stable sort guarantee?',
      options: [
        ['Equal elements keep their original relative order', true],
        ['The sort never takes longer than O(n)', false],
        ['Duplicates are removed', false],
        ['The input list is never modified', false],
      ],
      explanation: 'Stability is what makes multi-key sorting possible by sorting least-significant key first.',
    },
  ],
});

// ── Generative AI ───────────────────────────────────────────────────────────
Object.assign(quizBank, {
  'generative-ai/how-llms-work/tokens-and-embeddings': [
    {
      prompt: 'Why does a 20-turn chat cost more than one prompt of the same total length?',
      options: [
        ['Each turn resends the accumulated history as input tokens', true],
        ['Models charge more per turn after the first', false],
        ['Answers get longer over time automatically', false],
        ['Embeddings are regenerated for the whole history', false],
      ],
      explanation: 'The conversation is sent again on every call, so earlier tokens are billed repeatedly.',
    },
    {
      prompt: 'Two texts have cosine similarity 0.08. What does that mean?',
      options: [
        ['Their embeddings point in nearly unrelated directions', true],
        ['They are near-duplicates', false],
        ['One is a substring of the other', false],
        ['The embeddings are invalid', false],
      ],
      explanation: 'Cosine similarity near 0 means almost no shared direction; near 1 means very similar meaning.',
    },
    {
      prompt: 'Why is "four characters per token" a poor estimate for code and URLs?',
      options: [
        ['Punctuation and symbols tokenise more finely, so real counts are higher', true],
        ['Code is always tokenised as whole lines', false],
        ['Tokens are counted in bytes for code', false],
        ['Code cannot be tokenised', false],
      ],
      explanation: 'Tokenisers split on symbols, so brackets, dots and slashes add tokens beyond the word-count intuition.',
    },
  ],
  'generative-ai/how-llms-work/attention': [
    {
      prompt: 'What happens to a token just outside the context window?',
      options: [
        ['It is invisible to the model — there is no attention to it at all', true],
        ['It is moved to the end of the window', false],
        ['It is summarised automatically', false],
        ['It is retrieved later if needed', false],
      ],
      explanation: 'Attention is bounded by the window. Nothing outside it can influence the answer.',
    },
    {
      prompt: 'Why do models recall the start and end of long input better than the middle?',
      options: [
        ['Attention is not uniform; recall in the middle measurably drops', true],
        ['The middle is truncated first', false],
        ['Middle tokens have larger ids', false],
        ['It is an illusion — recall is uniform', false],
      ],
      explanation: 'The "lost in the middle" effect is measured: position in a long input changes how reliably content is used.',
    },
    {
      prompt: 'A document-based answer is wrong. What should you check first?',
      options: [
        ['Whether the relevant passage was in the window and retrievable', true],
        ['Whether the model is the largest available', false],
        ['Whether the prompt uses polite language', false],
        ['Whether the temperature is 0', false],
      ],
      explanation: 'Most wrong answers from documents are context problems: the evidence was never attended to.',
    },
  ],
  'generative-ai/prompt-engineering/prompt-structure': [
    {
      prompt: 'Why is an output contract more valuable than a longer instruction?',
      options: [
        ['It makes the output machine-checkable, so failures are caught', true],
        ['It guarantees the model never hallucinates', false],
        ['Longer instructions are ignored by older models', false],
        ['It reduces token cost to zero', false],
      ],
      explanation: 'Structure plus validation turns silent drift into a rejection you can retry.',
    },
    {
      prompt: 'A validator receives `{"total": "4999"}` where a number is required. What is correct?',
      options: [
        ['Reject it and retry with the validation error', true],
        ['Coerce it with float() and continue', false],
        ['Store it as text', false],
        ['Ignore the field', false],
      ],
      explanation: 'Coercion hides exactly the model drift you need to detect.',
    },
    {
      prompt: 'What does a refusal rule reduce?',
      options: [
        ['Hallucination, by giving the model a legitimate "unknown"', true],
        ['Token usage to zero', false],
        ['The need for validation', false],
        ['Latency', false],
      ],
      explanation: 'Without a refusal path the model fills gaps with plausible invention.',
    },
  ],
  'generative-ai/prompt-engineering/evaluation': [
    {
      prompt: 'Why must an evaluation set contain known failures?',
      options: [
        ['So it can detect regressions and prove improvements', true],
        ['To keep the accuracy score lower', false],
        ['Because models only fail on hard cases', false],
        ['To reduce token cost', false],
      ],
      explanation: 'A set with no failures cannot tell you whether a change broke anything.',
    },
    {
      prompt: 'You score 5/5 on your evaluation set. What does it mean?',
      options: [
        ['The approach works; production accuracy is still unknown', true],
        ['Production accuracy is 100%', false],
        ['No further testing is needed', false],
        ['The metric is proven correct', false],
      ],
      explanation: 'Five cases is far too small to estimate real accuracy — it validates the harness, not the product.',
    },
    {
      prompt: 'Why report cost with quality?',
      options: [
        ['A slightly better prompt at twice the cost is usually the wrong choice', true],
        ['Cost is always more important than quality', false],
        ['Quality scores must be normalised by cost', false],
        ['Cost is the only deterministic metric', false],
      ],
      explanation: 'The product decision needs both numbers; either alone enables a bad trade.',
    },
  ],
  'generative-ai/rag/rag-pipeline': [
    {
      prompt: 'Which stage is the most common source of bad RAG answers?',
      options: [
        ['Chunking — passages that lose their meaning make retrieval useless', true],
        ['The temperature setting', false],
        ['The model vendor', false],
        ['The output length limit', false],
      ],
      explanation: 'A chunk beginning mid-sentence cannot be used even by a perfect prompt.',
    },
    {
      prompt: 'Why is an exact refusal string useful?',
      options: [
        ['The client can detect a refusal deterministically in code', true],
        ['It reduces tokens', false],
        ['It makes retrieval faster', false],
        ['It prevents prompt injection', false],
      ],
      explanation: 'A fixed phrase turns "declined to answer" into a checkable condition instead of a guess.',
    },
    {
      prompt: 'Recall@3 of 0.95 tells you:',
      options: [
        ['The supporting passage is usually retrieved; nothing about answer quality', true],
        ['95% of answers are correct', false],
        ['The prompt is well designed', false],
        ['The model is not hallucinating', false],
      ],
      explanation: 'Retrieval and generation are measured separately; good retrieval is necessary, not sufficient.',
    },
  ],
  'generative-ai/responsible-ai/safety-and-cost': [
    {
      prompt: 'Why does prompt wording alone not stop prompt injection?',
      options: [
        ['Untrusted data and instructions share one channel, so text can act as commands', true],
        ['Models ignore system prompts', false],
        ['Injection only happens with images', false],
        ['Because temperature is above zero', false],
      ],
      explanation: 'The structural fix is separation of roles, least privilege and output validation.',
    },
    {
      prompt: 'What is the security boundary when summarising untrusted text?',
      options: [
        ['The tool has no capability to be tricked into using', true],
        ['A long list of forbidden phrases', false],
        ['A strict temperature of 0', false],
        ['Billing alerts', false],
      ],
      explanation: 'Least privilege means a successful injection has nothing dangerous to invoke.',
    },
    {
      prompt: 'What must a model-backed feature be able to state before shipping?',
      options: [
        ['Its worst-case token cost per request', true],
        ['The exact wording of its prompt', false],
        ['The vendor’s model size', false],
        ['The number of layers in the model', false],
      ],
      explanation: 'Without a worst-case cost you cannot bound spend or rate limits.',
    },
  ],
  'generative-ai/responsible-ai/genai-capstone': [
    {
      prompt: 'Why does the test set include an unanswerable question?',
      options: [
        ['To test refusal, the behaviour that prevents invented answers', true],
        ['To make accuracy look lower', false],
        ['Because retrieval always fails on those', false],
        ['To measure latency only', false],
      ],
      explanation: 'Refusal is a feature; untested refusal becomes hallucination in production.',
    },
    {
      prompt: 'What must be validated in an answer that carries [n] citations?',
      options: [
        ['Every cited id is among the retrieved chunks', true],
        ['The citation number matches the sentence number', false],
        ['Citations are alphabetically ordered', false],
        ['At least five citations exist', false],
      ],
      explanation: 'Otherwise the model can cite a plausible-sounding source that was never retrieved.',
    },
    {
      prompt: 'No provider key is configured. How should the report word the result?',
      options: [
        ['State which stages ran and which were not exercised, and why', true],
        ['Say the assistant was tested end to end', false],
        ['Omit the evaluation section', false],
        ['Use sample answers and present them as real', false],
      ],
      explanation: 'Honesty about the boundary of the test is what makes the rest of the report believable.',
    },
  ],
});
