import { lessonBody, code, bullets, numbered } from './sections.js';

/**
 * Data Structures & Algorithms — next-generation lessons, part 2 (trees, graphs,
 * advanced patterns). Each lesson ends with something runnable in the Lab.
 */

export const dsaLessons2 = [
  {
    course: 'data-structures-algorithms',
    module: 'trees-graphs',
    slug: 'tree-traversal',
    kind: 'code',
    durationMinutes: 30,
    title: 'One Object Tree, Three Very Different Answers',
    technicalTitle: 'Binary trees, recursion and BFS versus DFS',
    level: 'intermediate',
    objectives: [
      'Write the three depth-first orders from memory and say what each is for',
      'Convert a recursive traversal to an explicit stack',
      'Choose breadth-first when the question is "closest"',
      'Avoid the recursion-depth crash on real data',
    ],
    body: lessonBody({
      scenario: `A file explorer needs two answers from the same folder tree: "list everything under Documents" and "show the tree indented". The first is a flat walk, the second needs structure preserved while walking. Same data, two traversals — and picking the wrong one produces output that is correct but unusable.`,
      outcomes: [
        'Traverse a tree in pre-order, in-order and post-order and predict the output.',
        'Explain which order gives sorted output for a binary search tree.',
        'Write breadth-first traversal with a queue and say what it guarantees.',
        'Convert recursion to a loop when the tree is deep.',
      ],
      idea: `A tree is a graph with no cycles and one root, so any traversal must decide **when to visit a node relative to its children**:

- **Pre-order** (node, left, right) — you need to see the parent before its children: rendering an indented tree, copying a structure, prefix expressions.
- **In-order** (left, node, right) — you need sorted output from a binary search tree. This is the property that makes BSTs worth using.
- **Post-order** (left, right, node) — you need children finished before the parent: computing folder sizes, deleting a tree, evaluating an expression.

**Breadth-first** uses a queue instead of the call stack and visits by level. Its superpower is a guarantee: the first time you reach a node, you reached it by the shortest path in edges. That is why "closest" questions are BFS, never DFS.

Recursion is the natural expression, but Python's default limit is about 1000 frames. A skewed tree of 5,000 nodes crashes a recursive traversal — that is not theoretical, it is what production file trees look like.`,
      terms: bullets([
        '**Root, leaf, height** — the top node, a node with no children, and the longest path down.',
        '**DFS** — depth-first search; explores one branch to the end before backtracking.',
        '**BFS** — breadth-first search; explores level by level.',
        '**Recursion depth** — how many frames are on the call stack; `sys.getrecursionlimit()` shows the cap.',
        '**Binary search tree** — a tree where in-order traversal yields sorted values.',
      ]),
      walkthrough: `${code('python', `class Node:
    def __init__(self, value, left=None, right=None):
        self.value, self.left, self.right = value, left, right

def preorder(node, out=None):
    out = [] if out is None else out
    if node:
        out.append(node.value)
        preorder(node.left, out)
        preorder(node.right, out)
    return out

def inorder(node, out=None):
    out = [] if out is None else out
    if node:
        inorder(node.left, out)
        out.append(node.value)
        inorder(node.right, out)
    return out

def postorder(node, out=None):
    out = [] if out is None else out
    if node:
        postorder(node.left, out)
        postorder(node.right, out)
        out.append(node.value)
    return out

#        4
#      /   \\
#     2     6
#    / \\   /
#   1   3 5
tree = Node(4, Node(2, Node(1), Node(3)), Node(6, Node(5)))

print("pre   ", preorder(tree))
print("in    ", inorder(tree))     # sorted: it is a BST
print("post  ", postorder(tree))`)}

${code('text', `pre    [4, 2, 1, 3, 6, 5]
in     [1, 2, 3, 4, 5, 6]
post   [1, 3, 2, 5, 6, 4]` )}

Now the same tree breadth-first, and the iterative version that will not overflow:

${code('python', `from collections import deque

def bfs_levels(root):
    levels, queue = [], deque([root] if root else [])
    while queue:
        level = []
        for _ in range(len(queue)):      # snapshot the level size
            node = queue.popleft()
            level.append(node.value)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        levels.append(level)
    return levels

def preorder_iterative(root):
    stack, out = [root] if root else [], []
    while stack:
        node = stack.pop()
        out.append(node.value)
        # right first so the left subtree is processed first
        if node.right: stack.append(node.right)
        if node.left: stack.append(node.left)
    return out

print(bfs_levels(tree))
print(preorder_iterative(tree))
print(bfs_levels(tree) == [[4], [2, 6], [1, 3, 5]])`)}

${code('text', `[[4], [2, 6], [1, 3, 5]]
[4, 2, 1, 3, 6, 5]
True` )}`,
      applications: bullets([
        '**File systems** — post-order to compute the size of a folder, pre-order to indent a tree.',
        '**DOM and UI trees** — event bubbling is post-order; rendering is pre-order.',
        '**Shortest path in an unweighted graph** — BFS, every time.',
        '**Expression parsing** — post-order is how an expression is evaluated by a stack machine.',
      ]),
      mistakes: bullets([
        '**Assuming recursion is free.** Deep trees raise `RecursionError`; convert to an explicit stack when depth is unbounded.',
        '**Using DFS to find the nearest node.** It finds *a* node, not the closest one.',
        '**Forgetting to snapshot the queue length** in level-order, which merges all levels into one list.',
        '**Mutating the tree while traversing it.** Collect decisions first, then apply them.',
        '**Treating a BST as sorted without checking it is a BST.** A malformed tree gives unsorted "sorted" output.',
      ]),
      practice: numbered([
        'Run the three orders on a tree you build yourself and predict each output before running it.',
        'Write `height(node)` recursively, then iteratively with a stack of (node, depth).',
        'Rewrite `inorder` without recursion. Hint: push nodes while walking left, then pop.',
      ]),
      check: `${numbered([
        'Which traversal gives sorted output for a binary search tree?',
        'Which traversal would you use to compute the total size of every folder?',
        'Why does BFS guarantee the shortest path in edges?',
      ])}

**Answers:** (1) In-order. (2) Post-order, because a folder needs its children's sizes first. (3) It explores every node at distance d before any node at distance d+1.`,
      challenge: `Build a small "du" tool: given a nested dict representing folders and file sizes, compute the total size of each folder and print the tree indented, with sizes right-aligned. Use post-order for the sizes and pre-order for the printing, and show both in one program. Then make it work on a 3,000-deep chain without crashing — you will need the iterative form.`,
      summary: `Depth-first orders differ only in when the node is visited; the right order makes a hard problem trivial. Breadth-first answers "closest". Recursion is clearer until the data is deep, then an explicit stack is the same algorithm with a guaranteed ceiling.`,
      further: [
        'The `sys.setrecursionlimit` docs, and why raising it is rarely the fix.',
        'Any BFS-versus-DFS visualiser — watch one tree get explored both ways.',
        'The `deque` docs again; level-order is where it earns its place.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'The same tree, three orders and a level walk',
        source: `from collections import deque

class Node:
    def __init__(self, value, left=None, right=None):
        self.value, self.left, self.right = value, left, right

def inorder(node, out=None):
    out = [] if out is None else out
    if node:
        inorder(node.left, out)
        out.append(node.value)
        inorder(node.right, out)
    return out

def bfs_levels(root):
    levels, queue = [], deque([root] if root else [])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.value)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        levels.append(level)
    return levels

tree = Node(4, Node(2, Node(1), Node(3)), Node(6, Node(5)))
print(inorder(tree))
print(bfs_levels(tree))`,
      },
    ],
  },
  {
    course: 'data-structures-algorithms',
    module: 'trees-graphs',
    slug: 'graphs',
    kind: 'code',
    durationMinutes: 32,
    title: 'From "Six Degrees" to a Map-Routing Engine',
    technicalTitle: 'Graphs, BFS, DFS and shortest paths',
    level: 'intermediate',
    objectives: [
      'Represent a graph and say what each representation costs',
      'Find the shortest path in an unweighted graph with BFS',
      'Find the cheapest path in a weighted graph with Dijkstra',
      'Detect a cycle and explain why it matters for scheduling',
    ],
    body: lessonBody({
      scenario: `A delivery app needs "the fastest route from this warehouse to that customer". Distance alone is the wrong answer: a highway is longer in kilometres and shorter in minutes. A friend-network feature needs "how far is this person from me?" in connections. Both are graphs; only one needs weights.`,
      outcomes: [
        'Build an adjacency list from an edge list.',
        'Run BFS and reconstruct the actual path, not just the distance.',
        'Run Dijkstra with a priority queue and know when BFS is enough.',
        'Recognise a dependency cycle before it deadlocks a build.',
      ],
      idea: `A graph is nodes plus edges. The **adjacency list** — a dict of node to list of neighbours — is the default in practice: it costs O(V + E) memory and iterates neighbours in time proportional to their count. An adjacency matrix is O(V²) memory and only wins for dense graphs.

**Unweighted shortest path:** BFS. Every edge costs the same, so the first time you reach a node you did it by the fewest edges. Record each node's parent as you go, then walk the parents backwards to reconstruct the path.

**Weighted shortest path:** Dijkstra. Always expand the cheapest known node (a min-heap does this), relax its edges, and stop when you pop the target. All weights must be non-negative — with negative weights you need Bellman–Ford.

**Cycle detection:** in a dependency graph, a cycle is a deadlock. DFS with a "currently on the stack" set finds it, which is the same reason your build tool can tell you "circular dependency".`,
      terms: bullets([
        '**Directed / undirected** — whether edges have a direction (a road may be one-way).',
        '**Weight** — a cost on an edge: minutes, rupees, distance.',
        '**Adjacency list** — neighbours stored per node; the default representation.',
        '**Relaxation** — improving the best known distance to a neighbour.',
        '**Priority queue / heap** — `heapq`, how Dijkstra picks the next cheapest node.',
      ]),
      walkthrough: `${code('python', `from collections import deque
import heapq

def build(edges):
    graph = {}
    for a, b in edges:
        graph.setdefault(a, []).append(b)
        graph.setdefault(b, []).append(a)
    return graph

def shortest_path(graph, start, goal):
    parents = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            path, cur = [], node
            while cur is not None:
                path.append(cur)
                cur = parents[cur]
            return path[::-1]
        for nxt in graph.get(node, []):
            if nxt not in parents:          # visited check == cheapest here
                parents[nxt] = node
                queue.append(nxt)
    return None

friends = build([("ana", "bo"), ("bo", "cy"), ("cy", "di"), ("ana", "el"), ("el", "di")])
print(shortest_path(friends, "ana", "di"))     # fewest hops, not the only route`)}

${code('text', `['ana', 'el', 'di']` )}

Now the weighted case, where distance is not cost:

${code('python', `def dijkstra(roads, start):
    best = {start: 0}
    heap = [(0, start)]
    parents = {start: None}
    while heap:
        cost, node = heapq.heappop(heap)
        if cost > best.get(node, float("inf")):
            continue                        # stale entry, skip it
        for nxt, minutes in roads.get(node, []):
            new_cost = cost + minutes
            if new_cost < best.get(nxt, float("inf")):
                best[nxt] = new_cost
                parents[nxt] = node
                heapq.heappush(heap, (new_cost, nxt))
    return best, parents

roads = {
    "warehouse": [("hub", 12), ("ring", 25)],
    "hub": [("ring", 8), ("shop", 30)],
    "ring": [("shop", 6)],
    "shop": [],
}
best, _ = dijkstra(roads, "warehouse")
print(best)` )}

${code('text', `{'warehouse': 0, 'hub': 12, 'ring': 20, 'shop': 26}` )}

The ring looks longer than the direct road, but going through the hub costs 20 minutes versus 25 — Dijkstra finds that without trying every route.`,
      applications: bullets([
        '**Maps and routing** — Dijkstra and its refinements run in every navigation app.',
        '**Dependency builds** — topological order is DFS; a cycle means the build cannot start.',
        '**Recommendations** — "people also follow" is a two-hop neighbourhood query.',
        '**Network reachability** — which services can reach a failing dependency.',
      ]),
      mistakes: bullets([
        '**Using DFS for shortest paths.** It finds a path, not the shortest one.',
        '**Marking visited on push in Dijkstra.** Mark on pop, and skip stale heap entries.',
        '**Forgetting to store parents** and having to re-run the search to get the route.',
        '**Negative weights in Dijkstra.** The greedy assumption breaks; the result is silently wrong.',
        '**Building an adjacency matrix for a sparse graph.** Memory explodes on real road networks.',
      ]),
      practice: numbered([
        'Extend `shortest_path` to return the hop count along with the path.',
        'Add a third road to the weighted example that makes the direct route optimal, and confirm the answer changes.',
        'Write `has_cycle(graph)` for a directed graph using a DFS with an on-stack set.',
      ]),
      check: `${numbered([
        'When is BFS sufficient for shortest path?',
        'Why does Dijkstra refuse negative weights?',
        'What does an adjacency list cost compared to an adjacency matrix?',
      ])}

**Answers:** (1) When every edge has the same cost. (2) A cheaper path could be found later through a negative edge, breaking the "already final" assumption. (3) O(V + E) memory versus O(V²).`,
      challenge: `Model your city: 12 landmarks, roads with minute-costs. Build the graph from a list of triples, implement Dijkstra, and print the route and total minutes for three different journeys. Then add a "fastest route avoiding a closed road" parameter. This is a small, honest version of the tool the lesson opened with.`,
      summary: `Graphs answer connectivity and distance questions. Use an adjacency list, BFS when edges are equal-cost, Dijkstra when they are not, and DFS when you need structure — like topological order or cycle detection. Always keep parents if you need the route itself.`,
      further: [
        'The `heapq` documentation — the priority queue behind Dijkstra.',
        'Any visualiser for Dijkstra; watching the frontier expand is worth ten paragraphs.',
        'Your Lab: run the two snippets with your own city data.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'BFS for hops, Dijkstra for minutes',
        source: `from collections import deque
import heapq

def build(edges):
    graph = {}
    for a, b in edges:
        graph.setdefault(a, []).append(b)
        graph.setdefault(b, []).append(a)
    return graph

def shortest_path(graph, start, goal):
    parents, queue = {start: None}, deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            path, cur = [], node
            while cur is not None:
                path.append(cur); cur = parents[cur]
            return path[::-1]
        for nxt in graph.get(node, []):
            if nxt not in parents:
                parents[nxt] = node
                queue.append(nxt)
    return None

print(shortest_path(build([("a","b"),("b","c"),("c","d"),("a","e"),("e","d")]), "a", "d"))

def dijkstra(roads, start):
    best, heap = {start: 0}, [(0, start)]
    while heap:
        cost, node = heapq.heappop(heap)
        if cost > best.get(node, float("inf")): continue
        for nxt, w in roads.get(node, []):
            if cost + w < best.get(nxt, float("inf")):
                best[nxt] = cost + w
                heapq.heappush(heap, (cost + w, nxt))
    return best

print(dijkstra({"w": [("h", 12), ("r", 25)], "h": [("r", 8), ("s", 30)], "r": [("s", 6)], "s": []}, "w"))`,
      },
    ],
  },
  {
    course: 'data-structures-algorithms',
    module: 'advanced-patterns',
    slug: 'dynamic-programming',
    kind: 'code',
    durationMinutes: 34,
    title: 'The Same Subproblem, 40 Million Times',
    technicalTitle: 'Memoisation, tabulation and recognising overlapping subproblems',
    level: 'advanced',
    objectives: [
      'Recognise a problem that repeats its own subproblems',
      'Turn naive recursion into memoised recursion with one decorator',
      'Decide between top-down and bottom-up',
      'Build a solution from a recurrence you wrote down yourself',
    ],
    body: lessonBody({
      scenario: `A pricing engine searches for the cheapest way to split a shipment into boxes. It checks every combination, and for 30 items it runs for over an hour. The answer for 30 items is built from answers for 29, which are built from 28 — and it recomputes the same smaller answers millions of times. Caching them turns the hour into milliseconds.`,
      outcomes: [
        'Write the recurrence for a problem before writing code.',
        'Convert an exponential recursion to linear with memoisation.',
        'Implement the same recurrence bottom-up and explain the trade.',
        'Recognise when DP does not apply at all.',
      ],
      idea: `Dynamic programming applies when two conditions hold:

1. **Optimal substructure** — the best answer to the whole problem is built from the best answers to smaller problems.
2. **Overlapping subproblems** — the smaller problems repeat.

If (1) holds and there are no repeats, that is divide-and-conquer (merge sort), not DP. If (1) does not hold, no amount of caching helps.

The process is always the same three steps: write the recurrence in words, write it as naive recursion, then add memory — either a decorator (top-down, only computes what is needed) or a loop (bottom-up, no recursion limit and easier to space-optimise).`,
      terms: bullets([
        '**Recurrence** — a formula that defines a problem in terms of smaller ones.',
        '**Memoisation** — caching results of a recursive function, top-down.',
        '**Tabulation** — filling a table iteratively, bottom-up.',
        '**State** — exactly which arguments determine the answer; the cache key.',
        '**Base case** — the smallest input, answered directly.',
      ]),
      walkthrough: `${code('python', `from functools import lru_cache
import time

# Recurrence: climb(n) = climb(n - 1) + climb(n - 2), climb(0) = 1, climb(1) = 1
def climb_naive(n):
    return 1 if n < 2 else climb_naive(n - 1) + climb_naive(n - 2)

@lru_cache(maxsize=None)
def climb_memo(n):
    return 1 if n < 2 else climb_memo(n - 1) + climb_memo(n - 2)

def climb_bottom_up(n):
    if n < 2:
        return 1
    a, b = 1, 1
    for _ in range(n - 1):
        a, b = b, a + b          # only two values needed: O(1) space
    return b

t = time.perf_counter(); r1 = climb_naive(30); naive_ms = (time.perf_counter() - t) * 1000
t = time.perf_counter(); r2 = climb_memo(30); memo_ms = (time.perf_counter() - t) * 1000
t = time.perf_counter(); r3 = climb_bottom_up(30); loop_ms = (time.perf_counter() - t) * 1000

print(r1, r2, r3)
print(f"naive {naive_ms:.1f} ms · memo {memo_ms:.2f} ms · loop {loop_ms:.4f} ms")`)}

${code('text', `1346269 1346269 1346269
naive 402.6 ms · memo 0.09 ms · loop 0.01 ms` )}

Same answer, three growth classes: exponential, linear, linear. The memoised version is only *fast* if the number of distinct subproblems is small — here 31 states, not 40 million calls.

The harder step is finding the state. A useful test: ask "if I knew the best answer for every smaller version of this, could I compute mine in one loop?". If yes, name exactly which arguments those smaller versions vary in — that is your cache key.`,
      applications: bullets([
        '**Text editing** — edit distance decides the diff between two versions of a file.',
        '**Pricing and packing** — knapsack variants decide how to split or bundle.',
        '**Streaks and sequences** — longest increasing subsequence appears in analytics.',
        '**Interviewing** — DP is the standard line between "wrote a loop" and "modelled a problem".',
      ]),
      mistakes: bullets([
        '**Applying DP where subproblems do not repeat.** You add a cache and gain nothing.',
        '**Caching on mutable arguments.** `lru_cache` needs hashable keys; pass tuples, not lists.',
        '**Forgetting to clear a cache** between test cases in a long-running process.',
        '**Jumping to tabulation before making recursion correct.** Get the naive version right first.',
        '**Deep recursion without a base case that is actually reached.** Python will raise `RecursionError`, not a wrong answer — good, but late.',
      ]),
      practice: numbered([
        'Run the three climb functions and reproduce the table; predict `climb(35)` before running.',
        'Write `min_coins(amount, coins)` naive, then memoise it, then make it bottom-up.',
        'For the edit-distance problem, write the recurrence in words first. Do not write code until the words are right.',
      ]),
      check: `${numbered([
        'What two conditions must hold for DP to apply?',
        'When is bottom-up preferable to memoisation?',
        'Why is the memoised climb linear rather than exponential?',
      ])}

**Answers:** (1) Optimal substructure and overlapping subproblems. (2) When recursion depth is a risk, or when you need constant memory via rolling variables. (3) There are only n distinct inputs, each computed once.`,
      challenge: `Implement edit distance: the minimum number of inserts, deletes and substitutions to turn one string into another. Write the recurrence in a comment, implement it bottom-up in one table, and print both the distance and the operations. Then measure it against the naive recursive version on two 12-character strings. This one problem contains every DP idea the lesson teaches.`,
      summary: `DP is caching applied to a recurrence. Write the recurrence in words, write it naively, then add memory — a decorator for clarity, a loop for safety and space. If subproblems do not repeat, it is not DP.`,
      further: [
        'The `functools.lru_cache` documentation.',
        'Any edit-distance visualiser; the table makes the recurrence visible.',
        'The Lab: your own recurrence, first naive, then memoised.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Naive, memoised and bottom-up',
        source: `from functools import lru_cache
import time

def climb_naive(n):
    return 1 if n < 2 else climb_naive(n - 1) + climb_naive(n - 2)

@lru_cache(maxsize=None)
def climb_memo(n):
    return 1 if n < 2 else climb_memo(n - 1) + climb_memo(n - 2)

def climb_bottom_up(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a

t = time.perf_counter(); print(climb_naive(28), f"{(time.perf_counter()-t)*1000:.1f} ms")
t = time.perf_counter(); print(climb_memo(28), f"{(time.perf_counter()-t)*1000:.2f} ms")
t = time.perf_counter(); print(climb_bottom_up(28), f"{(time.perf_counter()-t)*1000:.4f} ms")`,
      },
    ],
  },
  {
    course: 'data-structures-algorithms',
    module: 'advanced-patterns',
    slug: 'sorting-searching',
    kind: 'code',
    durationMinutes: 28,
    title: 'When "Not Found" Is Not the Answer You Need',
    technicalTitle: 'Sorting, binary search and searching over answers',
    level: 'advanced',
    objectives: [
      'Write a binary search that returns an insertion point, not just a hit',
      'Pick a sort key deliberately and keep it stable',
      'Use binary search over a range of answers, not just an array',
      'Debug the three classic binary-search failure modes',
    ],
    body: lessonBody({
      scenario: `A dashboard shows "median order value" and a support agent asks for the number of orders between ₹500 and ₹2,000. Scanning every order takes 400 ms per query, and the agent runs 60 queries a day. Sorting once and using two binary searches makes each query a fraction of a millisecond — and the difference between a hit and a *position* is the whole trick.`,
      outcomes: [
        'Implement lower-bound and upper-bound searches correctly, first try.',
        'Explain stability and why it matters for multi-key sorting.',
        'Recognise a problem where the answer is searchable even though no array is.',
        'State the complexity of sort-then-search versus repeated scans.',
      ],
      idea: `**Binary search** works on any monotonic predicate, not only on arrays of numbers. The moment you can say "everything before this point fails, everything after it passes", you can binary search — over sorted data, over a range of numbers, over a range of time.

Two variants cover almost everything:

- **Lower bound** — the first index whose value is **≥ target**. This is where the target would be inserted, and it is what ranges and duplicates need.
- **Upper bound** — the first index whose value is **> target**. Subtracting the two gives the count of a value.

The three classic failures: mixing an inclusive upper bound with hi = mid (infinite loop or a skipped answer), computing mid outside the loop's invariant, and forgetting what to return when the target is absent.

**Sorting:** Python's sorted is stable, so sorting by amount after sorting by name preserves name order inside equal amounts. That is a free feature for multi-key ordering — sort by the least significant key first.`,
      terms: bullets([
        '**Stability** — equal elements keep their previous relative order.',
        '**Lower bound / upper bound** — first index `>= target` and first index `> target`.',
        '**Predicate** — a function returning True/False that must be monotonic along the search space.',
        '**Search over answers** — binary searching a value range rather than an array.',
      ]),
      walkthrough: [
        code('python', `from bisect import bisect_left, bisect_right

amounts = [120, 500, 500, 780, 2000, 2400, 5000]

def lower_bound(values, target):
    lo, hi = 0, len(values)          # hi is exclusive: the answer may be len
    while lo < hi:
        mid = (lo + hi) // 2
        if values[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

lo = lower_bound(amounts, 500)
hi = bisect_right(amounts, 2000)
print(lo, hi, "orders in range:", hi - lo)`),
        code('text', `1 5 orders in range: 4`),
        'Now search over **answers** rather than data — the pattern people miss:',
        code('python', `def min_capacity(weights, days):
    # Smallest daily capacity that ships all weights within the given days.
    def days_needed(cap):
        used, current = 1, 0
        for w in weights:
            if current + w > cap:
                used += 1
                current = 0
            current += w
        return used

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:
            hi = mid                # mid works; try smaller
        else:
            lo = mid + 1            # mid too small
    return lo

print(min_capacity([3, 2, 2, 4, 1, 4], 3))`),
        code('text', `6`),
        'There is no array here. What makes it work is that "capacity c is enough" is monotonic: if 6 works, 7 also works. That is the only condition binary search needs.',
      ].join('\n\n'),
      applications: bullets([
        '**Analytics filters** — ranges over sorted timestamps or amounts.',
        '**Log search** — find the first error after a deploy by time.',
        '**Rate limiting** — the smallest window that keeps requests under a limit.',
        '**Version resolution** — find the oldest release that satisfies a constraint.',
      ]),
      mistakes: bullets([
        '**Using an inclusive upper bound with hi = mid** — the classic infinite loop. Pick one convention and keep it.',
        '**Returning `True` on the first mid that matches** when you actually need the *first* match.',
        '**Sorting inside the search loop.** Sort once; search many times.',
        '**Binary searching a predicate that is not monotonic.** The answer is then meaningless, not just wrong.',
        '**Ignoring stability** and getting unpredictable order for equal keys.',
      ]),
      practice: numbered([
        'Implement `count_in_range(values, low, high)` with two binary searches and test it on empty input, all-equal input, and values outside the range.',
        'Write `first_error_at_or_after(logs, timestamp)` using lower bound on a sorted list of times.',
        'Extend `min_capacity` to also return the number of days used at the answer.',
      ]),
      check: `${numbered([
        'What does `lower_bound` return when the target is not present?',
        'Why does search-over-answers need no array?',
        'What does a stable sort guarantee?',
      ])}

**Answers:** (1) The index where it would be inserted, keeping the list sorted. (2) It needs only a monotonic predicate over the candidate range. (3) Equal elements keep their original relative order.`,
      challenge: `Build the dashboard query from the lesson: 200,000 order amounts, sorted once. Implement count_between(low, high), median and p95. Benchmark each against a naive scan and print a table. This is a real performance decision you will meet in any analytics codebase.`,
      summary: `Sort once, search many times. Model your search as a monotonic predicate — first index where it becomes true — and binary search becomes a single reusable shape, whether the space is an array, a number range or a time range.`,
      further: [
        'The `bisect` module — use it in production instead of hand-writing.',
        'Python’s `sorted` and `list.sort` docs, especially the `key` and stability notes.',
        'The Lab: run the range-count snippet against your own generated data.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Lower bound, range count, and searching over answers',
        source: `from bisect import bisect_left, bisect_right

amounts = [120, 500, 500, 780, 2000, 2400, 5000]

def count_between(values, low, high):
    return bisect_right(values, high) - bisect_left(values, low)

print(count_between(amounts, 500, 2000))

def min_capacity(weights, days):
    def days_needed(cap):
        used, current = 1, 0
        for w in weights:
            if current + w > cap:
                used += 1; current = 0
            current += w
        return used
    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo

print(min_capacity([3, 2, 2, 4, 1, 4], 3))`,
      },
    ],
  },
];
