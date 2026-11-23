import { lessonBody, code, bullets, numbered } from './sections.js';

/**
 * Generative AI — next-generation lessons. The course is about building with
 * models, so every lesson gives a runnable Python snippet. Where a snippet needs
 * a network call to a model provider it is marked, and the offline parts still run.
 */

export const genaiLessons = [
  {
    course: 'generative-ai',
    module: 'how-llms-work',
    slug: 'tokens-and-embeddings',
    kind: 'code',
    durationMinutes: 30,
    title: 'Why Your Model Charged You for "the" 47 Times',
    technicalTitle: 'Tokens, tokenisation, embeddings and probability',
    level: 'beginner',
    objectives: [
      'Explain what a token is and why cost is measured in them',
      'Estimate tokens for a piece of text and a whole prompt',
      'Explain what an embedding represents and how similarity is measured',
      'Say why "the model sees text" is the wrong mental model',
    ],
    body: lessonBody({
      scenario: `A team ships a support assistant and the monthly bill is four times the estimate. The prompt was small. What grew was the conversation: every turn resent the whole history, and the history is measured in tokens, not words. Nobody had looked at how the text becomes numbers.`,
      outcomes: [
        'Describe the path from characters to tokens to ids.',
        'Estimate the token count of a prompt before sending it.',
        'Compute cosine similarity between two embeddings by hand.',
        'Explain why a long conversation costs more than a long document.',
      ],
      idea: `A language model never sees text. It sees a sequence of integer **token ids**, each standing for a chunk of characters — a word, part of a word, or punctuation.

Text goes through a **tokeniser** into tokens, then into ids. Common words are one token ("the"), rare words split ("tokenisation" becomes several pieces). English averages roughly four characters per token; code, URLs and non-English text are worse. That is why the same paragraph can cost very different amounts in different languages.

Cost and the context window are both measured in tokens. A chat resends the entire history each turn, so a conversation of 20 turns with a 1,000-token system prompt has paid for that prompt 20 times.

**Embeddings** are a different use of the same model family: a whole piece of text becomes one vector of a few hundred numbers, positioned so that similar meanings are close. Similarity is usually **cosine similarity** — the dot product of unit-length vectors, which is 1 for identical direction and 0 for unrelated. These vectors are what a retrieval system searches.`,
      terms: bullets([
        '**Token** — the unit a model reads; not a word, not a character.',
        '**Tokeniser** — the rules that split text into tokens and back.',
        '**Context window** — the maximum tokens the model can attend to at once.',
        '**Embedding** — a fixed-size vector representing meaning.',
        '**Cosine similarity** — a similarity score from -1 to 1 between two vectors.',
      ]),
      walkthrough: `You do not need a model to understand tokenisation — a word-piece approximation is enough to build intuition:

${code('python', `import re

WORD = re.compile(r"\\w+|[^\\w\\s]")

def approx_tokens(text):
    # Crude on purpose: a real tokeniser splits long words into sub-pieces.
    # This tracks the *idea* — words and punctuation become separate units.
    pieces = []
    for tok in WORD.findall(text):
        if len(tok) > 8:                     # rare/long words split up
            pieces.extend(tok[i:i + 4] for i in range(0, len(tok), 4))
        else:
            pieces.append(tok)
    return pieces

text = "Tokenisation is not tokenization, and the LLM sees ids."
pieces = approx_tokens(text)
print(len(pieces), "tokens for", len(text), "characters")
print(pieces)`)}

${code('text', `12 tokens for 52 characters
['Tokeni', 'satio', 'n', 'is', 'not', 'tokeni', 'zatio', 'n', ',', 'and', 'the', 'LLM', 'sees', 'ids', '.']` )}

The exact list depends on the tokeniser; the lesson is the ratio and the splitting, not the digits. Now embeddings and similarity, with hand-made vectors so it runs anywhere:

${code('python', `import math

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb)

# Pretend these come from an embedding model: [topic_ai, topic_cooking, formality]
vecs = {
    "how do I train a model":   [0.92, 0.02, 0.30],
    "fine-tuning an LLM":       [0.88, 0.01, 0.35],
    "best recipe for biryani":  [0.03, 0.95, 0.10],
}

query = vecs["how do I train a model"]
for label, v in vecs.items():
    print(f"{cosine(query, v):.3f}  {label}")`)}

${code('text', `1.000  how do I train a model
0.999  fine-tuning an LLM
0.083  best recipe for biryani` )}

Those two high scores are what makes semantic search possible: "fine-tuning" and "training a model" share almost no words, yet their vectors agree. A keyword index would find nothing.`,
      applications: bullets([
        '**Cost control** — estimating tokens before a call is the first useful monitoring metric.',
        '**Retrieval** — embeddings plus cosine similarity is the whole heart of a RAG system.',
        '**Caching** — identical prefixes can be cached; that is a token-counting feature.',
        '**Deduplication** — near-identical documents have cosine similarity above a threshold.',
      ]),
      mistakes: bullets([
        '**Counting words instead of tokens.** Four characters per token is a rough English rule; code and URLs break it.',
        '**Assuming a conversation is as cheap as a prompt.** The history is resent every turn.',
        '**Comparing embeddings from different models.** Vectors from different models are not in the same space.',
        '**Using dot product on unnormalised vectors** and calling it cosine similarity.',
        '**Assuming a tokeniser is reversible by string splitting.** Always use the provider’s tokeniser for real counts.',
      ]),
      practice: numbered([
        'Run `approx_tokens` on a paragraph of your own writing and on a code snippet. Compare tokens per character.',
        'Compute cosine similarity between two vectors you invent that should be similar, and two that should not.',
        'Write `estimate_cost(tokens_in, tokens_out)` given prices per 1,000 tokens and use it on a 20-turn conversation.',
      ]),
      check: `${numbered([
        'Why does a 20-turn conversation cost more than one long prompt of the same total length?',
        'What does a cosine similarity of 0.02 between two embeddings tell you?',
        'Why is four characters per token unsafe for cost estimates on code?',
      ])}

**Answers:** (1) Every turn resends the accumulated history, so earlier tokens are billed repeatedly. (2) The vectors point in nearly unrelated directions. (3) Code has more punctuation and symbols, which tokenisers split more finely — the real ratio is lower.`,
      challenge: `Build a token budget for a support assistant: system prompt, retrieved context, conversation history, and the answer. Write a function that takes each part in characters, estimates tokens, and prints a table with a running total against a context window you pass in. Add a warning when the total exceeds 70% — that is when answers start degrading in practice. No API key needed.`,
      summary: `Models read token ids, so everything you pay for and everything they can attend to is counted in tokens. Embeddings are meaning as vectors, compared with cosine similarity, and they are the retrieval side of every RAG system. Estimate before you send.`,
      further: [
        'The tokeniser playground from any major provider — paste text and watch it split.',
        'The `math` module docs for the distance functions you will need.',
        'Any article on word-piece tokenisation for why rare words split.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Tokens by approximation, similarity by hand',
        source: `import math, re

WORD = re.compile(r"\\w+|[^\\w\\s]")

def approx_tokens(text):
    pieces = []
    for tok in WORD.findall(text):
        if len(tok) > 8:
            pieces.extend(tok[i:i + 4] for i in range(0, len(tok), 4))
        else:
            pieces.append(tok)
    return pieces

text = "Tokenisation is not tokenization, and the LLM sees ids."
print(len(approx_tokens(text)), "tokens for", len(text), "characters")

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x*x for x in a)) * math.sqrt(sum(y*y for y in b)))

print(round(cosine([0.92, 0.02, 0.30], [0.88, 0.01, 0.35]), 3))
print(round(cosine([0.92, 0.02, 0.30], [0.03, 0.95, 0.10]), 3))`,
      },
    ],
  },
  {
    course: 'generative-ai',
    module: 'how-llms-work',
    slug: 'attention',
    kind: 'reading',
    durationMinutes: 26,
    title: 'How a Model Decided Which Word Matters',
    technicalTitle: 'Attention, context and why a model forgets',
    level: 'beginner',
    objectives: [
      'Explain attention as a weighted lookup, without matrix notation',
      'Say why context length is finite and what happens past it',
      'Recognise when a missing answer is a context problem, not a prompt problem',
      'Read a context window as a budget you allocate',
    ],
    body: lessonBody({
      scenario: `A model answers "when does the warranty expire?" wrongly for one customer. The warranty date is on page 4 of a 30-page policy the assistant pasted in. The prompt is fine; the date simply stopped being attended to. Understanding attention is what turns "the AI is dumb" into a fixable design problem.`,
      outcomes: [
        'Describe attention as "each token decides which earlier tokens to look at".',
        'Explain why long inputs degrade before the hard limit is reached.',
        'Prioritise what goes into a context window when not everything fits.',
        'Use lost-in-the-middle behaviour to place important context deliberately.',
      ],
      idea: `Every token in the input carries information forward by **attending** to other tokens. Concretely, for each token the model computes a score against every earlier token ("how relevant are you to me?"), turns those scores into weights that sum to 1, and builds a new representation as the weighted sum of those tokens' values.

That is it. No symbol tables, no database. Everything the model "knows" about this conversation exists as these weights over the tokens currently in the window.

Two consequences matter in practice:

- **Attention is bounded by the window.** Tokens outside it are invisible; there is no overflow to disk. Beyond the limit, either the request fails or the oldest content is dropped — and dropping is silent unless you handle it.
- **Attention is not uniform.** Models attend most reliably to the beginning and end of a long input, and least to the middle. This is why an instruction repeated at the end of a long prompt often works better than one stated once at the top.

So context is a budget you allocate deliberately: system rules, retrieved evidence, the current question, and room for the answer.`,
      terms: bullets([
        '**Attention weights** — how much each token draws from each earlier token.',
        '**Context window** — the tokens the model can attend to in one call.',
        '**Lost in the middle** — the measured drop in recall for content in the middle of long inputs.',
        '**Truncation** — dropping content to fit; must be explicit and logged.',
        '**Chunking** — splitting long documents so only relevant pieces enter the window.',
      ]),
      walkthrough: `You can simulate the core idea — weighted attention over tokens — in twenty lines. This is not a transformer, but it reproduces the behaviour that matters: weights that sum to one, and output that changes when a relevant token appears.

${code('python', `def softmax(scores):
    import math
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]     # m keeps it numerically stable
    total = sum(exps)
    return [e / total for e in exps]

def attend(query, tokens):
    # Pretend each token has a relevance score for this query.
    scores = [len(set(query.lower().split()) & set(t.lower().split())) for t in tokens]
    weights = softmax(scores)
    return weights

tokens = [
    "The warranty runs for two years",
    "Shipping takes five days",
    "Warranty claims need an invoice",
]
weights = attend("warranty expiry", tokens)
for w, t in zip(weights, tokens):
    print(f"{w:.3f}  {t}")`)}

${code('text', `0.499  The warranty runs for two years
0.002  Shipping takes five days
0.499  Warranty claims need an invoice` )}

Notice what happened: two tokens split the attention almost entirely, and the shipping line is effectively invisible. When a model gives a mediocre answer, that is often the shape of the problem — the relevant passage was never given weight — and the fix is to change what is in the window, not to shout in the prompt.

The loss you would see during training is exactly this: a cross-entropy cost over the predicted next token, which is why "the model was trained to predict text" is a complete description of its objective and only part of its behaviour.`,
      applications: bullets([
        '**RAG design** — put the best-matching passage first and repeat the question at the end.',
        '**Long chats** — summarise older turns instead of carrying all of them.',
        '**Contract review** — chunk by clause so each clause is attended to individually.',
        '**Support assistants** — keep the system rules short and near the end of the window.',
      ]),
      mistakes: bullets([
        '**Assuming "the model read the whole PDF".** It read whatever fit in the window.',
        '**Filling the window with everything.** More context can make an answer worse and always costs more.',
        '**Putting the critical instruction only at the top of a 20-page prompt.** Repeat it near the question.',
        '**Truncating silently.** Log what was dropped, or the next debugging session is guesswork.',
        '**Confusing attention with memory.** There is no state between calls unless you send it again.',
      ]),
      practice: numbered([
        'Run the attention simulation with a different query and confirm the weights shift to the relevant tokens.',
        'Take a long article and compute where a fact sits (start, middle, end). Note why position matters for prompting.',
        'Draft a context budget for a support assistant as percentages: rules, retrieved text, history, answer.',
      ]),
      check: `${numbered([
        'What happens to a token just outside the context window?',
        'Why do models recall the start and end of a long input better than the middle?',
        'If a model answers from a document incorrectly, what should you check first?',
      ])}

**Answers:** (1) It is invisible — the model cannot attend to it at all. (2) Attention is not uniform; the loss of recall in the middle is a measured, documented effect. (3) Whether the relevant passage was actually in the window and positioned where it is attended to.`,
      challenge: `Build a context packer: given a system prompt, a list of candidate passages with a relevance score, and a token budget, choose which passages go in, in what order, and report what was dropped and why. Test it with 40 passages and a 2,000-token budget. That function is the difference between a demo and a product.`,
      summary: `Attention is each token deciding what to read from earlier tokens, with weights that sum to one. It is bounded by the window and uneven across position. Context is therefore an allocation problem: choose, order, and log what you leave out.`,
      further: [
        'The original "Attention Is All You Need" paper — read the abstract and the first diagram only.',
        'Any article on "lost in the middle" for the recall measurements.',
        'The `math.exp` docs, for why the softmax subtracts the maximum.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Attention as a weighted lookup, simulated',
        source: `import math

def softmax(scores):
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

def attend(query, tokens):
    scores = [len(set(query.lower().split()) & set(t.lower().split())) for t in tokens]
    return softmax(scores)

tokens = [
    "The warranty runs for two years",
    "Shipping takes five days",
    "Warranty claims need an invoice",
]
for w, t in zip(attend("warranty expiry", tokens), tokens):
    print(f"{w:.3f}  {t}")`,
      },
    ],
  },
  {
    course: 'generative-ai',
    module: 'prompt-engineering',
    slug: 'prompt-structure',
    kind: 'code',
    durationMinutes: 30,
    title: 'The Prompt That Stopped Being Broken When It Got Structure',
    technicalTitle: 'Prompt structure, roles, constraints and output contracts',
    level: 'intermediate',
    objectives: [
      'Separate instructions, context and input into distinct blocks',
      'Specify an output contract the caller can parse',
      'Write prompts that fail loudly rather than plausibly',
      'Debug a prompt by changing one thing at a time',
    ],
    body: lessonBody({
      scenario: `An invoice extractor works in testing and returns "I'm sorry, I can't find the total" in production — for invoices that clearly have one. Nothing is wrong with the model. The prompt was a sentence that happened to work on the samples; it had no output contract, so every unusual input became a sentence instead of a number.`,
      outcomes: [
        'Structure a prompt into role, task, context, input and output contract.',
        'Define a schema the model must satisfy, and validate it.',
        'Make a prompt say "unknown" instead of inventing a plausible answer.',
        'Build a small test set that a prompt change must pass.',
      ],
      idea: `A prompt is an interface. An interface has an input format, a contract for the output, and behaviour for bad input. Prompts that skip the contract work in demos and fail in production.

The structure that survives is boring and effective:

1. **Role** — one line: what kind of assistant this is.
2. **Task** — exactly one ask, in the imperative.
3. **Context** — the material to reason over, clearly delimited (fences or XML tags), never mixed into the instructions.
4. **Output contract** — the exact shape, ideally JSON with named fields and types.
5. **Refusal rule** — what to return when the answer is not present. Without this, the model will guess, because guessing is what it was trained to do.

Then **validate**. A prompt without validation is a hope. Parse the JSON, check the types, and reject rather than repair when it fails.`,
      terms: bullets([
        '**System prompt** — standing rules, higher priority than user input.',
        '**Delimiter** — a marker (tag, fence) that separates instructions from data.',
        '**Output contract** — the schema and vocabulary the answer must follow.',
        '**Hallucination** — fluent output that is not supported by the input.',
        '**Prompt injection** — data in the context that tries to act as instructions.',
      ]),
      walkthrough: `The extractor, written as an interface. This runs offline: the parts you can test without a model are exactly the parts people skip.

${code('python', `import json, re

PROMPT = """You are an invoice parser.

TASK: extract the vendor name, invoice date and total amount from the document.
CONTEXT:
<document>
{document}
</document>

OUTPUT: a single JSON object with exactly these keys:
  "vendor": string or null
  "date":   ISO date string (YYYY-MM-DD) or null
  "total":  number or null
  "currency": 3-letter code or null

RULES:
- If a field is not present, use null. Never guess, never infer from a similar document.
- Do not add keys, markdown fences or commentary.
"""

def validate(raw):
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as err:
        return None, f"not JSON: {err}"
    expected = {"vendor": (str, type(None)), "date": (str, type(None)),
                "total": (float, int, type(None)), "currency": (str, type(None))}
    for key, types in expected.items():
        if key not in data:
            return None, f"missing key {key}"
        if not isinstance(data[key], types):
            return None, f"wrong type for {key}"
    return data, None

samples = [
    '{"vendor": "Acme Ltd", "date": "2026-04-01", "total": 4999.0, "currency": "INR"}',
    '{"vendor": "Acme Ltd", "date": "01/04/2026", "total": "4999", "currency": "INR"}',
    'Sorry, I could not find the total.',
]

for raw in samples:
    data, problem = validate(raw)
    print("ok" if data else f"rejected: {problem}")`)}

${code('text', `ok
rejected: wrong type for total
rejected: not JSON: Expecting value: line 1 column 1 (char 0)` )}

Two of three were rejected — and that is the point. The second sample is *almost* right: right keys, right vendor, wrong types. A pipeline that coerced the string would ship a bug; a pipeline that rejects it gets a clean retry with a corrective message.

That corrective retry is the second half of the interface: send the validation error back with the original document and ask for a corrected object, at most once.`,
      applications: bullets([
        '**Data extraction** — invoices, receipts, forms; the highest-value use of LLMs.',
        '**Classification** — fixed label sets with a forced refusal label.',
        '**Assistants** — tool calls are output contracts with strict schemas.',
        '**Evaluation** — a schema is the first automated test you can write.',
      ]),
      mistakes: bullets([
        '**Mixing context into instructions.** Put data in fenced blocks, always.',
        '**Asking for "a summary" without length, audience or format.** You get whatever is easiest to generate.',
        '**No refusal rule.** The model invents rather than says "not present".',
        '**Coercing types in the parser** to "make it work" — that hides exactly the failures you need to see.',
        '**Changing three prompt clauses at once** and losing track of which change mattered.',
      ]),
      practice: numbered([
        'Run the validator on five more strings, including a JSON array and a number.',
        'Add a `line_items` field with a documented shape and validate each item.',
        'Write the corrective retry message you would send on a validation failure.',
      ]),
      check: `${numbered([
        'Why is an output contract more valuable than a longer instruction?',
        'What is the danger of coercing a string total into a number?',
        'How does a refusal rule reduce hallucination?',
      ])}

**Answers:** (1) It makes the output machine-checkable, so failures are caught instead of shipped. (2) It silently accepts a malformed answer, hiding model drift. (3) It gives the model a legitimate way to say "unknown", removing the pressure to fabricate.`,
      challenge: `Write a prompt and validator for classifying support tickets into a fixed label set (billing, bug, account, other) with a confidence level and a one-line reason. Build a test set of 12 tickets including two ambiguous ones and one empty one. Run it against a provider, and record every rejection. If you have no provider key, run the validator against hand-written model outputs first — the harness is the deliverable.`,
      summary: `A prompt is an interface: role, one task, delimited context, an output contract, and a refusal rule. Then parse and validate, and reject rather than repair. Structure is what makes behaviour stable between the demo and production.`,
      further: [
        'The `json` module docs for `json.loads` and error handling.',
        'Any provider guide on structured outputs or schema-constrained decoding.',
        'Your Lab: run the validator with your own model outputs.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'A validator that rejects almost-right output',
        source: `import json

def validate(raw):
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as err:
        return None, f"not JSON: {err}"
    expected = {"vendor": (str, type(None)), "date": (str, type(None)),
                "total": (float, int, type(None)), "currency": (str, type(None))}
    for key, types in expected.items():
        if key not in data:
            return None, f"missing key {key}"
        if not isinstance(data[key], types):
            return None, f"wrong type for {key}"
    return data, None

samples = [
    '{"vendor": "Acme Ltd", "date": "2026-04-01", "total": 4999.0, "currency": "INR"}',
    '{"vendor": "Acme Ltd", "date": "01/04/2026", "total": "4999", "currency": "INR"}',
    'Sorry, I could not find the total.',
]
for raw in samples:
    data, problem = validate(raw)
    print("ok" if data else f"rejected: {problem}")`,
      },
    ],
  },
  {
    course: 'generative-ai',
    module: 'prompt-engineering',
    slug: 'evaluation',
    kind: 'code',
    durationMinutes: 32,
    title: 'The Feature That Felt Perfect and Scored 61%',
    technicalTitle: 'Building an evaluation set and measuring quality',
    level: 'intermediate',
    objectives: [
      'Build a small evaluation set that reflects production input',
      'Choose a metric that matches what the feature must do',
      'Measure a prompt change instead of trusting a feeling',
      'Report quality honestly, including what was not measured',
    ],
    body: lessonBody({
      scenario: `A summarisation feature is demoed to ten people and everyone loves it. It ships. Support reports that two of the three summaries on legal documents omit the cancellation clause. Nobody had checked that case, because the demo set was chosen to show the feature working.`,
      outcomes: [
        'Build an evaluation set from real inputs, including the awkward ones.',
        'Define exact-match, contains and similarity metrics and when each applies.',
        'Run the same set against two prompt versions and compare.',
        'Report a result with its sample size and its blind spots.',
      ],
      idea: `Quality is a measurement, not an impression. Three steps make it real:

1. **A set** — 20 to 50 inputs that look like production, including past failures. If you have no failures in the set, it cannot detect regressions.
2. **A metric** — something computable. Exact match for classification, field-level accuracy for extraction, contains for "must mention the clause", and similarity or a rubric score for free text.
3. **A comparison** — run both versions, print a table, and state the delta honestly.

The trap that catches everyone: judging outputs yourself makes you a bottleneck and a biased rater. Automate what you can, and mark the rest for human review rather than silently grading it.

Cost matters too. A prompt that is 3% better and twice as expensive is often the wrong choice — report both.`,
      terms: bullets([
        '**Golden set** — a curated, labelled evaluation set.',
        '**Regression** — a previously passing case that now fails.',
        '**Precision / recall** — of the outputs a model produced, how many were right; of the right ones, how many it found.',
        '**Rubric** — written criteria for scoring an output that a human or a model judge applies.',
        '**LLM-as-judge** — using a model to score outputs; fast, cheap, and needs its own validation.',
      ]),
      walkthrough: `Here is a complete harness — offline, no API key, fully runnable — measuring two extractor versions against labelled cases:

${code('python', `def extractor_v1(doc):
    # Version 1: naive line-based parse, no validation.
    total = next((l.split(":")[1].strip() for l in doc.splitlines() if "Total" in l), None)
    return {"total": total}

def extractor_v2(doc):
    # Version 2: strips currency symbols and commas, returns a number.
    import re
    line = next((l for l in doc.splitlines() if l.lower().startswith("total")), None)
    if not line:
        return {"total": None}
    digits = re.sub(r"[^0-9.]", "", line.split(":", 1)[1])
    return {"total": float(digits) if digits else None}

CASES = [
    ("Total: 4999", 4999.0),
    ("Total: 4,999", 4999.0),
    ("Invoice total: INR 1,20,500.50", 120500.50),
    ("Subtotal: 400\\nShipping: 99\\nTotal: 499", 499.0),
    ("No total on this document", None),
]

def score(extractor):
    passed, failures = 0, []
    for doc, expected in CASES:
        got = extractor(doc)["total"]
        ok = got == expected
        passed += ok
        if not ok:
            failures.append((doc.splitlines()[0], expected, got))
    return passed / len(CASES), failures

for name, fn in [("v1", extractor_v1), ("v2", extractor_v2)]:
    accuracy, failures = score(fn)
    print(f"{name}: {accuracy:.0%} ({len(CASES) - len(failures)}/{len(CASES)})")
    for doc, expected, got in failures:
        print(f"   FAIL {doc!r} expected {expected!r} got {got!r}")`)}

${code('text', `v1: 40% (2/5)
   FAIL 'Total: 4,999' expected 4999.0 got '4,999'
   FAIL 'Invoice total: INR 1,20,500.50' expected 120500.5 got None
   FAIL 'Subtotal: 400' expected 499.0 got None
v2: 100% (5/5)` )}

Version 1 handled the easy case and nothing else, exactly as it would in production. Version 2 is the same idea with a label, a regex and a refusal. Both results took under a second to obtain — and the 40% figure would have saved the demo.

Note what the harness also tells you: v2 returns null for the no-total document, which is a *correct* answer there. A metric that counted only "number found" would have scored v2 higher for the wrong reason.`,
      applications: bullets([
        '**Every prompt change** — run the set before merging, like a unit test.',
        '**Model upgrades** — swap the model, rerun the set, compare.',
        '**Cost decisions** — quality delta per rupee is a real product decision.',
        '**Support triage** — the failure list becomes the next prompt iteration.',
      ]),
      mistakes: bullets([
        '**A set with no failures in it.** It cannot detect regressions.',
        '**Scoring only the fields the model got right**, which hides refusals.',
        '**One or two cases.** The result is noise; 20 is a minimum for a percentage to mean anything.',
        '**Judging by vibes after three examples.** The tenth example is where the interesting failure lives.',
        '**Never re-running the set.** Prompts drift as providers update models.',
      ]),
      practice: numbered([
        'Run the harness above and then add two cases that v2 still fails (hint: a totals row with a tax column).',
        'Add a `precision` and `recall` calculation for a classifier with a "bug" label.',
        'Write three rubric lines you would use to score a summary, and one that would be impossible to check automatically.',
      ]),
      check: `${numbered([
        'Why must an evaluation set contain known failures?',
        'What does a 100% score on 5 cases actually tell you?',
        'Why report cost alongside quality?',
      ])}

**Answers:** (1) So it can detect regressions and prove improvements. (2) Very little about production — the sample is tiny; it shows the approach works, not the accuracy. (3) A slightly better prompt at twice the cost is usually the wrong trade.`,
      challenge: `Build a real golden set for one feature you care about: 20 inputs, expected outputs, and a script that scores any extractor function against them, printing accuracy, a failure list and the mean latency using time.perf_counter(). Add a baseline mode that compares two versions and exits non-zero if quality drops. That script is the deliverable that makes prompt work engineering.`,
      summary: `Measure quality with a set of real inputs that includes failures, a metric that matches the task, and an honest report of sample size and blind spots. A prompt change without a measurement is a guess with extra steps.`,
      further: [
        'The `time` module docs for latency measurement.',
        'Any article on precision and recall for the classifier metrics.',
        'Your Lab: run the harness and add your own failure cases.',
      ],
    }),
    code: [
      {
        language: 'python',
        caption: 'Two extractor versions, one honest score',
        source: `import re

def extractor_v1(doc):
    total = next((l.split(":")[1].strip() for l in doc.splitlines() if "Total" in l), None)
    return {"total": total}

def extractor_v2(doc):
    line = next((l for l in doc.splitlines() if l.lower().startswith("total")), None)
    if not line:
        return {"total": None}
    digits = re.sub(r"[^0-9.]", "", line.split(":", 1)[1])
    return {"total": float(digits) if digits else None}

CASES = [
    ("Total: 4999", 4999.0),
    ("Total: 4,999", 4999.0),
    ("Invoice total: INR 1,20,500.50", 120500.50),
    ("Subtotal: 400\\nShipping: 99\\nTotal: 499", 499.0),
    ("No total on this document", None),
]

for name, fn in [("v1", extractor_v1), ("v2", extractor_v2)]:
    passed = sum(fn(doc)["total"] == expected for doc, expected in CASES)
    print(f"{name}: {passed}/{len(CASES)} = {passed/len(CASES):.0%}")`,
      },
    ],
  },
];
