/** Aptitude academy seed: 6 categories, 12 topics, original questions with explanations. */

export const APTITUDE_TOPICS = [
  {
    slug: 'percentages',
    category: 'quant',
    title: 'Percentages',
    description: 'Percentage change, successive changes, and the traps in "by how much".',
    lesson: `## Three forms of the same idea

- Fraction: 3/4
- Decimal: 0.75
- Percent: 75 %

Converting between them is the whole toolkit: \`25 % = 1/4\`, \`12.5 % = 1/8\`, \`16.66 % = 1/6\`.

## Percentage change

\`\`\`
change % = (new - old) / old × 100
\`\`\`

The denominator is always the **original** value. A price going from 80 to 100 is a 25 % increase, but going from 100 to 80 is a 20 % decrease — same 20 units, different base.

## Successive changes

Two changes of +10 % and −10 % are not neutral:

\`\`\`
100 × 1.10 × 0.90 = 99  → a 1 % net loss
\`\`\`

Multiply the factors; never add the percentages.

## Multipliers make it fast

- Increase by 20 % → multiply by 1.20
- Decrease by 15 % → multiply by 0.85
- "A is 25 % more than B" → A = 1.25B → B is 20 % less than A

## Shortcut worth memorising

If a value increases by x % and then decreases by x %, the net change is a loss of x²/100 %.`,
  },
  {
    slug: 'ratio-proportion',
    category: 'quant',
    title: 'Ratio, Proportion and Mixtures',
    description: 'Part-to-part vs part-to-whole, and alligation for mixtures.',
    lesson: `## Ratio basics

A ratio 3 : 5 means 3 parts to 5 parts — 8 parts in total. If the total is 40, each part is 5, so the shares are 15 and 25.

The most common error is treating a part-to-part ratio as part-to-whole.

## Combining ratios

If A : B = 2 : 3 and B : C = 4 : 5, make B common: multiply the first by 4 and the second by 3:

\`\`\`
A : B = 8 : 12,  B : C = 12 : 15  →  A : B : C = 8 : 12 : 15
\`\`\`

## Mixtures (alligation)

Mixing a cheap component at price c and a dear one at price d to get a mixture at m:

\`\`\`
quantity of cheap : quantity of dear = (d - m) : (m - c)
\`\`\`

The differences are crossed — hence the name. It works for prices, concentrations, speeds and averages.

## Work-rate as a ratio

If A finishes in 6 days and B in 12, their rates are in the ratio 2 : 1 (inverse of times). Together the rate is 1/6 + 1/12 = 1/4, so 4 days.`,
  },
  {
    slug: 'time-speed-distance',
    category: 'quant',
    title: 'Time, Speed and Distance',
    description: 'Unit conversion, relative speed, trains and boats.',
    lesson: `## The only formula

\`\`\`
distance = speed × time
\`\`\`

Keep units consistent. Convert km/h to m/s by multiplying by 5/18; m/s to km/h by 18/5.

## Relative speed

- Same direction: subtract speeds.
- Opposite direction: add speeds.

Two trains of 120 m and 180 m at 54 and 36 km/h in opposite directions cross in (120+180)/(15+10) = 12 seconds.

## Boats and streams

Downstream speed = boat + stream. Upstream = boat − stream.
Average speed for equal distances upstream and downstream is **not** the arithmetic mean — it is the harmonic mean:

\`\`\`
avg = 2ab / (a + b)
\`\`\`

## Average speed over equal distances

Always harmonic: going 60 km/h there and 40 km/h back gives 48 km/h, not 50.

## Time gains

"Walking at 3/4 of usual speed, a person is 20 minutes late." Slower by a factor of 3/4 means time is 4/3 of usual, so the extra 1/3 equals 20 minutes → usual time 60 minutes.`,
  },
  {
    slug: 'number-series',
    category: 'logical',
    title: 'Number Series and Patterns',
    description: 'Differences, ratios, alternating patterns and interleaved series.',
    lesson: `## Method, not intuition

1. Write the differences between consecutive terms.
2. If differences are not constant, write their differences (second differences).
3. If differences grow quickly, check ratios.
4. If nothing fits, look for two interleaved series (odd positions, even positions).

## Worked example

\`\`\`
2, 6, 12, 20, 30, ?
differences:   4, 6, 8, 10  → next difference 12 → 42
(also n² + n: 1·2, 2·3, 3·4, ...)
\`\`\`

## Common families

| Pattern | Example |
|---|---|
| arithmetic | 5, 9, 13, 17 (+4) |
| geometric | 3, 6, 12, 24 (×2) |
| squares / cubes | 1, 4, 9, 16 / 1, 8, 27 |
| primes | 2, 3, 5, 7, 11 |
| alternating | 1, 10, 2, 20, 3, 30 |
| difference-of-differences | 1, 4, 9, 16, 25 |

## Trap

A series can fit more than one rule. Choose the simplest rule consistent with all given terms — that is what the exam intends.`,
  },
  {
    slug: 'logical-reasoning',
    category: 'logical',
    title: 'Syllogisms and Deduction',
    description: 'Valid conclusions, Venn diagrams, and "some/all/no" traps.',
    lesson: `## Draw, do not guess

Statements → a Venn diagram → check each conclusion. Reasoning verbally invites errors.

## The four statement forms

| Form | Meaning |
|---|---|
| All A are B | A ⊆ B |
| No A are B | A ∩ B = ∅ |
| Some A are B | A ∩ B ≠ ∅ |
| Some A are not B | A ⊄ B |

## Reliable conclusions

- From "All A are B" and "All B are C" → "All A are C". ✔
- From "Some A are B" you may conclude "Some B are A". ✔
- From "All A are B" you may **not** conclude "All B are A". ✘

## The "possibility" case

When asked whether a conclusion is *possible*, you accept it if some valid diagram makes it true. "Some cats are dogs" is possible even if the premise never says so.

## Assumption questions

An assumption is what the argument needs but does not state. Test by negating it: if the argument collapses, it was an assumption.`,
  },
  {
    slug: 'seating-arrangement',
    category: 'logical',
    title: 'Seating Arrangement',
    description: 'Linear and circular arrangements solved systematically.',
    lesson: `## Always draw

A row or a circle on paper with fixed slots. Every clue removes options; write "not here" marks.

## Direction conventions

- Facing north: left is west, right is east.
- Facing south: left is east, right is west.
- Facing the centre in a circle: left is clockwise, right is anticlockwise.

## Method

1. Place the most constrained person first (fixed end, next to two others).
2. Apply direct clues.
3. Apply negative clues ("X is not adjacent to Y") as eliminations.
4. Fill the remainder by contradiction: if a slot admits two options, try one and see if it breaks a clue.

## Circular arrangements

For n people around a circle, arrangements up to rotation are (n − 1)!; if reflections count as the same, (n − 1)!/2.

## Time discipline

If a puzzle has more than six entities, fix one anchor and work outward. Abandon a branch quickly if it contradicts; do not re-derive the same dead end twice.`,
  },
  {
    slug: 'reading-comprehension',
    category: 'verbal',
    title: 'Reading Comprehension',
    description: 'Finding the main idea, inference, and answer-elimination.',
    lesson: `## Read for structure

Paragraph 1 usually states the topic; the last usually states the conclusion. The middle carries evidence and counter-argument. Note the **function** of each paragraph, not just its content.

## Question types

| Type | What it asks | Strategy |
|---|---|---|
| Main idea | the whole passage | must cover every paragraph, not one |
| Inference | what follows but is not stated | one small step, not a leap |
| Detail | a specific fact | locate and re-read the exact sentence |
| Tone | author's attitude | look for evaluative adjectives |
| Except | three true, one false | verify each option against the text |

## Elimination

Options are usually wrong because they are: too extreme ("always", "never"), too narrow (one detail), reversed (opposite of the passage), or outside the passage (true in the world, absent in the text).

## Timing

Read once carefully, then answer without re-reading everything. Return only to the sentence you need.`,
  },
  {
    slug: 'vocabulary-usage',
    category: 'verbal',
    title: 'Vocabulary and Sentence Usage',
    description: 'Context clues, confusable pairs, and correct usage.',
    lesson: `## Use context, not memory

A word's meaning is fixed by its sentence. Look for contrast markers ("although", "but"), definition markers ("that is", "—"), and cause markers ("because").

## Confusable pairs that appear in tests

| Pair | Difference |
|---|---|
| affect / effect | verb "to influence" / noun "result" |
| principal / principle | main or head / rule |
| complement / compliment | completes / praises |
| elicit / illicit | draw out / unlawful |
| stationery / stationary | paper / not moving |
| fewer / less | countable / uncountable |

## Sentence correction strategy

1. Read the whole sentence for meaning.
2. Check subject–verb agreement across intervening phrases.
3. Check pronoun reference and number.
4. Check parallelism in lists.
5. Choose the shortest option that preserves meaning.

## Idiom caution

Prepositional idioms ("comply with", "differ from", "superior to") are memorised, not derived. Keep a personal list of the ones you get wrong.`,
  },
  {
    slug: 'data-interpretation',
    category: 'di',
    title: 'Tables, Charts and Percentages',
    description: 'Reading data quickly and computing without a calculator.',
    lesson: `## Read the axes and units first

A chart without units is a trap. Check whether values are in thousands, percentages, or per capita, and whether the axis starts at zero.

## Percentage-point vs percent

Going from 20 % to 25 % is an increase of 5 **percentage points** but a 25 **percent** increase. Exams test this distinction constantly.

## Approximation is a skill

If the options are far apart, round aggressively: 4,912/98 ≈ 5,000/100 = 50. Choose the nearest option and move on.

## Common DI question shapes

1. Ratio between two categories in a given year.
2. Percentage share of a total.
3. Which year had the largest growth rate (not the largest absolute growth).
4. Average over a period.
5. "If the trend continues" projection.

## Watch for

- Totals that include an "other" category you forgot.
- Years with missing data — the average must use the actual count of years.
- Growth rate = (new − old)/old, never the absolute difference.`,
  },
  {
    slug: 'probability-permutation',
    category: 'quant',
    title: 'Permutation, Combination and Probability',
    description: 'When order matters, and how to count without listing.',
    lesson: `## Order or not?

- Permutation (order matters): \`nPr = n! / (n − r)!\`
- Combination (order does not matter): \`nCr = n! / (r! (n − r)!)\`

Choosing 3 of 8 students for a team → 8C3 = 56. Arranging 3 of 8 in a line → 8P3 = 336.

## Probability basics

\`\`\`
P(event) = favourable outcomes / total equally likely outcomes
P(not A) = 1 − P(A)
P(A or B) = P(A) + P(B) − P(A and B)
P(A and B) = P(A) × P(B | A)
\`\`\`

## "At least one" — use the complement

P(at least one) = 1 − P(none). For two dice, P(at least one six) = 1 − (5/6)² = 11/36.

## Handy values

- 52 cards: 4 suits × 13; P(ace) = 4/52 = 1/13; P(heart) = 1/4.
- Two coin flips: 4 outcomes, all equally likely.
- \`nCr\` is symmetric: nCr = nC(n−r), which halves the work.`,
  },
  {
    slug: 'clocks-calendars',
    category: 'quant',
    title: 'Clocks and Calendars',
    description: 'Angle between hands, odd days, and day-of-week shortcuts.',
    lesson: `## Clock angles

Minute hand: 6° per minute. Hour hand: 0.5° per minute. At h hours and m minutes:

\`\`\`
angle = |30h − 5.5m|
\`\`\`

Take the smaller of that and 360° − that. At 3:40: |90 − 220| = 130°.

## Hands coincide

Every 65 5/11 minutes — that is why "the hands meet 11 times in 12 hours".

## Calendars: odd days

A normal year has 365 days = 52 weeks + 1 odd day. A leap year has 2. So the same date shifts by 1 day each year, and 2 across a leap day.

## Shortcut

To find the day of the week for a date, compute total odd days from a known reference (e.g. 1 Jan 2000 was a Saturday) and take the remainder mod 7.

## Century codes worth knowing

1600s: 0, 1700s: 5, 1800s: 3, 1900s: 1, 2000s: 0 odd days.`,
  },
  {
    slug: 'placement-prep',
    category: 'placement',
    title: 'Placement Strategy and Aptitude Patterns',
    description: 'How companies test, where marks are lost, and how to practise.',
    lesson: `## What placement tests actually measure

Speed and accuracy under mild time pressure. Most tests are 20–30 questions in 20–30 minutes across quantitative, logical and verbal sections. Nobody expects perfection; cut-offs are usually 60–75 %.

## Where candidates lose marks

1. **Skipping easy questions** while stuck on one hard one. Rule: 60 seconds per question, then move on.
2. **Calculation errors** from mental arithmetic under pressure — write intermediate steps.
3. **Misreading** ("not", "except", "at least") — underline the qualifier.
4. **Unit mismatches** in speed/distance and percentage questions.

## A three-pass strategy

- Pass 1: answer everything you recognise instantly.
- Pass 2: work the medium ones with a hard 90-second limit.
- Pass 3: guess remaining questions (there is no negative marking in most campus tests — check the instructions).

## Practice design

Do 20 questions a day in timed sets, then review every wrong answer for **why** it was wrong: concept, calculation, or misreading. Track the category of error, not just the score — the pattern tells you what to fix.

## Interview follow-through

Aptitude clears the filter; the technical round decides. Keep one project you can explain end to end, and be able to write a small program on paper.`,
  },
];

