/**
 * Python Programming — next-generation lessons (part 2).
 *
 * Same shape as part 1. Each lesson keeps its existing slug so progress, notes,
 * bookmarks and enrolments survive the upgrade.
 */

export const pythonLessons2 = [
  /* ─────────────────── Module: foundations (continued) ─────────────────── */
  {
    module: 'foundations',
    slug: 'types-and-operators',
    kind: 'reading',
    durationMinutes: 26,
    title: 'Why 0.1 + 0.2 Refuses to Be 0.3',
    technicalTitle: 'Values, numeric types, operators and truthiness',
    level: 'beginner',
    objectives: [
      'Pick the right built-in type for a value and say why',
      'Predict when arithmetic on floats will surprise you',
      'Use truthiness deliberately instead of by accident',
      'Explain why a list can be a dictionary key only sometimes',
    ],
    body: String.raw`## The situation

A checkout total is off by a fraction of a paisa. Nobody wrote a wrong formula. A support ticket says "discount is not applied"; the code says ` + '`price * 0.9`' + String.raw`. The cause is older than your project: most decimal fractions cannot be stored exactly in binary, so money and measurements behave differently from counts, and Python is honest about it.

## What you can do afterwards

- Choose ` + '`int`' + String.raw`, ` + '`float`' + String.raw`, ` + '`Decimal`' + String.raw` or ` + '`Fraction`' + String.raw` on purpose.
- Read ` + '`0.30000000000000004`' + String.raw` as information, not as a bug to panic about.
- Write an ` + '`if`' + String.raw` that cannot be fooled by ` + '`0`' + String.raw` or an empty string.
- Know which values can be dictionary keys.

## The idea, in plain words

Every value has a **type**, and the type decides what operations mean and how the number is stored.

- ` + '`int`' + String.raw` is exact and unbounded. Counting things, ids, loop indices: always ` + '`int`' + String.raw`.
- ` + '`float`' + String.raw` is a binary fraction with about 15–17 significant digits. It is excellent for science and terrible for money.
- ` + '`Decimal`' + String.raw` is exact decimal arithmetic — slower, and what invoices need.
- ` + '`bool`' + String.raw` is just ` + '`True`' + String.raw`/` + '`False`' + String.raw`, and every value can be tested for truth.

Truthiness is Python letting you write ` + '`if items:`' + String.raw` instead of ` + '`if len(items) > 0:`' + String.raw`. Empty containers, ` + '`0`' + String.raw`, ` + '`""`' + String.raw` and ` + '`None`' + String.raw` are falsy; nearly everything else is truthy. The trap is that ` + '`if value:`' + String.raw` silently treats a real ` + '`0`' + String.raw` as "missing".

## The terms, precisely

- **Type** — the kind of a value; it fixes which operations are legal.
- **Operator** — a symbol that combines values: ` + '`+`' + String.raw`, ` + '`//`' + String.raw`, ` + '`%`' + String.raw`, ` + '`**`' + String.raw`, ` + '`in`' + String.raw`, ` + '`is`' + String.raw`.
- **Literal** — a value written directly in source, such as ` + '`42`' + String.raw` or ` + '`"text"`' + String.raw`.
- **Immutable** — cannot be changed in place; ` + '`str`' + String.raw`, ` + '`tuple`' + String.raw` and numbers are immutable.
- **Hashable** — usable as a dictionary key; immutable types usually are.
- **Truthiness** — the rule that decides whether a value counts as true in a condition.

## Walk through it

` + '```python\nfrom decimal import Decimal\n\nprint(0.1 + 0.2)                 # 0.30000000000000004\nprint(0.1 + 0.2 == 0.3)         # False\nprint(f"{0.1 + 0.2:.17f}")      # 0.30000000000000004\n\nprint(Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))   # True\n\nprint(7 // 2, 7 % 2, 2 ** 10)   # 3 1 1024\nprint("ab" * 3)                 # ababab\n\n# Truthiness versus "is it missing?"\ndef withdraw(balance, amount=None):\n    if amount is None:          # correct: None means "not supplied"\n        return balance\n    return balance - amount\n\nprint(withdraw(100, 0))          # 100 — a 0 withdrawal is a real request\n```' + String.raw`

Expected output:

` + '```\n0.30000000000000004\nFalse\n0.30000000000000004\nTrue\n3 1 1024\nababab\n100\n```' + String.raw`

The last line is the lesson in one value. ` + '`if amount:`' + String.raw` would have skipped a real request of ` + '`0`' + String.raw`. ` + '`if amount is None:`' + String.raw` asks the question you actually meant.

## Where this shows up

- **Payments and invoices** — every serious money system stores minor units as ` + '`int`' + String.raw` (paise, cents) or uses ` + '`Decimal`' + String.raw`.
- **Analytics** — averages are ` + '`float`' + String.raw` by nature; never compare them with ` + '`==`' + String.raw`.
- **APIs** — JSON has no integer/float distinction; a value that round-trips through JSON as ` + '`1.0`' + String.raw` may arrive as ` + '`1`' + String.raw`.

## Mistakes worth avoiding

- **` + '`price == 0.3`' + String.raw` after arithmetic.** Use ` + '`abs(a - b) < 1e-9`' + String.raw` or ` + '`Decimal`' + String.raw`.
- **` + '`if value:`' + String.raw` for a number or a flag that can legitimately be zero/empty.** Use ` + '`is None`' + String.raw`.
- **` + '`float`' + String.raw` for money.** Round at the wrong moment and cents vanish.
- **Using ` + '`is`' + String.raw` for equality.** ` + '`is`' + String.raw` compares identity; use ` + '`==`' + String.raw` for values.
- **` + '`isinstance(True, int)`' + String.raw` surprise.** It is ` + '`True`' + String.raw`: ` + '`bool`' + String.raw` is a subclass of ` + '`int`' + String.raw`.

## Practise now

1. Compute a 12.5% tax on ` + '`19.99`' + String.raw` three ways: with ` + '`float`' + String.raw`, with ` + '`Decimal`' + String.raw`, and in integer paise. Round each to 2 decimals and compare.
2. Write ` + '`def set_limit(limit=None)`' + String.raw` that accepts ` + '`0`' + String.raw` as a real limit and only treats ` + '`None`' + String.raw` as "no limit".
3. Predict, before running: ` + '`bool([])`' + String.raw`, ` + '`bool([0])`' + String.raw`, ` + '`bool("0")`' + String.raw`, ` + '`bool(0.0)`' + String.raw`.

## Check yourself

1. Why is ` + '`0.1 + 0.2 == 0.3`' + String.raw` false?
2. When must you use ` + '`is None`' + String.raw` instead of ` + '`if value:`' + String.raw`?
3. Can a ` + '`list`' + String.raw` be a dictionary key? A ` + '`tuple`' + String.raw`?

**Answers:** (1) Neither 0.1 nor 0.2 is exactly representable in binary, so their sum is 0.30000000000000004. (2) When ` + '`0`' + String.raw`, ` + '`""`' + String.raw` or an empty container is a valid value. (3) No, lists are mutable and unhashable; a tuple of hashable items yes.

## Challenge

Build a tiny invoice calculator that takes a list of (item, quantity, unit price in paise) and prints a total with 18% tax, in rupees and paise, using integer arithmetic only. Then write one sentence explaining what would have gone wrong with floats. This is the exercise most interviewers mean by "do you understand money".

## In one paragraph

Types decide behaviour. Integers are exact, floats are binary approximations, and ` + '`Decimal`' + String.raw` exists for money. Truthiness is convenient until ` + '`0`' + String.raw` or ` + '`""`' + String.raw` is a legitimate value — then ask ` + '`is None`' + String.raw` explicitly.

## Go further

- The official tutorial's chapter on numbers, which covers the float model.
- The documentation for ` + '`decimal`' + String.raw` and ` + '`fractions`' + String.raw`.
- Any article on IEEE 754 for why the last digits wobble — you only need the first paragraph.`,
    code: [
      {
        language: 'python',
        caption: 'Floats lie, integers and Decimal do not',
        source: `from decimal import Decimal

print("float:", 0.1 + 0.2, "==", 0.1 + 0.2 == 0.3)
print("decimal:", Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))

paise = 1999
tax = round(paise * 12.5 / 100)
print("tax in paise:", tax, "total:", paise + tax)

def set_limit(limit=None):
    if limit is None:
        return "no limit"
    return f"limit {limit}"

print(set_limit(0), "|", set_limit())`,
      },
    ],
  },
  {
    module: 'foundations',
    slug: 'control-flow',
    kind: 'reading',
    durationMinutes: 24,
    title: 'Make the Program Decide, Not You',
    technicalTitle: 'Conditionals, loops, and readable branching',
    level: 'beginner',
    objectives: [
      'Write branches that read like the rule they implement',
      'Choose between for, while and an early return',
      'Avoid duplicated conditions and deep nesting',
      'Know when a loop should be a comprehension instead',
    ],
    body: String.raw`## The situation

A pricing rule starts as "discount if the customer is a member". Six months later it is "member, or bought twice, or it is Tuesday, but not if refunded". Every requirement is added as another ` + '`if`' + String.raw` inside the previous one. The code still works, and nobody can change it safely. Control flow is where software rots first.

## What you can do afterwards

- Turn a pile of nested ` + '`if`' + String.raw`s into named rules that read top-to-bottom.
- Pick ` + '`for`' + String.raw` when you know how many times, ` + '`while`' + String.raw` when you do not, and an early ` + '`return`' + String.raw` when the check is a guard.
- Write a loop that cannot silently skip its last element.

## The idea, in plain words

A branch is a question with two answers. A loop is a question asked repeatedly. Both are only readable when each condition answers **one** question and the structure shows which outcomes are normal.

The two habits that fix most messy code:

1. **Guard early.** Check the boring failure first and ` + '`return`' + String.raw`. Everything after is the happy path, unindented.
2. **Name complex conditions.** ` + '`if is_refunded(order): continue`' + String.raw` says more than ` + '`if not order.get("refunded_at") and order.get("status") == "paid":`' + String.raw`.

For loops: ` + '`for`' + String.raw` iterates over a sequence; ` + '`range`' + String.raw` generates numbers lazily; ` + '`enumerate`' + String.raw` gives index and value together; ` + '`break`' + String.raw` leaves the loop, ` + '`continue`' + String.raw` skips to the next item. ` + '`while`' + String.raw` is for "until a condition changes" — with a visible reason to stop.

## The terms, precisely

- **Condition** — an expression evaluated for truthiness.
- **Guard clause** — an early exit that removes a special case from the main path.
- **Iterator** — an object that yields items one at a time; ` + '`for`' + String.raw` consumes one.
- **Comprehension** — a one-expression loop that builds a list/set/dict.
- **Off-by-one** — a loop whose range stops one item early or late.

## Walk through it

` + '```python\ndef discount_percent(order, is_member, purchases, today_is_tuesday):\n    # Guards first: each one is a single, named reason to stop.\n    if order.get("refunded"):\n        return 0\n    if order.get("status") != "paid":\n        return 0\n\n    percent = 0\n    if is_member:\n        percent += 5\n    if purchases >= 2:\n        percent += 3\n    if today_is_tuesday:\n        percent += 2\n    return percent\n\nprint(discount_percent({"status": "paid"}, True, 3, False))       # 8\nprint(discount_percent({"status": "paid", "refunded": True}, True, 3, True))  # 0\n\n# Loop with a reason to continue, not a nested pyramid\nprices = [120, 0, 80, -5]\nvalid = [p for p in prices if p > 0]\nprint(valid, sum(valid) / len(valid))    # [120, 80] 100.0\n\nfor i, price in enumerate(prices):\n    if price <= 0:\n        print(f"skip item {i}: {price}")\n```' + String.raw`

Expected output:

` + '```\n8\n0\n[120, 80] 100.0\nskip item 1: 0\nskip item 3: -5\n```' + String.raw`

Notice what the function does *not* do: it never asks one compound question with four clauses, and each rule adds a number instead of another level of indentation. Adding a sixth rule is one more ` + '`if`' + String.raw`.

## Where this shows up

- **Pricing and permissions** — anything that accumulates rules.
- **Data cleaning** — you almost always need "skip the rows that are not valid, then process the rest".
- **Retry logic** — ` + '`while`' + String.raw` with an attempt counter and a maximum is the standard shape.

## Mistakes worth avoiding

- **Mutating a list while looping over it.** Iterate over a copy (` + '`for x in list(items)`' + String.raw`) or build a new list.
- **` + '`for i in range(len(items))`' + String.raw` to read each item.** Use ` + '`for item in items`' + String.raw`; use ` + '`enumerate`' + String.raw` when you need the index.
- **Forgetting that ` + '`range(5)`' + String.raw` stops at 4.** Most off-by-one bugs live here.
- **Using ` + '`while True`' + String.raw` without a guaranteed ` + '`break`' + String.raw`.** Say out loud what stops it.
- **` + '`if x == True:`' + String.raw`.** Write ` + '`if x:`' + String.raw` unless ` + '`x`' + String.raw` may be ` + '`None`' + String.raw` and that matters.

## Practise now

1. Rewrite a function with four nested ` + '`if`' + String.raw`s of your own using guards and named variables.
2. Write a loop that prints the first 5 prime numbers using ` + '`while`' + String.raw`, and then again with a ` + '`for`' + String.raw` over ` + '`itertools.count()`' + String.raw`. Compare which reads better.
3. Build a list of the squares of the even numbers from 1 to 30, first with a loop, then as a comprehension. Time both if you like — the point is readability.

## Check yourself

1. When is a guard clause better than nesting?
2. What is the difference between ` + '`break`' + String.raw` and ` + '`continue`' + String.raw`?
3. Why is ` + '`for i in range(len(xs))`' + String.raw` usually a smell?

**Answers:** (1) When a condition removes a special case entirely — the remaining code then has one path. (2) ` + '`break`' + String.raw` leaves the loop; ` + '`continue`' + String.raw` skips the rest of this iteration. (3) It needs an index to reach a value you could already have; ` + '`enumerate`' + String.raw` gives both when you truly need the index.

## Challenge

Take your own project (or the discount function above) and add two new rules: "no discount during a sale" and "maximum 12%". Implement them by extending the guards and one extra variable — without adding any indentation. If you needed to indent, the structure was wrong, so change the structure.

## In one paragraph

Branch on one question at a time, exit early for special cases, and keep the happy path flat. Use ` + '`for`' + String.raw` over a sequence and ` + '`while`' + String.raw` only when the stopping condition is the point. Every loop should have a reason to stop that a reader can find in five seconds.

## Go further

- The Python tutorial's sections on ` + '`if`' + String.raw` statements and ` + '`for`' + String.raw` statements.
- The ` + '`itertools`' + String.raw` documentation — ` + '`chain`' + String.raw`, ` + '`islice`' + String.raw` and ` + '`takewhile`' + String.raw` replace a surprising number of loops.
- Any refactoring article on "guard clauses" — the idea is language-independent.`,
    code: [
      {
        language: 'python',
        caption: 'Rules that grow without nesting',
        source: `def discount_percent(order, is_member, purchases, today_is_tuesday):
    if order.get("refunded"):
        return 0
    if order.get("status") != "paid":
        return 0

    percent = 0
    if is_member:
        percent += 5
    if purchases >= 2:
        percent += 3
    if today_is_tuesday:
        percent += 2
    return min(percent, 12)

print(discount_percent({"status": "paid"}, True, 3, True))

prices = [120, 0, 80, -5]
valid = [p for p in prices if p > 0]
print(valid, sum(valid) / len(valid))`,
      },
    ],
  },
];
