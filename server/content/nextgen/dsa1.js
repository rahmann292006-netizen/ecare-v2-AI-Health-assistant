import { lessonBody, code, bullets, numbered } from './sections.js';

/**
 * Data Structures & Algorithms — next-generation lessons, part 1 (complexity,
 * linear structures). Python is used for runnable code; every claim about cost is
 * paired with a measurement you can reproduce in the Lab.
 */

export const dsaLessons1 = [
  {
    course: 'data-structures-algorithms',
    module: 'complexity',
    slug: 'big-o',
    kind: 'reading',
    durationMinutes: 26,
    title: 'Your Program Is Slow at 10,000 Rows. Here Is Why.',
    technicalTitle: 'Big-O notation, growth rates and measuring real cost',
    level: 'beginner',
    objectives: [
      'Read a loop and predict how its cost grows',
      'Tell O(1), O(log n), O(n) and O(n²) apart by reading code',
      'Measure real timings instead of trusting intuition',
      'Say why a fast language with the wrong algorithm still loses',
    ],
    body: lessonBody({
      scenario: `A search box on an internal tool feels instant with 200 records. At 40,000 it freezes for two seconds per keystroke. Nobody changed the code — the *shape* of the code stayed the same while the input grew. That shape is what Big-O names.`,
      outcomes: [
        'Predict whether doubling the input doubles the time, squares it, or barely changes it.',
        'Recognise the three patterns that cause almost all slowness: nested loops, repeated scans inside loops, and sorting on every call.',
        'Measure a function properly, with a test you can rerun.',
        'Explain to a teammate why "the server is slow" is not a diagnosis.',
      ],
      idea: `Big-O describes how work grows as input grows; it deliberately ignores constant factors and hardware. Two functions in the same class can differ by 5× and still be "O(n)" — the class tells you what happens when data doubles.

The classes worth memorising:

- **O(1)** — a dictionary lookup, indexing a list, arithmetic. Same cost at any size.
- **O(log n)** — a binary search: each step removes half the remaining work. 1,000,000 items take about 20 steps.
- **O(n)** — one pass over the data: a sum, a filter, a single loop.
- **O(n log n)** — a good sort. This is the practical floor for comparison sorting.
- **O(n²)** — a loop inside a loop over the same data. Doubling input quadruples time.

The two habits that matter: find the loop that contains the data, and count what happens *inside* it. A loop over n with a list membership test inside is O(n²) even though it looks like one loop.`,
      terms: bullets([
        '**Time complexity** — how the number of operations grows with input size.',
        '**Space complexity** — the same question for memory.',
        '**Worst case** — the guarantee: no input is slower than this.',
        '**Amortised** — averaged over many operations; dict insertion is amortised O(1).',
        '**Constant factor** — the overhead Big-O hides (function calls, allocations).',
      ]),
      walkthrough: `${code('python', `from time import perf_counter

def has_duplicates_pairwise(items):
    # Loop inside a loop: n * n comparisons.
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j]:
                return True
    return False

def has_duplicates_set(items):
    # One pass, dict/set lookup is amortised O(1).
    seen = set()
    for item in items:
        if item in seen:
            return True
        seen.add(item)
    return False

for n in (500, 1000, 2000):
    data = list(range(n))          # no duplicates: the worst case for both
    t = perf_counter(); has_duplicates_pairwise(data); slow = perf_counter() - t
    t = perf_counter(); has_duplicates_set(data); fast = perf_counter() - t
    print(f"n={n:>5}  nested {slow*1000:8.2f} ms   set {fast*1000:6.2f} ms")`)}

${code('text', `n=  500  nested    12.41 ms   set   0.04 ms
n= 1000  nested    49.02 ms   set   0.07 ms
n= 2000  nested   198.55 ms   set   0.14 ms` )}

Read the nested row: each doubling of n multiplies the time by about 4. That is O(n²) in the wild. The set version doubles with n — O(n) — and is roughly a thousand times faster at n=2000, a gap that grows without limit.

A third pattern is worth naming: **O(log n)**. Binary search halves the range each step, so it is almost flat. Never replace it with a loop "for clarity".`,
      applications: bullets([
        '**API pagination** — an endpoint that loads every row, then slices, is O(n) per request. Fix the query, not the server.',
        '**Database indexes** — an index turns a full scan (O(n)) into a lookup (O(log n)). This is Big-O with a bill attached.',
        '**Frontend lists** — filtering 50,000 items inside a render is O(n) per keystroke; that is why debouncing exists.',
        '**Interview screening** — complexity is the shared vocabulary for "will this survive real data?".',
      ]),
      mistakes: bullets([
        '**Assuming a faster language fixes it.** O(n²) in C still loses to O(n) in Python at a large enough n.',
        '**Calling a list membership test cheap.** a list test is O(n) while a set or dict test is O(1) on average.',
        `**Forgetting hidden loops.** ${code('text', 'list.index() · pop(0) · string += in a loop · any() over a large list')} all loop over the data.`,
        '**Measuring in the wrong place.** Time the function, not the whole script, and run it more than once — the first call pays import costs.',
        '**Quoting Big-O as if it were a benchmark.** It predicts growth, not milliseconds.',
      ]),
      practice: numbered([
        'Run the snippet above and fill in a table of timings for n = 500, 1000, 2000. Then predict n = 4000 before running it.',
        'Rewrite `has_duplicates_pairwise` using sorting and state the new complexity and one reason it might still lose to the set version.',
        'Take any loop in your own code and answer: what is n here, and what happens inside one iteration?',
      ]),
      check: `${numbered([
        'What is the complexity of a single loop that contains `x in my_list`?',
        'Why does binary search need sorted input?',
        'Doubling the input makes a function four times slower. Which class is it likely in?',
      ])}

**Answers:** (1) O(n²) — the membership test is itself O(n). (2) It decides whether to go left or right by comparison, which only works if the order is known. (3) O(n²).`,
      challenge: `Build a small benchmark script that compares three duplicate detectors: nested loops, sorting, and a set. Run each at n = 100, 400, 1600 and print a table with a column for "time ratio vs previous row". A correct O(n²) implementation will show ~16× per row; the set version ~4×. Paste the table into your notes — that is your first complexity measurement you did yourself.`,
      summary: `Big-O tells you what happens when data grows. Count the loops and what is inside them: one loop is O(n), a loop inside a loop is O(n²), halving is O(log n), and a dict or set lookup is O(1). Measure once you have a hypothesis, and fix the shape before optimising the constant.`,
      further: [
        'The `timeit` documentation — the standard way to time small Python snippets.',
        'Any sorting-visualiser site for an intuition of O(n log n) versus O(n²).',
        'Your own Lab: every snippet here runs in it, so run before you believe.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Same question, two complexities',
        source: `from time import perf_counter

def nested(items):
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j]:
                return True
    return False

def via_set(items):
    seen = set()
    for item in items:
        if item in seen:
            return True
        seen.add(item)
    return False

for n in (500, 1000, 2000):
    data = list(range(n))
    t = perf_counter(); nested(data); a = perf_counter() - t
    t = perf_counter(); via_set(data); b = perf_counter() - t
    print(f"n={n:>5}  nested {a*1000:8.2f} ms   set {b*1000:6.2f} ms")`,
      },
    ],
  },
  {
    course: 'data-structures-algorithms',
    module: 'complexity',
    slug: 'arrays-strings',
    kind: 'code',
    durationMinutes: 28,
    title: 'The Two-Pointer Trick That Kills Nested Loops',
    technicalTitle: 'Arrays, strings and the two-pointer pattern',
    level: 'beginner',
    objectives: [
      'Solve a pair-sum problem in O(n) instead of O(n²)',
      'Apply two pointers to sorted and to unsorted input correctly',
      'Use a hash set to trade memory for time',
      'Recognise the pattern in real problems, not just exercises',
    ],
    body: lessonBody({
      scenario: `A fraud check asks "do any two transactions in today's batch add up to exactly ₹50,000?". The first version compared every pair: 200,000 transactions meant 20 billion comparisons and a job that never finished. The fixed version runs in a fraction of a second.`,
      outcomes: [
        'Explain when sorting first turns a hard problem into an easy one.',
        'Write the two-pointer scan and know exactly why it is correct.',
        'Choose between two pointers and a hash set.',
        'State the time and space cost of the version you shipped.',
      ],
      idea: `Two pointers means walking two indices towards each other, or together, so that each element is visited a constant number of times.

For a **sorted** array and a target sum: put one pointer at each end. If the sum is too small, the only way to grow it is to move the left pointer right. If it is too large, move the right pointer left. Each step eliminates one element for good, so the scan is O(n) after an O(n log n) sort.

For an **unsorted** array, sorting changes the indices, which matters if you must report positions. Then use a set instead: walk once, and for each value ask "have I already seen ` + '`target - value`' + `?". That is O(n) time and O(n) extra memory.

Choosing between them is the real skill: sorting costs time and keeps memory small; a set costs memory and keeps the original order.`,
      terms: bullets([
        '**Array / list** — contiguous, indexable, O(1) access, O(n) insert in the middle.',
        '**Two pointers** — two indices moving under a rule that provably skips no answer.',
        '**Invariant** — the property that stays true each iteration; here, "the answer cannot be outside the current window".',
        '**In-place** — modified without building a second structure.',
      ]),
      walkthrough: `${code('python', `def pair_sum_sorted(numbers, target):
    lo, hi = 0, len(numbers) - 1
    while lo < hi:
        total = numbers[lo] + numbers[hi]
        if total == target:
            return numbers[lo], numbers[hi]
        if total < target:
            lo += 1          # the only way to make the sum bigger
        else:
            hi -= 1          # the only way to make it smaller
    return None

def pair_sum_positions(values, target):
    # Unsorted input: keep positions, so use a set of what we have seen.
    seen = {}
    for i, v in enumerate(values):
        if target - v in seen:
            return (seen[target - v], i)
        seen[v] = i
    return None

print(pair_sum_sorted([1, 3, 4, 7, 11], 10))        # (3, 7)
print(pair_sum_positions([3, 9, 1, 7], 10))          # (0, 3)

# Reverse a string in place with two pointers: O(n) time, O(1) extra space.
def reverse_in_place(chars):
    i, j = 0, len(chars) - 1
    while i < j:
        chars[i], chars[j] = chars[j], chars[i]
        i += 1
        j -= 1
    return chars

print("".join(reverse_in_place(list("lumen"))))`)}

${code('text', `(3, 7)
(0, 3)
nemul` )}

Note the correctness argument for the sorted scan: when the sum is too small, every pair using the current smallest element is also too small, so the left pointer can be discarded. That one sentence is the whole proof, and it is what an interviewer wants to hear.`,
      applications: bullets([
        '**Suspicious-transaction detection** — matching amounts against a threshold in linear time.',
        '**Text editors** — two pointers are how a line is reverse-scanned for a word boundary.',
        '**Merging sorted logs** — two pointers merge two event streams without loading both fully.',
        '**Deduplicating a sorted feed** — adjacent-pointer dedupe is the cheapest possible filter.',
      ]),
      mistakes: bullets([
        '**Using two pointers on unsorted data** without sorting first — the elimination argument breaks and you silently miss pairs.',
        '**Sorting when the caller needs original indices** and then returning the wrong positions.',
        '**Writing a pair-sum loop as while lo <= hi** — the same element can then be paired with itself.',
        '**Building strings with += in a loop.** Repeated concatenation is O(n^2); collect the parts and join once.',
        '**Forgetting the memory cost of the set.** On 10 million rows a set is tens of megabytes; sometimes sorting in place is right.',
      ]),
      practice: numbered([
        'Run the sorted pair-sum function on [1, 2, 3, 9] with target 8 and explain the final pointer positions.',
        'Write `pair_sum_positions` without a dict — using a sorted list of (value, index) pairs. State its complexity.',
        'Take a string and remove all duplicate characters while keeping first occurrence order, in O(n).',
      ]),
      check: `${numbered([
        'Why is `pair_sum_sorted` O(n) rather than O(n²) despite the sort?',
        'When do you prefer a set over sorting?',
        'What invariant justifies moving `lo` when the sum is too small?',
      ])}

**Answers:** (1) The scan itself is linear; the sort is O(n log n), so the total is O(n log n) and the scan is not nested. (2) When you must preserve original positions or need linear time without a sort cost. (3) Every pair that could reach the target with the current smallest element is already too small.`,
      challenge: `Implement the fraud check properly: given a list of integer paise amounts and a target, return **all** distinct pairs that sum to the target, each pair once, in O(n²) worst case but O(n) when all pairs are unique. Use a dict from value to count. Then add the report: "found N suspicious pairs for ₹50,000". This is the exact shape of the tool that started the lesson.`,
      summary: `Nested loops over the same data are usually avoidable. Sort and scan from both ends when order does not matter; use a seen-set when it does. Either way you replace n² comparisons with n steps and a clear correctness argument.`,
      further: [
        'Python’s `str.join` documentation — the answer to string building in loops.',
        'Any two-sum walkthrough, but write the proof yourself before reading one.',
        'The Lab: paste the snippet and change the target to see the pointer behaviour.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Two pointers and a seen-set, side by side',
        source: `def pair_sum_sorted(numbers, target):
    lo, hi = 0, len(numbers) - 1
    while lo < hi:
        total = numbers[lo] + numbers[hi]
        if total == target:
            return numbers[lo], numbers[hi]
        if total < target:
            lo += 1
        else:
            hi -= 1
    return None

def pair_sum_positions(values, target):
    seen = {}
    for i, v in enumerate(values):
        if target - v in seen:
            return (seen[target - v], i)
        seen[v] = i
    return None

print(pair_sum_sorted([1, 3, 4, 7, 11], 10))
print(pair_sum_positions([3, 9, 1, 7], 10))`,
      },
    ],
  },
  {
    course: 'data-structures-algorithms',
    module: 'linear-structures',
    slug: 'linked-lists',
    kind: 'code',
    durationMinutes: 26,
    title: 'Why "Just Remove It" Takes 40 Minutes in Some Systems',
    technicalTitle: 'Linked lists, pointers and why removal can be O(1)',
    level: 'beginner',
    objectives: [
      'Build a singly linked list and traverse it safely',
      'Explain O(1) insertion and removal at a known node',
      'Recognise the three bugs that break every linked list: null, cycle, lost head',
      'Decide between a list and a linked structure for a real requirement',
    ],
    body: lessonBody({
      scenario: `A job queue holds 300,000 pending tasks. Removing from the front of a Python list with pop(0) shifts every remaining element — that is O(n) per task, and the worker falls an hour behind. A linked structure, or collections.deque, removes from the front in constant time. Same requirement, different container.`,
      outcomes: [
        'Implement traversal, append and removal on a singly linked list.',
        'Explain to someone why array insertion in the middle is O(n).',
        'Detect a cycle with Floyd’s tortoise-and-hare.',
        'Choose `deque` over a hand-written list in real code.',
      ],
      idea: `A list stores elements side by side, so positions are free but insertions move everything after the hole. A linked list stores each element in a **node** that also holds a pointer to the next node, so inserting or removing only rewires two pointers — but reaching the 1,000th element means walking 1,000 pointers.

So the trade is: arrays are fast at *finding by position*, linked structures are fast at *restructuring*. Most production code needs the former, which is why Python's list is an array and why deque exists for the latter.`,
      terms: bullets([
        '**Node** — a value plus a reference to the next node.',
        '**Head / tail** — the first and last node; losing the head loses the list.',
        '**Traversal** — walking node by node with a loop.',
        '**Cycle** — a node pointing back to an earlier node, so traversal never ends.',
        '**Deque** — a double-ended queue with O(1) append and pop at both ends.',
      ]),
      walkthrough: `${code('python', `class Node:
    __slots__ = ("value", "next")
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

def push_front(head, value):
    return Node(value, head)          # O(1), returns the new head

def to_list(head):
    out, node = [], head
    while node is not None:           # guards against the null bug
        out.append(node.value)
        node = node.next
    return out

def remove_value(head, target):
    # Removing needs the node BEFORE the target: that is the O(n) part.
    dummy = Node(None, head)          # avoids a special case for the head
    prev = dummy
    while prev.next is not None:
        if prev.next.value == target:
            prev.next = prev.next.next     # the O(1) rewire
            return dummy.next
        prev = prev.next
    return dummy.next

def has_cycle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

head = None
for v in [3, 2, 1]:
    head = push_front(head, v)
head = remove_value(head, 2)
print(to_list(head), has_cycle(head))`)}

${code('text', `[1, 3] False` )}

The dummy node is the technique that removes the "what if I remove the head?" special case. Without it, half of all linked-list bugs live in that branch.`,
      applications: bullets([
        '**Task queues** — `collections.deque` is the production answer; a hand-written list is for learning.',
        '**LRU caches** — a dict plus a doubly linked list gives O(1) get and evict.',
        '**Undo history** — a chain of immutable states is a linked structure by another name.',
        '**Streaming parsers** — nodes let you drop the front without shifting the buffer.',
      ]),
      mistakes: bullets([
        '**Losing the head** by assigning `head = head.next` inside the loop you are writing.',
        '**Forgetting the null check** and crashing at the end of every list.',
        '**Assuming pop(0) is cheap.** It is O(n); use the deque equivalents or pop from the end.',
        '**Testing a node with a truthiness check** instead of an explicit is-not-None comparison.',
        '**Hand-rolling a linked list in production code.** The standard library already has `deque`.',
      ]),
      practice: numbered([
        'Implement append(head, value) returning the head, in O(n), and then a version with a stored tail that is O(1).',
        'Build a list with a deliberate cycle and confirm `has_cycle` returns True; then break it and confirm False.',
        'Time list pop-from-front versus deque popleft for 100,000 items and write down the ratio.',
      ]),
      check: `${numbered([
        'Why is removing the first element of a Python list O(n)?',
        'What does the dummy node protect you from?',
        'How does Floyd’s algorithm detect a cycle without extra memory?',
      ])}

**Answers:** (1) Every remaining element shifts one slot. (2) A separate code path for removing the head node. (3) In a cycle the fast pointer laps the slow one, so they must meet.`,
      challenge: `Implement an LRU cache with get and put, capacity fixed, evicting the least recently used in O(1) using a dict plus a doubly linked list. Benchmark it against a naive version that scans a list of keys on every access, at 10,000 operations. This is a real interview question and a real component in most backends.`,
      summary: `Linked structures trade random access for cheap restructuring. In Python, list is an array and deque is the linked structure you should actually use. Know which operation your feature leans on, and pick the container that makes it O(1).`,
      further: [
        'The `collections.deque` documentation.',
        'Any visualiser for pointers and cycles — draw the arrows, no matter how simple the list.',
        'The `__slots__` section of the Python data model docs; it matters in node-heavy code.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Push, remove and cycle detection',
        source: `class Node:
    __slots__ = ("value", "next")
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

def push_front(head, value):
    return Node(value, head)

def to_list(head):
    out, node = [], head
    while node is not None:
        out.append(node.value)
        node = node.next
    return out

head = None
for v in [3, 2, 1]:
    head = push_front(head, v)
print(to_list(head))

from collections import deque
d = deque(range(5))
d.popleft()
print(list(d))`,
      },
    ],
  },
  {
    course: 'data-structures-algorithms',
    module: 'linear-structures',
    slug: 'stacks-queues',
    kind: 'code',
    durationMinutes: 25,
    title: 'The Undo Button, the Bracket Checker and the Call Stack',
    technicalTitle: 'Stacks, queues and deques in practice',
    level: 'beginner',
    objectives: [
      'Implement a stack and a queue with the standard library',
      'Use a stack to check balanced brackets',
      'Explain why a queue needs a different structure from a stack',
      'Recognise these structures inside tools you already use',
    ],
    body: lessonBody({
      scenario: `A configuration editor validates brackets as you type. Type a closing brace into a file whose opening brace is on a line 200 lines above: the editor rejects it instantly. No parser ran. It used a stack, and stacks are the reason nested anything is checkable in one pass.`,
      outcomes: [
        'Write push, pop and peek on a list and know the cost of each.',
        'Validate balanced brackets including mixed types.',
        'Use `deque` for FIFO work and explain why a list is wrong for it.',
        'Read a traceback and see it as a stack.',
      ],
      idea: `A **stack** is last in, first out: the most recent thing is the first thing out. A **queue** is first in, first out: things leave in the order they arrived.

Nesting is why stacks appear everywhere. Every opening bracket must be closed by the *most recent* unclosed one, so the container must hand back the newest item — a stack. Queues appear wherever fairness or order matters: jobs, messages, breadth-first traversal.

In Python, list append and pop are the stack (both O(1)), and collections.deque is the queue (append and popleft are both O(1)). Popping index 0 from a list is the trap: it is O(n).`,
      terms: bullets([
        '**LIFO / FIFO** — last-in-first-out and first-in-first-out.',
        '**peek** — read the top without removing it.',
        '**Breadth-first search** — traversal by queue; **depth-first** — traversal by stack (or recursion).',
        '**Call stack** — the interpreter’s own stack of function frames; a traceback is that stack, printed.',
      ]),
      walkthrough: `${code('python', `def is_balanced(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)                 # push
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False                 # wrong type, or nothing to close
    return not stack                          # anything left open fails

for s in ["{[()]}", "{[(])}", "(((", ""]:
    print(repr(s), is_balanced(s))`)}

${code('text', `'{[()]}' True
'{[(])}' False
'(((' False
'' True` )}

Now the queue, and the cost that matters:

${code('python', `from collections import deque
import time

N = 100_000
t = time.perf_counter()
jobs = deque(range(N))
while jobs:
    jobs.popleft()
deque_ms = (time.perf_counter() - t) * 1000

t = time.perf_counter()
jobs = list(range(N))
while jobs:
    jobs.pop(0)              # O(n) each time: this is the bug
list_ms = (time.perf_counter() - t) * 1000

print(f"deque {deque_ms:.1f} ms · list.pop(0) {list_ms:.1f} ms")`)}

${code('text', `deque 8.2 ms · list.pop(0) 421.5 ms` )}

The ratio grows with N; that is the difference between O(n) total and O(n²) total.`,
      applications: bullets([
        '**Undo/redo** — two stacks: one of actions done, one of actions undone.',
        '**Parsers and formatters** — brackets, HTML tags, indentation blocks.',
        '**Job workers** — a queue with a deque, or a real broker.',
        '**Traceback reading** — the most recent call is at the bottom of the printed stack.',
      ]),
      mistakes: bullets([
        '**Popping from the front of a list as a queue.** Use deque popleft instead.',
        '**Popping an empty stack** — it raises IndexError; test that the stack is non-empty first.',
        '**Returning True early** on the first balanced pair, before the input is consumed.',
        '**Confusing the order of a stack trace.** Read the last line first: that is the actual error.',
        '**Using a queue where a stack is needed** — recursion-to-iterative conversions silently change traversal order.',
      ]),
      practice: numbered([
        'Add support for `<` and `>` to `is_balanced` and confirm it still rejects mismatches.',
        'Implement peek, size and is_empty as a small Stack class with docstrings.',
        'Run the deque-versus-list benchmark yourself and predict the ratio at 200,000 before running it.',
      ]),
      check: `${numbered([
        'Why is a stack the right structure for bracket matching?',
        'Which two deque operations are O(1)?',
        'What does a traceback have in common with the stack you just implemented?',
      ])}

**Answers:** (1) The most recently opened bracket must be closed first. (2) append and popleft, plus appendleft and pop. (3) It is a printed stack of frames, newest at the bottom.`,
      challenge: `Write a tiny expression evaluator for the four arithmetic operators with integers and parentheses. One stack for numbers and one for operators; handle precedence by popping higher-precedence operators first. Test with 3 + 4 * (2 - 1) and assert the answer is 7. Then make it accept unary minus — that is where real parsers get hard, and you will feel exactly why.`,
      summary: `Stacks and queues are the two ways to order work. Use a list as a stack, a deque as a queue, and never remove from the front of a list. Balanced brackets, undo, traversal order and tracebacks are all the same idea in different clothes.`,
      further: [
        'The `collections.deque` documentation.',
        'Any article on the shunting-yard algorithm for the challenge.',
        'Python’s own `dis` module — the bytecode uses a stack, visibly.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Balanced brackets with a stack',
        source: `def is_balanced(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

for s in ["{[()]}", "{[(])}", "(((", ""]:
    print(repr(s), is_balanced(s))`,
      },
    ],
  },
];
