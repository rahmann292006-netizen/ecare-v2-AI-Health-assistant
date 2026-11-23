/**
 * Python Programming — next-generation lessons (part 3): data structures,
 * functions, objects, errors and tooling. Same shape as parts 1 and 2.
 */

export const pythonLessons3 = [
  {
    module: 'data-structures',
    slug: 'collections-deep-dive',
    kind: 'code',
    durationMinutes: 30,
    title: 'Choose the Container That Fits the Question',
    technicalTitle: 'Lists, tuples, dicts, sets and their performance',
    level: 'beginner',
    objectives: [
      'Pick a container from the question you are asking, not from habit',
      'Explain why a set membership test is faster than a list scan',
      'Use a dict for lookup and a list for order',
      'Recognise when a tuple is the honest type',
    ],
    body: String.raw`## The situation

A script imports a 200,000-row CSV and removes duplicates. On the developer's laptop it takes four seconds. In the nightly job, with rows that grew to two million, it takes an hour and falls over. The change that fixes it is one line: swap a list for a set. The algorithm was never the problem — the container was.

## What you can do afterwards

- Answer "which container?" from the question in one sentence.
- Say what a membership test costs for a list versus a set or dict.
- Keep order and lookup working together with a dict.
- Know which containers can be dictionary keys.

## The idea, in plain words

A container is a way of storing several values, and each way makes one question cheap and the others expensive.

- **list** — order matters, duplicates allowed. Ask "what is at position 3?" and "what comes next?". Looking for a value means scanning.
- **tuple** — a small, fixed group where position carries meaning (a latitude and longitude, a row from a query). Immutable, so it can be a key.
- **dict** — a lookup table. Ask "what is the value for this key?" and the cost is roughly constant, however many keys there are.
- **set** — a bag of unique things. Ask "is this in here?" and "what is common between these two groups?".

Two dicts can answer most real-world questions: one maps names to values, another counts occurrences. A set answers deduplication and membership.

## The terms, precisely

- **Hash** — a number computed from a value, used to find it quickly. Mutable containers cannot be hashed, so they cannot be keys.
- **Amortised O(1)** — constant time "on average over many operations", the honest description of a dict lookup.
- **Insertion order** — dicts keep the order keys were added; a set does not promise meaningful order.
- **Shallow copy** — a new outer container whose items are the same objects.

## Walk through it

` + '```python\nimport time\n\nids = list(range(200_000))\ntarget = "199999"\n\n# List membership: scan until found or exhausted.\nstart = time.perf_counter()\n_ = 199_999 in ids\nlist_time = time.perf_counter() - start\n\nid_set = set(ids)\nstart = time.perf_counter()\n_ = 199_999 in id_set\nset_time = time.perf_counter() - start\n\nprint(f"list {list_time*1000:.3f} ms · set {set_time*1000:.3f} ms")\n\n# Counting without dict.get dance\ndef count_words(text):\n    counts = {}\n    for word in text.lower().split():\n        counts[word] = counts.get(word, 0) + 1\n    return counts\n\nprint(count_words("to be or not to be"))\n\n# Deduplicate but keep the original order — a dict, not a set.\nseen = {}\nfor row in ["a", "b", "a", "c"]:\n    seen.setdefault(row, True)\nprint(list(seen))    # ["a", "b", "c"]\n```' + String.raw`

Expected output:

` + '```\nlist 0.004 ms · set 0.001 ms\n{\'to\': 2, \'be\': 2, \'or\': 1, \'not\': 1}\n[\'a\', \'b\', \'c\']\n```' + String.raw`

The timing numbers vary, but the shape does not: the list cost grows with the number of items, the set stays flat. At two million rows that difference is minutes.

## Where this shows up

- **ETL and data cleaning** — sets for dedupe and overlap, dicts for counting.
- **Caching** — a dict keyed by request parameters is the simplest cache in existence.
- **Permissions** — a set of roles makes "does this user have admin?" a single lookup.

## Mistakes worth avoiding

- **Unhashable keys.** ` + '`d[[1, 2]] = 3`' + String.raw` raises ` + '`TypeError`' + String.raw`; convert to a tuple.
- **Relying on set ordering.** It differs between runs for some types; sort when order matters.
- **` + '`copy.copy`' + String.raw` when you meant a deep copy.** Nested lists are still shared.
- **A dict for something that is really a record.** If a class has fixed fields and behaviour, use a ` + '`dataclass`' + String.raw` (next modules).
- **Building a list only to chain it later.** If you never need it twice, a generator is enough.

## Practise now

1. Given two lists of user ids (active, suspended), produce: active-only, suspended-only, and both — with sets, in three lines.
2. Time list-versus-dict lookup for 100,000 random values and write the two numbers in your notes.
3. Build an ordered dedupe of a 10-item list containing duplicates, keeping the first occurrence.

## Check yourself

1. Why is ` + '`x in list`' + String.raw` slower than ` + '`x in set`' + String.raw`?
2. When is a tuple better than a list?
3. What happens when you use a list as a dict key?

**Answers:** (1) A list must be scanned; a set uses a hash to jump near the item. (2) When the items are fixed and position means something — it also becomes hashable. (3) ` + '`TypeError: unhashable type: \'list\'`' + String.raw`.

## Challenge

Write a function that takes a list of order dicts (` + '`{"customer": str, "total": int, "tags": [str]}`' + String.raw`) and returns the top three customers by total spend, plus the set of tags that appear on more than one order. It must run in one pass over the orders for the totals, and one for the tags. No ` + '`pandas`' + String.raw`.

## In one paragraph

Containers buy speed by making one question cheap. Ask "what is at this position?" and use a list; ask "what is the value for this key?" and use a dict; ask "is this unique or present?" and use a set; ask for a small fixed record and use a tuple. Most "slow script" problems are a container answering the wrong question.

## Go further

- The official tutorial's chapter on data structures — short, and it is the reference.
- ` + '`collections.Counter`' + String.raw`, ` + '`defaultdict`' + String.raw` and ` + '`deque`' + String.raw` in the standard library docs.
- The CPython wiki's notes on dict internals if you want the reason behind the constant time.`,
    code: [
      {
        language: 'python',
        caption: 'The same question, four containers',
        source: `import time

ids = list(range(200_000))
id_set = set(ids)

t = time.perf_counter()
print(199_999 in ids, f"{(time.perf_counter()-t)*1000:.3f} ms")

t = time.perf_counter()
print(199_999 in id_set, f"{(time.perf_counter()-t)*1000:.3f} ms")

counts = {}
for word in "to be or not to be".split():
    counts[word] = counts.get(word, 0) + 1
print(counts)

seen = {}
for row in ["a", "b", "a", "c"]:
    seen.setdefault(row, True)
print(list(seen))`,
      },
    ],
  },
  {
    module: 'data-structures',
    slug: 'functions-and-scope',
    kind: 'code',
    durationMinutes: 28,
    title: 'Functions That Are Hard to Misuse',
    technicalTitle: 'Parameters, arguments, scope and mutable defaults',
    level: 'beginner',
    objectives: [
      'Design functions with parameters that cannot be called wrongly by accident',
      'Explain local, global and closure scope',
      'Recognise and fix the mutable default argument bug',
      'Use keyword-only arguments to make call sites readable',
    ],
    body: String.raw`## The situation

A report function produces yesterday's numbers twice a day for one customer and never for another. The code was reviewed by three people. The bug is in the signature, not the body: the function was defined with ` + '`rows=[]`' + String.raw`, so every call since the process started has been appending to the same list. Nobody called it wrongly; the function made the wrong thing easy.

## What you can do afterwards

- Write a function whose call site cannot be misread.
- Explain why a default argument is evaluated once.
- Say what a name inside a function refers to, and when it does not.
- Use ` + '`*`' + String.raw` and ` + '`**`' + String.raw` deliberately rather than defensively.

## The idea, in plain words

A function is a promise: given these inputs, it produces this output. The signature is the contract, and the body should not need comments to explain how to call it.

Three rules carry most of the weight:

1. **Defaults are evaluated once, at definition time.** ` + '`def f(x, bucket=[])`' + String.raw` creates one empty list and shares it across every call. Use ` + '`None`' + String.raw` as the sentinel and create the container inside.
2. **Names inside a function are local unless declared otherwise.** Reading a global works; assigning to it creates a new local. ` + '`global`' + String.raw` exists and is almost always a sign the design needs a class or a parameter.
3. **Be explicit about what may change.** If a function sorts the caller's list, that is a side effect the caller must know about. ` + '`sorted(x)`' + String.raw` returns a new list; ` + '`x.sort()`' + String.raw` changes the caller's.

## The terms, precisely

- **Parameter** — a name in the definition. **Argument** — the value passed at the call.
- **Positional / keyword** — whether the argument is matched by position or by name.
- **Keyword-only** — a parameter declared after ` + '`*`' + String.raw` that must be passed by name.
- **Closure** — a function that remembers names from the scope where it was created.
- **Sentinel** — a value like ` + '`None`' + String.raw` used to mean "not supplied".

## Walk through it

` + '```python\ndef report(rows=None, *, title="Report", currency="INR"):\n    # None sentinel: a fresh list per call, never shared.\n    rows = list(rows or [])\n    total = sum(r["total"] for r in rows)\n    return f"{title}: {currency} {total}"\n\nprint(report([{"total": 100}]))                 # Report: INR 100\nprint(report([{"total": 50}], title="Weekly"))  # Weekly: INR 50\n\n# The bug, for contrast\ndef broken(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nprint(broken(1), broken(2))     # [1, 2] [1, 2]  <- shared!\n\n# Closure: the counter remembers count\nimport itertools\ndef counter():\n    count = itertools.count(1)\n    return lambda: next(count)\n\nnext_id = counter()\nprint(next_id(), next_id())     # 1 2\n```' + String.raw`

Expected output:

` + '```\nReport: INR 100\nWeekly: INR 50\n[1, 2] [1, 2]\n1 2\n```' + String.raw`

The ` + '`*`' + String.raw` in ` + '`report`' + String.raw` means ` + '`title`' + String.raw` and ` + '`currency`' + String.raw` can only be passed by name: ` + '`report(rows, "Weekly")`' + String.raw` fails loudly instead of silently reordering meaning.

## Where this shows up

- **Library design** — every public function is a contract someone will misuse.
- **Web handlers** — request parsing functions with defaults that leak between requests are a classic production bug.
- **Testing** — code with an injectable parameter (a clock, a client) is testable; code that reads globals is not.

## Mistakes worth avoiding

- **Mutable defaults.** Rule of thumb: if a default is ` + '`[]`' + String.raw`, ` + '`{}`' + String.raw` or ` + '`set()`' + String.raw`, it is a bug.
- **Long positional argument lists.** Past three, force keywords.
- **Returning ` + '`None`' + String.raw` on error and a value on success.** The caller forgets to check. Raise, or return a result object.
- **Mutating an argument the caller still needs.** Copy first, or document it in the docstring.
- **` + '`global`' + String.raw` to "make it work".** Pass the value in and return the new one.

## Practise now

1. Reproduce the shared-default bug, then fix it with a ` + '`None`' + String.raw` sentinel and show the two outputs side by side.
2. Rewrite a function you have written with five positional parameters so that every one after the first is keyword-only.
3. Write a closure that counts how many times a function has been called, without a global variable.

## Check yourself

1. Why does ` + '`def f(x, acc=[])`' + String.raw` share ` + '`acc`' + String.raw` between calls?
2. What does ` + '`*`' + String.raw` in a signature do?
3. What is the difference between ` + '`sorted(xs)`' + String.raw` and ` + '`xs.sort()`' + String.raw`?

**Answers:** (1) Defaults are evaluated once when the ` + '`def`' + String.raw` executes, not per call. (2) Everything after it must be passed by keyword. (3) The first returns a new list and leaves ` + '`xs`' + String.raw` alone; the second mutates in place and returns ` + '`None`' + String.raw`.

## Challenge

Write ` + '`def summarise(rows, *, by, metric="total", top=3)`' + String.raw` that groups rows by a key and returns the top N groups by the chosen metric. It must not mutate ` + '`rows`' + String.raw`, must raise a clear error if ` + '`by`' + String.raw` is not a key in a row, and must be callable with every argument named. This is the shape of every real reporting function.

## In one paragraph

A good signature makes the right call easy and the wrong call loud. Defaults are evaluated once, so use ` + '`None`' + String.raw` and build inside. Scope is local by default; passing values in beats reaching out. Keyword-only parameters and explicit mutability notes are how a function stays correct after five people have edited it.

## Go further

- The official tutorial's section on defining functions.
- PEP 3102 (keyword-only arguments) — two pages, and it changes how you design APIs.
- Any article on "why is the default argument shared" for the memory-model explanation.`,
    code: [
      {
        language: 'python',
        caption: 'None sentinel, keyword-only arguments, and a closure',
        source: `def report(rows=None, *, title="Report", currency="INR"):
    rows = list(rows or [])
    return f"{title}: {currency} {sum(r['total'] for r in rows)}"

print(report([{"total": 100}]))
print(report([{"total": 50}], title="Weekly"))

def broken(item, bucket=[]):
    bucket.append(item)
    return bucket

print(broken(1), broken(2))

import itertools
def counter():
    c = itertools.count(1)
    return lambda: next(c)

next_id = counter()
print(next_id(), next_id())`,
      },
    ],
  },
  {
    module: 'objects-and-typing',
    slug: 'classes-and-dataclasses',
    kind: 'code',
    durationMinutes: 30,
    title: 'When a Dict Stops Being Enough',
    technicalTitle: 'Classes, dataclasses, composition and type hints',
    level: 'intermediate',
    objectives: [
      'Decide between a dict, a dataclass and a full class',
      'Use composition instead of inheritance by default',
      'Add type hints that a checker can actually verify',
      'Keep objects honest with dataclass options',
    ],
    body: String.raw`## The situation

An order is a dict. Then someone adds ` + '`order["total_incl_tax"]`' + String.raw` in one module and ` + '`order["grand_total"]`' + String.raw` in another. Both are right; the numbers disagree. The dictionary permitted the mistake. A small class with three fields and one method would have made it a crash at review time instead of a wrong invoice in production.

## What you can do afterwards

- Choose the simplest type that will not let a field be invented later.
- Write a ` + '`dataclass`' + String.raw` with defaults, immutability and validation.
- Explain why composition is the default and inheritance the exception.
- Read and write function annotations that survive ` + '`mypy`' + String.raw`.

## The idea, in plain words

Use the smallest structure that captures meaning:

- A **dict** is right when the keys are data you did not know in advance (a row from JSON, counters).
- A **dataclass** is right when the fields are fixed and known: ` + '`@dataclass class Order: id: int; total: int`' + String.raw`. You get ` + '`__init__`' + String.raw`, ` + '`__repr__`' + String.raw` and ` + '`__eq__`' + String.raw` for free.
- A **class with methods** is right when the data has behaviour that belongs to it: computing tax, validating state.

Type hints do not change what Python does at runtime; they change what tools can tell you before you run anything. The value is in catching ` + '`order.totl`' + String.raw` in the editor.

Composition beats inheritance because "has-a" changes less often than "is-a". An ` + '`Order`' + String.raw` with a ` + '`Customer`' + String.raw` and a list of ` + '`LineItem`' + String.raw`s is easier to test than a ` + '`PremiumOrder`' + String.raw` that inherits from ` + '`Order`' + String.raw`.

## The terms, precisely

- **Attribute** — a value stored on an object. **Method** — a function bound to it.
- **` + '`@dataclass`' + String.raw`** — a decorator that generates boilerplate from annotations.
- **` + '`frozen=True`' + String.raw`** — makes the dataclass immutable and hashable.
- **Composition** — holding another object as a field. **Inheritance** — deriving a class from another.
- **Protocol / structural typing** — "anything with these methods will do", expressed with ` + '`typing.Protocol`' + String.raw`.

## Walk through it

` + '```python\nfrom dataclasses import dataclass, field\n\n@dataclass(frozen=True)\nclass LineItem:\n    sku: str\n    qty: int\n    unit_paise: int\n\n    def total_paise(self) -> int:\n        return self.qty * self.unit_paise\n\n@dataclass\nclass Order:\n    id: str\n    items: list[LineItem] = field(default_factory=list)\n\n    def subtotal_paise(self) -> int:\n        return sum(i.total_paise() for i in self.items)\n\n    def with_item(self, item: LineItem) -> "Order":\n        # Return a new order instead of mutating this one.\n        return Order(self.id, [*self.items, item])\n\norder = Order("A-1", [LineItem("pen", 2, 1500)])\nbigger = order.with_item(LineItem("pad", 1, 9900))\nprint(order.subtotal_paise(), bigger.subtotal_paise())   # 3000 12900\nprint(order)\n```' + String.raw`

Expected output:

` + '```\n3000 12900\nOrder(id=\'A-1\', items=[LineItem(sku=\'pen\', qty=2, unit_paise=1500)])\n```' + String.raw`

Three things worth noticing: money is in integer paise, the item is ` + '`frozen`' + String.raw` so it cannot drift, and ` + '`field(default_factory=list)`' + String.raw` is the dataclass answer to the mutable-default trap.

## Where this shows up

- **API layers** — a dataclass per request shape is the cleanest validation boundary.
- **Domain logic** — an ` + '`Order`' + String.raw` that computes its own totals cannot be asked to compute someone else's.
- **Testing** — small immutable value objects are trivial to construct in a test.

## Mistakes worth avoiding

- **` + '`items: list = []`' + String.raw` in a dataclass.** Dataclasses raise an error on this; use ` + '`default_factory`' + String.raw`.
- **Inheriting to reuse code.** If the relationship cannot be described as "is a kind of", compose instead.
- **Hiding state behind ` + '`__`' + String.raw` and calling it encapsulated.** Python trusts callers; document intent instead.
- **Type hints that lie.** A hint of ` + '`str`' + String.raw` for something that is sometimes ` + '`None`' + String.raw` should be ` + '`str | None`' + String.raw`.
- **A class for everything.** If it has no behaviour, a dict or a ` + '`NamedTuple`' + String.raw` is lighter.

## Practise now

1. Convert an existing order dict in your code (or the one above) into a dataclass with a computed total.
2. Make the item ` + '`frozen=True`' + String.raw` and confirm that assigning to a field raises.
3. Add one method that would have been a bug as a dict operation — for example ` + '`Order.add_item()`' + String.raw` rejecting negative quantities.

## Check yourself

1. When is a dict better than a dataclass?
2. Why does ` + '`frozen=True`' + String.raw` matter for a value type?
3. What does ` + '`field(default_factory=list)`' + String.raw` solve?

**Answers:** (1) When the keys are not known in advance. (2) It prevents a shared object quietly changing, and makes instances hashable. (3) It creates a fresh list per instance instead of one shared default.

## Challenge

Model a course enrolment: a ` + '`Course`' + String.raw` (title, lessons count), a ` + '`Student`' + String.raw` (id, name) and an ` + '`Enrolment`' + String.raw` (student, course, completed lessons). Give ` + '`Enrolment`' + String.raw` a ` + '`progress_percent`' + String.raw` property and a ` + '`complete_lesson()`' + String.raw` method that refuses to exceed the course length. No dictionaries for the model.

## In one paragraph

A dict is for unknown keys; a dataclass is for a fixed set of fields with free equality and printing; a class with methods is for data with behaviour. Prefer composition, keep value objects frozen, and use type hints so mistakes surface in the editor rather than in production.

## Go further

- The ` + '`dataclasses`' + String.raw` documentation — the ` + '`field`' + String.raw` options are quick to read.
- PEP 8's naming and class sections for style.
- The ` + '`typing`' + String.raw` docs for ` + '`Protocol`' + String.raw` once you are comfortable with annotations.`,
    code: [
      {
        language: 'python',
        caption: 'A value object that cannot drift',
        source: `from dataclasses import dataclass, field

@dataclass(frozen=True)
class LineItem:
    sku: str
    qty: int
    unit_paise: int

    def total_paise(self) -> int:
        return self.qty * self.unit_paise

@dataclass
class Order:
    id: str
    items: list[LineItem] = field(default_factory=list)

    def subtotal_paise(self) -> int:
        return sum(i.total_paise() for i in self.items)

order = Order("A-1", [LineItem("pen", 2, 1500)])
print(order.subtotal_paise())
print(order)`,
      },
    ],
  },
  {
    module: 'objects-and-typing',
    slug: 'exceptions',
    kind: 'reading',
    durationMinutes: 24,
    title: 'Fail Loudly, Recover Deliberately',
    technicalTitle: 'Exceptions, raising, catching and not hiding errors',
    level: 'intermediate',
    objectives: [
      'Distinguish an error to handle from an error to report',
      'Catch the narrowest exception that makes sense',
      'Raise exceptions that carry useful context',
      'Stop losing errors inside a bare except',
    ],
    body: String.raw`## The situation

A nightly import "succeeded" for three weeks. It never did: someone wrapped the loop in ` + '`try: ... except: pass`' + String.raw` to stop a single bad row failing the job. Every row failed. The log said nothing, because the code had been written to say nothing.

## What you can do afterwards

- Decide, per call, whether to handle an error or let it surface.
- Catch ` + '`ValueError`' + String.raw` instead of ` + '`Exception`' + String.raw`.
- Add context when re-raising so a traceback explains the business meaning.
- Use ` + '`finally`' + String.raw` for cleanup that must happen either way.

## The idea, in plain words

An exception is a value that says "this operation could not complete". It travels up the call stack until something catches it. Two decisions follow:

1. **Can this code actually do anything about it?** If not, do not catch it — let it reach a place that logs it and fails visibly.
2. **What is the smallest range of failures I am handling?** ` + '`except ValueError`' + String.raw` and ` + '`except (KeyError, TypeError)`' + String.raw` are honest; ` + '`except Exception`' + String.raw` claims to handle everything, including bugs you did not anticipate.

A bare ` + '`except:`' + String.raw` also catches ` + '`KeyboardInterrupt`' + String.raw`, which is why pressing Ctrl-C sometimes does nothing.

## The terms, precisely

- **raise** — start an exception. **catch / handle** — stop it with ` + '`except`' + String.raw`.
- **Chaining** — ` + '`raise NewError(...) from err`' + String.raw` keeps the original as the cause.
- **` + '`finally`' + String.raw`** — runs whether or not an exception occurred.
- **` + '`else`' + String.raw` on try** — runs only if no exception happened.

## Walk through it

` + '```python\nclass ConfigError(Exception):\n    """Raised when a required setting is missing or malformed."""\n\ndef read_port(raw):\n    try:\n        port = int(raw)\n    except (TypeError, ValueError) as err:\n        # Add what the caller needs to know, keep the original as the cause.\n        raise ConfigError(f"PORT must be a whole number, got {raw!r}") from err\n    if not (1 <= port <= 65535):\n        raise ConfigError(f"PORT out of range: {port}")\n    return port\n\nfor value in ["8080", "eighty", 70000]:\n    try:\n        print("port:", read_port(value))\n    except ConfigError as err:\n        print("config problem:", err, "| cause:", type(err.__cause__).__name__ if err.__cause__ else None)\n```' + String.raw`

Expected output:

` + '```\nport: 8080\nconfig problem: PORT must be a whole number, got \'eighty\' | cause: ValueError\nconfig problem: PORT out of range: 70000 | cause: None\n```' + String.raw`

The first case succeeds, the second is caught after conversion fails, the third is a range problem caught before it ever becomes a number problem. The message names the setting, the value and the rule — three things a log line needs.

## Where this shows up

- **Configuration and startup** — fail fast with a clear message rather than at 3 a.m.
- **API boundaries** — convert library exceptions into your own error type at the edge.
- **Batch jobs** — collect per-item errors, and fail the run at the end with a count.

## Mistakes worth avoiding

- **` + '`except: pass`' + String.raw`.** It is never the right answer; log at least.
- **Catching ` + '`Exception`' + String.raw` around a whole function.** You will swallow ` + '`NameError`' + String.raw` and then debug it for an hour.
- **Raising ` + '`Exception("error")`' + String.raw`.** Make your own class so callers can be specific.
- **Using exceptions for normal flow.** A missing optional value is not exceptional.
- **Rounding money in a ` + '`finally`' + String.raw` block.** Cleanup should not change results.

## Practise now

1. Wrap a file read in a ` + '`try/except FileNotFoundError`' + String.raw` that prints the path it looked for.
2. Add ` + '`from err`' + String.raw` chaining to an exception you raise, then print ` + '`err.__cause__`' + String.raw`.
3. Write a batch loop that collects failures in a list and raises a summary error at the end if any item failed.

## Check yourself

1. When should you not catch an exception?
2. What is the difference between ` + '`except Exception`' + String.raw` and a bare ` + '`except:`' + String.raw`?
3. Why use ` + '`raise ... from err`' + String.raw`?

**Answers:** (1) When the current code cannot fix or meaningfully report it — let it reach the boundary. (2) The bare form also catches ` + '`KeyboardInterrupt`' + String.raw` and ` + '`SystemExit`' + String.raw`. (3) It keeps the original traceback as the cause, so the real bug is not hidden.

## Challenge

Add proper error handling to a small CLI you have written: a custom error class, one boundary that prints the message and exits with code 1, and per-item error collection. Then run it with a bad input and paste the output into your notes — that output is the deliverable.

## In one paragraph

Catch only what you can handle, name your exceptions, and always keep the cause. A traceback you can read is the cheapest debugging tool you own; a silently swallowed error costs days.

## Go further

- The official tutorial's chapter on errors and exceptions.
- PEP 3134 (exception chaining) for the ` + '`from err`' + String.raw` semantics.
- The ` + '`logging`' + String.raw` documentation — ` + '`logger.exception`' + String.raw` inside an ` + '`except`' + String.raw` block is the standard pattern.`,
    code: [
      {
        language: 'python',
        caption: 'A specific error, with the cause kept',
        source: `class ConfigError(Exception):
    """Raised when a required setting is missing or malformed."""

def read_port(raw):
    try:
        port = int(raw)
    except (TypeError, ValueError) as err:
        raise ConfigError(f"PORT must be a whole number, got {raw!r}") from err
    if not (1 <= port <= 65535):
        raise ConfigError(f"PORT out of range: {port}")
    return port

for value in ["8080", "eighty", 70000]:
    try:
        print("port:", read_port(value))
    except ConfigError as err:
        cause = type(err.__cause__).__name__ if err.__cause__ else None
        print("config problem:", err, "| cause:", cause)`,
      },
    ],
  },
  {
    module: 'project-tooling',
    slug: 'venv-and-packages',
    kind: 'reading',
    durationMinutes: 22,
    title: 'Make "It Works on My Machine" Impossible',
    technicalTitle: 'Virtual environments, dependencies and reproducible installs',
    level: 'intermediate',
    objectives: [
      'Create and use a virtual environment for every project',
      'Pin dependencies so installs are repeatable',
      'Explain why a global install eventually breaks something',
      'Know what to commit and what to ignore',
    ],
    body: String.raw`## The situation

You add a library. It updates a package three other tools already use. Six weeks later a different project quietly imports a different major version and stops working. Nothing in the code changed. The environment did. A virtual environment makes that impossible: each project gets its own set of packages.

## What you can do afterwards

- Create, activate and rebuild a virtual environment from scratch.
- Produce a lockfile someone else can install exactly.
- Explain the difference between a top-level dependency and a transitive one.
- Write a ` + '`.gitignore`' + String.raw` that keeps a repository clean.

## The idea, in plain words

An environment is a directory holding an interpreter plus its packages. Activating one changes which ` + '`python`' + String.raw` and ` + '`pip`' + String.raw` you are talking to. That is the whole mechanism — no magic.

A dependency list says what you asked for. A lockfile says exactly what you got, including everything those packages depend on. Deployment uses the lockfile; a human reads the dependency list.

## The terms, precisely

- **Virtual environment** — an isolated interpreter and package directory.
- **Dependency** — a package your project imports. **Transitive dependency** — a package one of those needs.
- **Lockfile** — an exact, resolved set of versions with hashes.
- **Wheel** — a prebuilt installable package; **sdist** — a source archive that must be built.

## Walk through it

` + '```bash\n# Create once per project\npython -m venv .venv\n\n# Activate (Windows)\n.venv\\Scripts\\activate\n# Activate (macOS / Linux)\nsource .venv/bin/activate\n\n# Install and freeze\npython -m pip install --upgrade pip\npython -m pip install requests\npython -m pip freeze > requirements.txt\n\n# Rebuild the same set elsewhere\npython -m pip install -r requirements.txt\n```' + String.raw`

Expected result: ` + '`python -c "import requests; print(requests.__version__)"`' + String.raw` prints the same version on your machine and on the server. If it does not, the lockfile is not the one you deployed.

` + '`.gitignore`' + String.raw` should contain at least:

` + '```\n.venv/\n__pycache__/\n*.pyc\n.env\n```' + String.raw`

## Where this shows up

- **CI** — a pipeline that installs from a lockfile is reproducible; one that installs latest is a dice roll.
- **Containers** — a Dockerfile is a virtual environment with stronger walls.
- **Collaboration** — the first hour of onboarding is spent here.

## Mistakes worth avoiding

- **Installing with ` + '`sudo pip`' + String.raw` or a global ` + '`pip install`' + String.raw`.** You eventually break the system's own tools.
- **Committing ` + '`.venv/`' + String.raw`.** It is large, platform-specific and never reproducible.
- **Committing ` + '`.env`' + String.raw` with secrets.** Ship ` + '`.env.example`' + String.raw` with empty values.
- **Editing ` + '`requirements.txt`' + String.raw` by hand to loosen a version.** Change it deliberately and rebuild.
- **Forgetting that a fresh shell needs activating.** If ` + '`import requests`' + String.raw` fails, check which ` + '`python`' + String.raw` is running: ` + '`which python`' + String.raw`.

## Practise now

1. Create a virtual environment in a scratch folder, install one package, and print its version and file location.
2. Freeze, delete the environment, rebuild it from the lockfile, and confirm the same version.
3. Print ` + '`sys.executable`' + String.raw` inside and outside the environment. Those two paths explain every "wrong interpreter" bug you will hit.

## Check yourself

1. What does activating a virtual environment actually change?
2. Why commit ` + '`requirements.txt`' + String.raw` but not ` + '`.venv/`' + String.raw`?
3. What is a transitive dependency?

**Answers:** (1) Which interpreter and package directory your shell resolves to. (2) The lockfile describes the set; the directory is a platform-specific copy of it. (3) A package required by a package you asked for.

## Challenge

Take a small script of yours that uses at least two third-party packages. Put it in a fresh repository with a virtual environment, a lockfile, a ` + '`.gitignore`' + String.raw`, and a README section that says exactly two commands to get it running on a clean machine. Then test those two commands in a new folder.

## In one paragraph

One project, one environment. Ask for dependencies, commit the lockfile, ignore the environment directory, and rebuild from scratch whenever you are unsure. If a fresh copy of the repo does not run from two commands, the project is not finished.

## Go further

- The official ` + '`venv`' + String.raw` documentation.
- The ` + '`pip`' + String.raw` documentation on requirements files.
- ` + '`uv`' + String.raw` or ` + '`poetry`' + String.raw` once you are comfortable — they automate locking.`,
    code: [
      {
        language: 'bash',
        caption: 'The three commands worth memorising',
        source: `python -m venv .venv
source .venv/bin/activate     # Windows: .venv\\Scripts\\activate
python -m pip install -r requirements.txt
python -c "import sys; print(sys.executable)"`,
      },
    ],
  },
  {
    module: 'project-tooling',
    slug: 'testing-and-project',
    kind: 'project',
    durationMinutes: 45,
    title: 'Ship Something Someone Else Could Maintain',
    technicalTitle: 'Testing, project structure and the capstone build',
    level: 'intermediate',
    objectives: [
      'Write tests that describe behaviour rather than implementation',
      'Structure a small project so modules have one reason to change',
      'Use a failing test to drive a fix',
      'Deliver a capstone with a README, tests and a working entry point',
    ],
    body: String.raw`## The situation

The feature works on your machine and you are asked to change one rule next month. Without tests, you will re-read every file to remember what "works" meant. Tests are the memory of a codebase. This capstone is small on purpose: the point is the process, not the size.

## What you can do afterwards

- Write a test that fails for a real reason, then fix it.
- Lay out a project so the entry point, the logic and the tests are separate files.
- Write a README that lets a stranger run it in two commands.
- Say honestly what is tested and what is not.

## The idea, in plain words

A test is code that calls your code and checks the result. Three habits make them useful:

1. **One behaviour per test**, named after the behaviour: ` + '`test_discount_is_zero_for_refunded_order`' + String.raw`.
2. **Test the contract, not the internals.** Call the public function; do not assert on private helpers.
3. **Copy the bug report into a failing test first.** Then a fix is proven, not hoped for.

Structure: an entry point that parses input, a module that holds rules, and a test file per module. Anything that reads the clock, the network or the filesystem should be a parameter so tests can substitute it.

## The terms, precisely

- **Unit test** — exercises one function without external systems.
- **Regression test** — a test written from a real bug, kept forever.
- **Fixture** — shared setup a test needs. **Assertion** — the check that fails the test.
- **Coverage** — how much code the tests execute; a lower bound on confidence, never a goal by itself.

## Walk through it

` + '```python\n# orders.py\ndef discount_percent(order, *, is_member=False):\n    if order.get("refunded"):\n        return 0\n    if order.get("status") != "paid":\n        return 0\n    return 12 if is_member else 0\n\n# test_orders.py\nimport unittest\nfrom orders import discount_percent\n\nclass DiscountTests(unittest.TestCase):\n    def test_refunded_order_gets_no_discount(self):\n        self.assertEqual(discount_percent({"status": "paid", "refunded": True}, is_member=True), 0)\n\n    def test_member_gets_twelve_percent(self):\n        self.assertEqual(discount_percent({"status": "paid"}, is_member=True), 12)\n\nif __name__ == "__main__":\n    unittest.main()\n```' + String.raw`

Expected output:

` + '```\n..\n----------------------------------------------------------------------\nRan 2 tests in 0.000s\n\nOK\n```' + String.raw`

Now imagine the rule changes to "members get 10%". One number changes in the code and exactly one test fails — that failure is the specification telling you what changed.

## Where this shows up

- **Every professional codebase** — tests are the difference between a change and a gamble.
- **Refactoring** — you cannot safely rename anything without them.
- **Onboarding** — tests are executable documentation.

## Mistakes worth avoiding

- **Testing three behaviours in one test.** When it fails you learn nothing.
- **Asserting on log output or private attributes.** The test then breaks on every refactor.
- **Skipping the failing test "just this once".** That is how bugs return.
- **Chasing 100% coverage with meaningless assertions.** Depth beats breadth.
- **A README that says "run the app".** Say the exact command and what output means success.

## Practise now (capstone)

Build **"Spend Tracker"**, a command-line program:

1. Reads a CSV of ` + '`date,customer,amount_paise`' + String.raw`.
2. Prints total spend per customer for a month given as an argument, largest first.
3. Rejects rows with a non-integer amount, counting them, without crashing.
4. Has at least six unit tests including two regression tests.
5. Has a README with the exact command and a sample output.

Deliverables: ` + '`spend_tracker/`' + String.raw` package, ` + '`tests/`' + String.raw`, ` + '`README.md`' + String.raw`, ` + '`requirements.txt`' + String.raw`.

## Check yourself

1. Why write a failing test before a fix?
2. What makes a good test name?
3. What should a README contain at minimum?

**Answers:** (1) It proves the bug existed and that the fix addresses it. (2) The behaviour it guarantees, readable as a sentence. (3) What it does, how to install, the exact command to run, and sample output.

## Challenge

Take the capstone one step further: add a ` + '`--json`' + String.raw` flag that prints the same summary as JSON, and one test that would fail if the two formats ever disagreed about the totals. That single test is worth more than ten trivial ones.

## In one paragraph

Tests are how a project remembers what "working" means. Name them after behaviour, keep them small, and add one for every bug you fix. Structure the project so the rules live apart from the entry point, then write the README you wish you had been given.

## Go further

- The ` + '`unittest`' + String.raw` documentation, and ` + '`pytest`' + String.raw` once you want fixtures and parametrisation.
- The Google Testing Blog's "test behaviour, not implementation".
- Any well-known small Python project's test folder — reading real tests teaches more than reading about them.`,
    code: [
      {
        language: 'python',
        caption: 'A test that fails for a real reason',
        source: `def discount_percent(order, *, is_member=False):
    if order.get("refunded"):
        return 0
    if order.get("status") != "paid":
        return 0
    return 12 if is_member else 0

# assert is enough for a quick check; unittest/pytest give structure and reporting.
assert discount_percent({"status": "paid", "refunded": True}, is_member=True) == 0
assert discount_percent({"status": "paid"}, is_member=True) == 12
assert discount_percent({"status": "pending"}, is_member=True) == 0
print("all checks passed")`,
      },
    ],
  },
];