export const APTITUDE_QUESTIONS = [
  // percentages
  { topic: 'percentages', difficulty: 'easy', prompt: 'A price rises from 80 to 100. What is the percentage increase?', options: ['20 %', '25 %', '80 %', '125 %'], correct: 1, explanation: 'Increase = 20; base = 80; 20/80 = 25 %.' },
  { topic: 'percentages', difficulty: 'easy', prompt: 'A number is increased by 10 % and then decreased by 10 %. The net change is:', options: ['No change', '1 % increase', '1 % decrease', '2 % decrease'], correct: 2, explanation: '1.10 × 0.90 = 0.99, a 1 % decrease. Successive percentages multiply.' },
  { topic: 'percentages', difficulty: 'medium', prompt: 'If A is 25 % more than B, then B is what percent less than A?', options: ['20 %', '25 %', '16.67 %', '30 %'], correct: 0, explanation: 'A = 1.25B → B = 0.8A, so B is 20 % less than A. The base changes.' },
  { topic: 'percentages', difficulty: 'medium', prompt: 'In an exam, 35 % failed in Maths, 45 % failed in English and 20 % failed in both. What percent passed in both?', options: ['30 %', '40 %', '45 %', '60 %'], correct: 1, explanation: 'Failed in at least one = 35 + 45 − 20 = 60 %. Passed both = 40 %.' },
  { topic: 'percentages', difficulty: 'hard', prompt: 'The population of a town increases by 5 % in year one and decreases by 5 % in year two. If it is now 99,750, what was it two years ago?', options: ['100,000', '99,000', '101,000', '105,000'], correct: 0, explanation: 'Net factor 1.05 × 0.95 = 0.9975. 99,750 / 0.9975 = 100,000.' },

  // ratio
  { topic: 'ratio-proportion', difficulty: 'easy', prompt: 'Divide 120 in the ratio 3 : 5. The larger share is:', options: ['45', '60', '72', '75'], correct: 3, explanation: '8 parts = 120, so 1 part = 15; larger share = 5 × 15 = 75.' },
  { topic: 'ratio-proportion', difficulty: 'medium', prompt: 'If A : B = 2 : 3 and B : C = 4 : 5, then A : C is:', options: ['8 : 15', '2 : 5', '3 : 4', '5 : 8'], correct: 0, explanation: 'A : B : C = 8 : 12 : 15, so A : C = 8 : 15.' },
  { topic: 'ratio-proportion', difficulty: 'medium', prompt: 'A can do a job in 6 days and B in 12 days. Working together, they finish in:', options: ['3 days', '4 days', '4.5 days', '9 days'], correct: 1, explanation: 'Rates 1/6 + 1/12 = 1/4 → 4 days.' },
  { topic: 'ratio-proportion', difficulty: 'hard', prompt: 'In what ratio must rice at ₹40/kg be mixed with rice at ₹60/kg to get a mixture at ₹52/kg?', options: ['2 : 3', '3 : 2', '2 : 1', '1 : 2'], correct: 0, explanation: 'Alligation: (60 − 52) : (52 − 40) = 8 : 12 = 2 : 3.' },

  // time speed distance
  { topic: 'time-speed-distance', difficulty: 'easy', prompt: 'A car travels 150 km in 2.5 hours. Its average speed is:', options: ['50 km/h', '60 km/h', '65 km/h', '75 km/h'], correct: 1, explanation: '150 / 2.5 = 60 km/h.' },
  { topic: 'time-speed-distance', difficulty: 'medium', prompt: 'Two trains, 120 m and 180 m long, run in opposite directions at 54 and 36 km/h. Time to cross each other:', options: ['9 s', '10.8 s', '12 s', '15 s'], correct: 2, explanation: 'Relative speed 90 km/h = 25 m/s; distance 300 m; 300/25 = 12 s.' },
  { topic: 'time-speed-distance', difficulty: 'medium', prompt: 'A boat goes 12 km downstream in 1 hour and returns in 2 hours. The speed of the stream is:', options: ['2 km/h', '3 km/h', '4 km/h', '6 km/h'], correct: 1, explanation: 'Down 12, up 6. Stream = (12 − 6)/2 = 3 km/h.' },
  { topic: 'time-speed-distance', difficulty: 'hard', prompt: 'A man covers half the distance at 30 km/h and the other half at 20 km/h. His average speed is:', options: ['24 km/h', '25 km/h', '25.5 km/h', '26 km/h'], correct: 0, explanation: 'Harmonic mean: 2×30×20/50 = 24 km/h.' },

  // number series
  { topic: 'number-series', difficulty: 'easy', prompt: 'Find the next term: 2, 6, 12, 20, 30, ?', options: ['36', '40', '42', '44'], correct: 2, explanation: 'Differences 4, 6, 8, 10 → next 12 → 42 (n² + n).' },
  { topic: 'number-series', difficulty: 'medium', prompt: 'Find the next term: 3, 6, 11, 18, 27, ?', options: ['36', '38', '40', '42'], correct: 1, explanation: 'Differences 3, 5, 7, 9 → next 11 → 38 (n² + 2).' },
  { topic: 'number-series', difficulty: 'medium', prompt: 'Find the missing term: 1, 4, 9, 16, 25, ?', options: ['30', '36', '42', '49'], correct: 1, explanation: 'Perfect squares: 6² = 36.' },
  { topic: 'number-series', difficulty: 'hard', prompt: 'Find the next term: 2, 3, 5, 8, 13, ?', options: ['18', '20', '21', '23'], correct: 2, explanation: 'Each term is the sum of the previous two (Fibonacci-style): 8 + 13 = 21.' },

  // logical
  { topic: 'logical-reasoning', difficulty: 'easy', prompt: 'All roses are flowers. Some flowers fade quickly. Which conclusion follows?', options: ['All roses fade quickly', 'Some roses fade quickly', 'Some flowers are roses', 'No rose fades quickly'], correct: 2, explanation: 'All roses are flowers → some flowers are roses. The fading claim cannot be tied to roses.' },
  { topic: 'logical-reasoning', difficulty: 'medium', prompt: 'No cats are dogs. Some dogs are brown. Which conclusion follows?', options: ['Some brown things are not cats', 'No brown thing is a cat', 'All dogs are brown', 'Some cats are brown'], correct: 0, explanation: 'Those brown dogs are dogs, hence not cats — so some brown things are not cats.' },
  { topic: 'logical-reasoning', difficulty: 'medium', prompt: 'If all engineers are logical and some logical people are artists, then:', options: ['All artists are engineers', 'Some engineers are artists', 'Some logical people are engineers', 'No engineer is an artist'], correct: 2, explanation: 'All engineers are logical implies some logical people are engineers. Nothing links engineers to artists.' },
  { topic: 'logical-reasoning', difficulty: 'hard', prompt: 'Statements: Some books are pens. All pens are chairs. Conclusion: Some chairs are books. The conclusion is:', options: ['Definitely true', 'Definitely false', 'Possibly true but not definite', 'Cannot be determined from the data'], correct: 0, explanation: 'The pens that are books are also chairs, so some chairs are books.' },

  // seating
  { topic: 'seating-arrangement', difficulty: 'medium', prompt: 'Five people sit in a row facing north. A is at the extreme left, B is immediately right of A, and E is at the extreme right. C is between B and D. Who is in the middle?', options: ['B', 'C', 'D', 'E'], correct: 1, explanation: 'Order: A, B, C, D, E. The middle seat (3rd) is C.' },
  { topic: 'seating-arrangement', difficulty: 'medium', prompt: 'Six friends sit around a circular table facing the centre. If P is opposite Q and R is to the immediate right of P, how many people sit between R and Q on the shorter side?', options: ['0', '1', '2', '3'], correct: 2, explanation: 'With 6 seats, R sits one position from P; the shorter arc from R to Q holds two people.' },
  { topic: 'seating-arrangement', difficulty: 'hard', prompt: 'Four people P, Q, R, S sit in a row. Q is not at either end. R is to the immediate left of S. P is at the extreme left. Who is at the extreme right?', options: ['P', 'Q', 'R', 'S'], correct: 3, explanation: 'P is leftmost; Q is not an end; R immediately left of S gives P, Q, R, S. S is rightmost.' },

  // verbal
  { topic: 'reading-comprehension', difficulty: 'easy', prompt: 'A passage argues that remote work increases productivity but reduces mentorship. The main idea is:', options: ['Remote work is always better', 'Remote work has a productivity benefit and a mentorship cost', 'Mentorship is more important than productivity', 'Offices should be abolished'], correct: 1, explanation: 'The main idea must cover both halves of the argument, without exaggeration.' },
  { topic: 'reading-comprehension', difficulty: 'medium', prompt: 'The author writes: "The policy was well-intentioned, though its execution was careless." The tone is:', options: ['Hostile', 'Admiring', 'Balanced and critical', 'Indifferent'], correct: 2, explanation: '"Well-intentioned, though..." signals approval of intent with criticism of execution.' },
  { topic: 'vocabulary-usage', difficulty: 'easy', prompt: 'Choose the correct word: "The new schedule will ______ everyone in the team."', options: ['effect', 'affect', 'effected', 'affective'], correct: 1, explanation: '"Affect" is the verb meaning to influence; "effect" is usually a noun.' },
  { topic: 'vocabulary-usage', difficulty: 'medium', prompt: 'Choose the correct sentence.', options: ['Neither of the students were present.', 'Neither of the students was present.', 'Neither of the student were present.', 'Neither of the students are present.'], correct: 1, explanation: '"Neither" is singular, so the verb is "was".' },
  { topic: 'vocabulary-usage', difficulty: 'medium', prompt: 'The word closest in meaning to "candid" is:', options: ['Secretive', 'Frank', 'Cautious', 'Decorative'], correct: 1, explanation: 'Candid means honest and direct.' },

  // DI
  { topic: 'data-interpretation', difficulty: 'easy', prompt: 'A company\'s revenue grew from ₹40 lakh to ₹50 lakh. The growth rate is:', options: ['10 %', '20 %', '25 %', '125 %'], correct: 2, explanation: '10/40 = 25 %.' },
  { topic: 'data-interpretation', difficulty: 'medium', prompt: 'In 2024 a store sold 480 units; in 2025 it sold 600. The percentage increase is:', options: ['20 %', '25 %', '30 %', '120 %'], correct: 1, explanation: '120/480 = 25 %.' },
  { topic: 'data-interpretation', difficulty: 'medium', prompt: 'A survey shows 20 % of 500 users prefer option A. If the share rises to 25 %, the increase in users is:', options: ['5', '20', '25', '125'], correct: 2, explanation: '20 % of 500 = 100; 25 % of 500 = 125; increase 25 users (5 percentage points).' },
  { topic: 'data-interpretation', difficulty: 'hard', prompt: 'Pass rate went from 64 % to 72 %. Which statement is correct?', options: ['It rose by 8 %', 'It rose by 8 percentage points and about 12.5 %', 'It rose by 12.5 percentage points', 'It doubled'], correct: 1, explanation: '8 percentage points; relative increase = 8/64 = 12.5 %.' },

  // probability
  { topic: 'probability-permutation', difficulty: 'easy', prompt: 'Two fair dice are rolled. What is the probability of getting a sum of 7?', options: ['1/6', '1/8', '1/9', '1/12'], correct: 0, explanation: 'Six of 36 outcomes sum to 7 → 6/36 = 1/6.' },
  { topic: 'probability-permutation', difficulty: 'medium', prompt: 'In how many ways can 3 people be chosen from 8?', options: ['24', '56', '120', '336'], correct: 1, explanation: 'Order does not matter: 8C3 = 56.' },
  { topic: 'probability-permutation', difficulty: 'medium', prompt: 'A bag has 4 red and 6 blue balls. Two are drawn without replacement. The probability both are red is:', options: ['2/15', '4/25', '1/5', '3/10'], correct: 0, explanation: '4/10 × 3/9 = 12/90 = 2/15.' },
  { topic: 'probability-permutation', difficulty: 'hard', prompt: 'A card is drawn from a standard deck. What is the probability it is a king or a heart?', options: ['4/13', '16/52', '17/52', '1/4'], correct: 0, explanation: '4 kings + 13 hearts − 1 king of hearts = 16/52 = 4/13.' },

  // clocks
  { topic: 'clocks-calendars', difficulty: 'medium', prompt: 'What is the angle between the hands of a clock at 3:40?', options: ['120°', '130°', '140°', '150°'], correct: 1, explanation: '|30×3 − 5.5×40| = |90 − 220| = 130°.' },
  { topic: 'clocks-calendars', difficulty: 'easy', prompt: 'How many times do the hands of a clock coincide in 12 hours?', options: ['10', '11', '12', '13'], correct: 1, explanation: 'Every 65 5/11 minutes → 11 coincidences in 12 hours.' },
  { topic: 'clocks-calendars', difficulty: 'medium', prompt: 'If 1 January 2024 is a Monday, what day is 1 January 2025?', options: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], correct: 1, explanation: '2024 is a leap year, so 2 odd days: Monday + 2 = Wednesday.' },
  { topic: 'clocks-calendars', difficulty: 'hard', prompt: 'A clock shows 4:20. The angle between the hands is:', options: ['0°', '10°', '20°', '30°'], correct: 1, explanation: '|30×4 − 5.5×20| = |120 − 110| = 10°.' },

  // placement
  { topic: 'placement-prep', difficulty: 'easy', prompt: 'A test has 25 questions in 25 minutes. Your best strategy is:', options: ['Solve in order strictly', 'Attempt easy questions first, then medium, then guess the rest', 'Spend 3 minutes per question', 'Leave hard questions unanswered entirely'], correct: 1, explanation: 'A three-pass strategy maximises marks under time pressure without negative marking.' },
  { topic: 'placement-prep', difficulty: 'medium', prompt: 'You score 18/25 but the cut-off is 19. The most useful review is:', options: ['Redo the whole paper', 'Classify each wrong answer as concept, calculation or misreading', 'Practise only the topic you scored lowest in', 'Change your exam strategy entirely'], correct: 1, explanation: 'Classifying errors reveals the dominant failure mode, which tells you what to practise.' },
];
