/**
 * Courses 07–09: Deep Learning, Cybersecurity, Cloud & DevOps.
 */

const DOC = (title, url, provider, licenseNote = 'Official documentation — linked, not redistributed.') => ({ title, url, provider, kind: 'docs', licenseNote });

export const COURSES_3 = [
  {
    slug: 'deep-learning',
    title: 'Deep Learning',
    tagline: 'Networks, gradients and training that actually converges.',
    category: 'Artificial Intelligence',
    icon: 'network',
    level: 'Intermediate → Advanced',
    durationHours: 48,
    outcomes: [
      'Implement forward and backward passes by hand',
      'Build and train a small network in PyTorch',
      'Diagnose vanishing gradients and overfitting',
      'Use CNNs and transfer learning appropriately',
    ],
    prereqs: ['Machine Learning basics', 'Linear algebra intuition', 'Python'],
    description:
      'Deep learning becomes tractable once you have built one network by hand. This course derives backpropagation on a tiny example, then moves to real frameworks, transfer learning and deployment constraints.',
    modules: [
      {
        slug: 'neural-networks',
        title: 'Neural Networks From Scratch',
        summary: 'Neurons, activations, backpropagation, optimisation.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'perceptron-to-network',
            title: 'From a Neuron to a Network',
            kind: 'reading',
            minutes: 26,
            objectives: ['Explain what a layer computes', 'Choose activations', 'Understand why non-linearity is required'],
            body: `## A neuron

\`\`\`
z = w·x + b
a = activation(z)
\`\`\`

A layer is many neurons in parallel: \`Z = XW + b\`. Stacking layers without a non-linear activation collapses into a single linear map — you could replace the whole network with one matrix. Non-linearity is what buys expressive power.

## Activations

| Activation | Range | Notes |
|---|---|---|
| ReLU | [0, ∞) | cheap, default for hidden layers; can "die" at 0 |
| Leaky ReLU | (-∞, ∞) | avoids dead units |
| sigmoid | (0, 1) | output layer for binary probability; saturates |
| tanh | (-1, 1) | zero-centred, still saturates |
| softmax | simplex | multi-class output |

## Universal approximation, honestly

A wide enough network can approximate any continuous function. That says nothing about whether gradient descent will find good weights with your data. Architecture helps; data and optimisation decide.

## Shapes

Write shapes next to every tensor. Most deep learning bugs are shape bugs that silently broadcast:

\`\`\`
X: (batch, features) → W: (features, hidden) → Z: (batch, hidden)
\`\`\``,
            code: [
              {
                language: 'python',
                caption: 'A two-layer network, forward only',
                source: `import random\nrandom.seed(0)\n\ndef relu(x):\n    return max(0.0, x)\n\nW1 = [[random.uniform(-1, 1) for _ in range(3)] for _ in range(2)]  # (2,3)\nb1 = [0.1, -0.1, 0.0]\nW2 = [[random.uniform(-1, 1)] for _ in range(3)]  # (3,1)\nb2 = [0.0]\n\ndef forward(x):\n    z1 = [sum(x[i] * W1[i][j] for i in range(2)) + b1[j] for j in range(3)]\n    a1 = [relu(v) for v in z1]\n    z2 = sum(a1[j] * W2[j][0] for j in range(3)) + b2[0]\n    return a1, z2\n\na1, out = forward([0.5, -0.2])\nprint("hidden:", [round(v, 3) for v in a1])\nprint("output:", round(out, 3))`,
              },
            ],
            resources: [DOC('PyTorch — Learn the Basics', 'https://pytorch.org/tutorials/beginner/basics/intro.html', 'pytorch.org')],
          },
          {
            slug: 'backpropagation',
            title: 'Backpropagation, Derived Once',
            kind: 'code',
            minutes: 32,
            objectives: ['Apply the chain rule through layers', 'Know what each gradient means', 'Implement a training step'],
            body: `## The chain rule, layer by layer

For a network \`x → W1 → relu → W2 → loss\`, the gradient of the loss with respect to \`W1\` is the product of local derivatives along the path back.

\`\`\`
dL/dW2 = a1^T · dL/dz2
dL/da1 = dL/dz2 · W2^T
dL/dz1 = dL/da1 · relu'(z1)     (1 if z1 > 0 else 0)
dL/dW1 = x^T · dL/dz1
\`\`\`

Backpropagation is nothing more than this, executed from the output backwards with cached forward values.

## One training step

\`\`\`python
pred = forward(x)
loss = mse(pred, y)
grads = backward(cache, loss)
for p in params: p -= lr * grad[p]
\`\`\`

## Why gradients vanish

Repeated multiplication of small derivatives (sigmoid' ≤ 0.25) shrinks the gradient geometrically. Fixes: ReLU, residual connections, normalisation, and smaller depth with wider layers.

## Why gradients explode

The opposite: large weights multiply. Fixes: weight initialisation (He/Xavier), gradient clipping, lower learning rate.`,
            code: [
              {
                language: 'python',
                caption: 'A full training loop by hand (XOR)',
                source: `import random, math\nrandom.seed(3)\n\nX = [[0, 0], [0, 1], [1, 0], [1, 1]]\nY = [0, 1, 1, 0]\n\nw1 = [random.uniform(-1, 1), random.uniform(-1, 1)]\nb1 = 0.0\nw2 = random.uniform(-1, 1)\nb2 = 0.0\nlr = 0.5\n\ndef sigmoid(z):\n    return 1 / (1 + math.exp(-z))\n\nfor epoch in range(6000):\n    for x, y in zip(X, Y):\n        h = sigmoid(x[0] * w1[0] + x[1] * w1[1] + b1)\n        o = sigmoid(h * w2 + b2)\n        d_out = (o - y) * o * (1 - o)\n        d_h = d_out * w2 * h * (1 - h)\n        w2 -= lr * d_out * h\n        b2 -= lr * d_out\n        for i in range(2):\n            w1[i] -= lr * d_h * x[i]\n        b1 -= lr * d_h\n\nprint([round(sigmoid(sigmoid(x[0]*w1[0] + x[1]*w1[1] + b1) * w2 + b2), 3) for x in X])`,
              },
            ],
            resources: [DOC('PyTorch — Autograd mechanics', 'https://pytorch.org/docs/stable/notes/autograd.html', 'pytorch.org')],
          },
        ],
      },
      {
        slug: 'architectures',
        title: 'Architectures',
        summary: 'CNNs, sequences, attention, transfer learning.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'cnns',
            title: 'Convolutional Networks',
            kind: 'reading',
            minutes: 26,
            objectives: ['Explain parameter sharing and receptive fields', 'Compute output shapes', 'Know when a CNN is the wrong tool'],
            body: `## Why convolution

A dense layer on a 224×224×3 image has 150k inputs per neuron — far too many parameters, and it ignores that nearby pixels are related. A convolution slides a small kernel (3×3) across the image, sharing weights across all positions.

Consequences: far fewer parameters, translation equivariance, and local feature detection that stacks into hierarchical features (edges → textures → parts → objects).

## Output shape

\`\`\`
out = floor((in + 2·padding - kernel) / stride) + 1
\`\`\`

For 32×32 input, 3×3 kernel, padding 1, stride 1 → 32×32. Pooling by 2 halves it.

## Design pattern

\`\`\`
conv → norm → activation → (pool)  ... repeat ... → global average pool → linear head
\`\`\`

Global average pooling replaces giant dense layers and dramatically reduces parameters.

## When not to use a CNN

Tabular data (trees usually win), sequences where order is long-range (transformers), or tiny datasets where transfer learning from a pretrained backbone is far better than training from scratch.`,
            code: [
              {
                language: 'python',
                caption: 'Convolution and output shapes',
                source: `def conv2d(img, kernel, stride=1, pad=0):\n    h, w = len(img), len(img[0])\n    kh, kw = len(kernel), len(kernel[0])\n    ph, pw = h + 2 * pad, w + 2 * pad\n    padded = [[0.0] * pw for _ in range(ph)]\n    for i in range(h):\n        for j in range(w):\n            padded[i + pad][j + pad] = img[i][j]\n    oh, ow = (ph - kh) // stride + 1, (pw - kw) // stride + 1\n    out = [[0.0] * ow for _ in range(oh)]\n    for i in range(oh):\n        for j in range(ow):\n            s = 0.0\n            for ki in range(kh):\n                for kj in range(kw):\n                    s += padded[i * stride + ki][j * stride + kj] * kernel[ki][kj]\n            out[i][j] = s\n    return out\n\nimg = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]\nedge = [[1, 0, -1], [1, 0, -1], [1, 0, -1]]\nres = conv2d(img, edge)\nprint("shape:", len(res), "x", len(res[0]))\nfor row in res:\n    print([round(v, 1) for v in row])`,
              },
            ],
            resources: [DOC('PyTorch — Conv2d', 'https://pytorch.org/docs/stable/generated/torch.nn.Conv2d.html', 'pytorch.org')],
          },
          {
            slug: 'transfer-learning',
            title: 'Transfer Learning and Fine-Tuning',
            kind: 'reading',
            minutes: 24,
            objectives: ['Decide what to freeze', 'Avoid catastrophic forgetting', 'Use augmentation instead of more data'],
            body: `## The default strategy

A pretrained backbone already knows edges, textures and shapes. Replace the head, train it while the backbone is frozen, then unfreeze the last block or two with a much smaller learning rate.

\`\`\`python
for p in backbone.parameters():
    p.requires_grad = False
head = nn.Linear(backbone.out_features, num_classes)   # train this
# later:
for p in list(backbone.parameters())[-k:]:
    p.requires_grad = True                              # lr / 10
\`\`\`

## Catastrophic forgetting

Fine-tuning everything at a high learning rate destroys pretrained features. Symptoms: training loss drops fast, validation degrades. Fixes: lower learning rate, unfreeze gradually, keep augmentation on.

## Augmentation beats architecture

For small datasets, flips, crops, colour jitter and mixup usually add more accuracy than a bigger model. But keep augmentations label-preserving: a horizontal flip breaks digit classification.

## Honest reporting

State the pretraining dataset, the frozen/fine-tuned split, and the exact augmentation. "Transfer learning gets 94 %" is not reproducible without those three.`,
            code: [
              {
                language: 'python',
                caption: 'Freeze-then-unfreeze schedule (pseudo-PyTorch)',
                source: `class Param:\n    def __init__(self, name, layer):\n        self.name, self.layer, self.requires_grad = name, layer, True\n\nparams = [Param(f"block{i}.w", i) for i in range(4)] + [Param("head.w", 99)]\n\ndef freeze(ps, upto):\n    for p in ps:\n        p.requires_grad = p.layer > upto\n\nfreeze(params, upto=3)\nprint("stage 1:", [(p.name, p.requires_grad) for p in params])\nfreeze(params, upto=1)\nprint("stage 2:", [(p.name, p.requires_grad) for p in params])`,
              },
            ],
            resources: [DOC('PyTorch — Transfer learning tutorial', 'https://pytorch.org/tutorials/beginner/transfer_learning_tutorial.html', 'pytorch.org')],
          },
        ],
      },
      {
        slug: 'training-at-scale',
        title: 'Training & Deployment',
        summary: 'Regularisation, scheduling, GPU, serving, the capstone.',
        level: 'advanced',
        lessons: [
          {
            slug: 'training-recipes',
            title: 'Recipes for Training That Converges',
            kind: 'reading',
            minutes: 26,
            objectives: ['Diagnose loss curves', 'Use schedulers and clipping', 'Reproduce a run'],
            body: `## Read the loss curve

| Pattern | Meaning | Action |
|---|---|---|
| flat high loss | learning rate too low or broken data | raise lr, check labels |
| NaN / inf | lr too high, exploding gradients | lower lr, clip gradients |
| train ↓ val ↑ | overfitting | regularise, augment, early stop |
| both ↓ slowly | underfitting | more capacity, better features |
| spiky | batch too small / lr too high | increase batch or warm up |

## The standard recipe

1. AdamW, lr 3e-4, cosine decay with warmup.
2. Weight decay 0.01 (AdamW applies it correctly, unlike Adam+L2).
3. Gradient clipping at norm 1.0.
4. Early stopping on validation loss, patience 3.
5. Fixed seed; log config with the run.

## Reproducibility

Save: seed, data version, hyperparameters, library versions, hardware. Without them a good result cannot be repeated — and cannot be trusted.

## Compute honesty

Measure GPU-hours. If a result needs 10 GPU-hours you cannot afford to iterate blindly; write the experiment plan first.`,
            code: [
              {
                language: 'python',
                caption: 'Cosine schedule with warmup',
                source: `import math\n\ndef lr_at(step, base=3e-4, warmup=100, total=1000):\n    if step < warmup:\n        return base * step / warmup\n    progress = (step - warmup) / max(1, total - warmup)\n    return base * 0.5 * (1 + math.cos(math.pi * progress))\n\nfor s in (0, 50, 100, 300, 600, 1000):\n    print(s, f"{lr_at(s):.2e}")`,
              },
            ],
            resources: [DOC('PyTorch — Performance tuning guide', 'https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html', 'pytorch.org')],
          },
          {
            slug: 'dl-capstone',
            title: 'Capstone: Train, Evaluate, Serve',
            kind: 'project',
            minutes: 45,
            objectives: ['Train a small model end to end', 'Export it', 'Serve it with a real health check'],
            body: `## Brief

Train an image or text classifier on a small public dataset:

1. Baseline: logistic regression on flattened features.
2. Model: small CNN or fine-tuned backbone.
3. Report: accuracy, per-class recall, confusion matrix, training curves.
4. Export the model weights and a preprocessing spec.
5. Serve it behind a single endpoint with: input size validation, a 2 s inference timeout, and a health check that actually runs a dummy inference.

## Completion criteria

- Baseline vs model table with numbers.
- Preprocessing identical at train and serve time (this is where most deployments break).
- Model card: dataset, metrics, limitations, intended use.
- Reproducible command documented in the README.

## GPU note

The Lumen lab reports whether GPU acceleration is available. If it is not, use a small model and say so in your report — never claim GPU timings you did not measure.`,
            code: [
              {
                language: 'python',
                caption: 'Serve-time preprocessing parity check',
                source: `def preprocess(img, size=32):\n    # single definition used by BOTH training and serving\n    return [v / 255.0 for v in img[:size]]\n\ntrain_sample = [0, 128, 255]\nprint("train:", preprocess(train_sample))\nprint("serve:", preprocess(train_sample))\nassert preprocess(train_sample) == preprocess(train_sample)\nprint("parity ok")`,
              },
            ],
            resources: [DOC('PyTorch — Saving and loading models', 'https://pytorch.org/tutorials/beginner/saving_loading_models.html', 'pytorch.org')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Deep Learning Foundations Check',
        moduleSlug: 'neural-networks',
        passScore: 70,
        timeLimitMinutes: 8,
        questions: [
          {
            prompt: 'Why is a non-linear activation required between layers?',
            options: ['To speed up training', 'Without it, stacked layers collapse into a single linear transformation', 'To prevent overfitting', 'To normalise inputs'],
            correct: 1,
            explanation: 'Compositions of linear maps are linear; non-linearity is what gives depth its expressive power.',
          },
          {
            prompt: 'Vanishing gradients are most associated with:',
            options: ['ReLU activations', 'Repeated multiplication of small derivatives through many layers', 'Large batch sizes', 'Global average pooling'],
            correct: 1,
            explanation: 'Saturating activations with derivatives ≤ 0.25 shrink gradients geometrically with depth.',
          },
          {
            prompt: 'In a CNN, parameter sharing means:',
            options: ['Weights are shared across all training examples', 'The same kernel is applied at every spatial position', 'Batch normalisation reuses statistics', 'Gradients are averaged'],
            correct: 1,
            explanation: 'A single kernel slides across the image, drastically reducing parameters and giving translation equivariance.',
          },
          {
            prompt: 'Train loss falls while validation loss rises. The standard response is:',
            options: ['Train longer', 'Regularise, augment or early-stop', 'Increase learning rate', 'Remove normalisation'],
            correct: 1,
            explanation: 'That curve shape is overfitting; reduce capacity or improve generalisation.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'dl-digit-classifier',
        title: 'Digit Classifier with Serving',
        difficulty: 'intermediate',
        estHours: 10,
        brief:
          'Train a CNN on a small digit dataset, export it, and serve predictions with input validation and a health check that performs a dummy inference. Document baseline vs model accuracy and the preprocessing spec.',
      },
    ],
    exercises: [
      {
        slug: 'dl-conv-output-size',
        title: 'Convolution output size',
        difficulty: 'easy',
        prompt:
          'Read four integers `in kernel stride padding` and print the output size using floor((in + 2*padding - kernel)/stride) + 1.',
        starter: 'inp, k, s, p = map(int, input().split())\n# your code here\n',
        solution: 'inp, k, s, p = map(int, input().split())\nprint((inp + 2 * p - k) // s + 1)\n',
        tests: [
          { input: '32 3 1 1\n', expected: '32' },
          { input: '28 5 2 0\n', expected: '12' },
        ],
      },
    ],
  },
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity',
    tagline: 'Think like an attacker, build like a defender.',
    category: 'Security',
    icon: 'shield',
    level: 'Beginner → Advanced',
    durationHours: 46,
    outcomes: [
      'Explain the OWASP Top 10 with concrete examples',
      'Implement authentication, session and input defences',
      'Harden headers, secrets and dependency supply chains',
      'Run a structured security review of your own app',
    ],
    prereqs: ['Web fundamentals', 'Basic networking concepts'],
    description:
      'Security is a set of habits applied consistently, not a product you buy. This course covers the vulnerabilities that actually appear in student and startup projects, with defences implemented rather than described. All labs are on your own code — never on systems you do not own.',
    modules: [
      {
        slug: 'threat-model',
        title: 'Threat Modelling',
        summary: 'Assets, attackers, STRIDE, the security mindset.',
        level: 'beginner',
        lessons: [
          {
            slug: 'threat-modelling',
            title: 'Threat Modelling in One Sitting',
            kind: 'reading',
            minutes: 24,
            objectives: ['Enumerate assets and trust boundaries', 'Apply STRIDE to a data flow', 'Prioritise by likelihood × impact'],
            body: `## Four questions

1. What are we building? (data-flow diagram)
2. What can go wrong? (STRIDE)
3. What are we going to do about it? (controls)
4. Did we do a good job? (test and review)

## STRIDE

| Threat | Example in a learning app |
|---|---|
| **S**poofing | stolen session cookie |
| **T**ampering | editing a hidden field to change your score |
| **R**epudiation | no audit log of moderation actions |
| **I**nformation disclosure | another student's email in an API response |
| **D**enial of service | unbounded code execution |
| **E**levation of privilege | student hitting an admin route |

## Trust boundaries

Draw a line wherever data crosses from lower to higher trust: browser → server, server → database, server → sandbox, model output → tool execution. **Every boundary needs a validation.**

## Prioritise

Score each finding by likelihood × impact. A missing rate limit on login (likely, moderate) may outrank a theoretical attack requiring local access. Fix the boring, real problems first.`,
            code: [
              {
                language: 'python',
                caption: 'A tiny risk register',
                source: `findings = [\n    {"name": "No rate limit on login", "likelihood": 4, "impact": 3},\n    {"name": "Score editable client-side", "likelihood": 5, "impact": 4},\n    {"name": "Verbose stack traces", "likelihood": 3, "impact": 2},\n    {"name": "No audit log", "likelihood": 2, "impact": 3},\n]\n\nfor f in sorted(findings, key=lambda f: -(f["likelihood"] * f["impact"])):\n    print(f"{f['likelihood'] * f['impact']:>2}  {f['name']}")`,
              },
            ],
            resources: [DOC('OWASP — Threat Modeling Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html', 'OWASP')],
          },
          {
            slug: 'owasp-top10',
            title: 'The OWASP Top 10, Concretely',
            kind: 'reading',
            minutes: 30,
            objectives: ['Recognise each category in real code', 'Name the primary defence', 'Know which are preventable by design'],
            body: `## The categories that hit web apps

1. **Broken access control** — the most common. You check login but not ownership. Defence: authorise on every request, server-side, per resource.
2. **Cryptographic failures** — plaintext passwords, no HTTPS, weak hashing. Defence: scrypt/bcrypt/argon2, TLS everywhere, no secrets in the client.
3. **Injection** — SQL, shell, template. Defence: parameterised queries, no string-built SQL, escape at the boundary.
4. **Insecure design** — password reset without expiry, unlimited code execution. Defence: threat model first.
5. **Security misconfiguration** — debug mode in production, default credentials, directory listing.
6. **Vulnerable components** — an old library with a known CVE. Defence: dependency scanning and regular updates.
7. **Authentication failures** — no lockout, weak reset flow, session not revoked on logout.
8. **Data integrity failures** — unsigned updates, untrusted deserialisation.
9. **Logging failures** — no record of failed logins, or logs full of passwords.
10. **SSRF** — the server fetches a URL the user supplied, reaching internal services.

## The one-sentence rule

**Every input is untrusted, every request is unauthorised until proven otherwise, and every secret is server-side.**`,
            code: [
              {
                language: 'python',
                caption: 'Injection: vulnerable vs safe',
                source: `users = {"alice": "admin", "bob": "student"}\n\n# ✗ never build SQL by concatenation\nusername = "alice' OR '1'='1"\nbad_sql = f"SELECT * FROM users WHERE name = '{username}'"\nprint("built:", bad_sql)\n\n# ✓ parameterised — the value is data, never code\nquery = "SELECT * FROM users WHERE name = ?"\nprint("parameterised:", query, "|", (username,))\n\nimport shlex\nprint(shlex.split("echo 'alice OR 1=1'"))`,
              },
            ],
            resources: [DOC('OWASP Top 10', 'https://owasp.org/www-project-top-ten/', 'OWASP')],
          },
        ],
      },
      {
        slug: 'appsec-controls',
        title: 'Application Controls',
        summary: 'Auth, sessions, input, output, headers.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'auth-controls',
            title: 'Authentication and Session Hardening',
            kind: 'reading',
            minutes: 26,
            objectives: ['Implement login throttling and lockout safely', 'Rotate sessions on privilege change', 'Design a safe reset flow'],
            body: `## Login

- Hash with a slow KDF (scrypt/bcrypt/argon2), unique salt per user.
- Compare in constant time.
- Same error message for unknown user and wrong password.
- Rate limit per IP **and** per account; exponential backoff.
- Never log the password or the hash.

## Sessions

- Random 256-bit token; store only its hash.
- \`HttpOnly\`, \`Secure\`, \`SameSite=Lax\`.
- Rotate on login and on privilege change (prevents fixation).
- Absolute expiry plus idle expiry.
- "Log out everywhere" must actually revoke.

## Password reset

Single-use, hashed at rest, short TTL, invalidate on use, revoke all sessions, and never reveal whether the email exists. Reset links are bearer tokens — treat them like passwords.

## Multi-factor, cheaply

TOTP is a standard, dependency-light second factor. Offer it; do not require it to learn.`,
            code: [
              {
                language: 'python',
                caption: 'Backoff that resists brute force without locking out users forever',
                source: `def delay_seconds(failed_attempts: int) -> int:\n    if failed_attempts <= 3:\n        return 0\n    return min(300, 2 ** (failed_attempts - 3))\n\nfor n in range(0, 10):\n    print(f"{n} failures -> wait {delay_seconds(n)}s")`,
              },
            ],
            resources: [DOC('OWASP — Authentication Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html', 'OWASP')],
          },
          {
            slug: 'input-output',
            title: 'Input Validation and Output Encoding',
            kind: 'reading',
            minutes: 24,
            objectives: ['Validate by allow-list', 'Encode for the right context', 'Stop XSS and SSRF'],
            body: `## Allow-list, not deny-list

\`\`\`python
import re
SLUG = re.compile(r"^[a-z0-9-]{1,64}$")
if not SLUG.match(course_slug):
    raise ValueError("invalid slug")
\`\`\`

Deny-lists always miss a variant. Allow-lists fail closed.

## Contextual output encoding

HTML text ≠ HTML attribute ≠ JavaScript ≠ URL ≠ SQL. React escapes text by default; \`dangerouslySetInnerHTML\` removes that protection. If you must render markdown, sanitise with an allow-list of tags.

## Content Security Policy

\`\`\`
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'
\`\`\`

A CSP turns a successful XSS into a much smaller problem.

## SSRF

Any feature that fetches a user-supplied URL must: allow-list hosts, block private IP ranges (10/8, 172.16/12, 192.168/16, 169.254/16, ::1), and never follow redirects into internal space.`,
            code: [
              {
                language: 'python',
                caption: 'SSRF guard',
                source: `from urllib.parse import urlparse\n\nALLOWED = {"api.github.com", "docs.python.org"}\n\ndef safe_url(url: str) -> bool:\n    u = urlparse(url)\n    return u.scheme == "https" and u.hostname in ALLOWED\n\nfor url in ["https://api.github.com/repos", "http://169.254.169.254/latest/meta-data", "https://evil.example"]:\n    print(safe_url(url), url)`,
              },
            ],
            resources: [DOC('OWASP — XSS Prevention Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html', 'OWASP')],
          },
        ],
      },
      {
        slug: 'defence-in-depth',
        title: 'Defence in Depth',
        summary: 'Headers, secrets, dependencies, logging, the capstone audit.',
        level: 'advanced',
        lessons: [
          {
            slug: 'hardening',
            title: 'Hardening a Deployment',
            kind: 'reading',
            minutes: 26,
            objectives: ['Set the headers that matter', 'Manage secrets properly', 'Keep dependencies current'],
            body: `## Headers worth setting

\`\`\`
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Permissions-Policy: geolocation=(), camera=()
\`\`\`

## Secrets

- Environment variables or a secret manager; never in the repository, never in the bundle.
- Different secrets per environment.
- Rotate on staff change and on any suspicion.
- Verify: \`grep -ri "api_key" dist/\` must return nothing.

## Dependencies

\`npm audit\` / \`pip-audit\` in CI; pin versions; update deliberately with tests. A known CVE in an unused code path is low risk — in an exposed path it is urgent.

## Logging without leaking

Log: auth successes/failures, authorisation denials, admin actions, validation failures. Never log passwords, tokens, full card numbers or session cookies. Include a request id so a user report can be traced.`,
            code: [
              {
                language: 'bash',
                caption: 'Pre-deploy checks',
                source: `# secrets in the built bundle\n! grep -ri "api_key\\|secret" dist/ && echo "bundle clean"\n# dependency audit\nnpm audit --omit=dev --audit-level=high\n# verify headers\ncurl -sI https://your-app.example | grep -i "strict-transport\\|content-security"`,
              },
            ],
            resources: [DOC('OWASP — Secure Headers Project', 'https://owasp.org/www-project-secure-headers/', 'OWASP')],
          },
          {
            slug: 'security-capstone',
            title: 'Capstone: Audit Your Own Application',
            kind: 'project',
            minutes: 45,
            objectives: ['Produce a real security review', 'Demonstrate three exploitable issues and their fixes', 'Write remediation with tests'],
            body: `## Brief

Audit an application you built (Lumen itself is a valid target — read the code, do not attack the hosted service).

1. Data-flow diagram with trust boundaries.
2. STRIDE table with at least 8 entries.
3. Three findings you can **demonstrate** on your own copy, each with: reproduction steps, impact, severity, fix.
4. A regression test for each fix.
5. A one-page summary for a non-technical reader.

## Suggested targets

- Missing ownership check on a progress or notes endpoint.
- Session not revoked on password change.
- No rate limit on the reset endpoint.
- Verbose error responses leaking stack traces.
- A page rendering unsanitised user markdown.

## Rules of engagement

Only your own systems, only local copies. Never test against infrastructure you do not own — that is a crime in most jurisdictions regardless of intent.

## Completion criteria

- Every finding reproducible from the written steps.
- Every fix has a test that fails before and passes after.
- Severity justified by likelihood × impact, not by vibes.`,
            code: [
              {
                language: 'python',
                caption: 'Writing a failing-then-passing auth test',
                source: `def check_ownership(user_id, note_owner_id):\n    return user_id == note_owner_id\n\n# before the fix: no check at all\nprint("before fix (vulnerable):", "any user can read any note")\n\n# the regression test\nfor user, owner, expected in [(1, 1, True), (2, 1, False)]:\n    got = check_ownership(user, owner)\n    assert got == expected, (user, owner)\nprint("after fix: ownership enforced for all cases")`,
              },
            ],
            resources: [DOC('OWASP — Web Security Testing Guide', 'https://owasp.org/www-project-web-security-testing-guide/', 'OWASP')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Security Fundamentals Check',
        moduleSlug: 'threat-model',
        passScore: 70,
        timeLimitMinutes: 8,
        questions: [
          {
            prompt: 'The most common web vulnerability class is:',
            options: ['SQL injection', 'Broken access control', 'Buffer overflow', 'DNS poisoning'],
            correct: 1,
            explanation: 'Missing server-side authorisation (checking login but not ownership/permission) is consistently the top category.',
          },
          {
            prompt: 'Which is a valid defence against SQL injection?',
            options: ['Escaping quotes manually', 'Parameterised queries', 'Hiding the SQL in the client', 'Using a longer table prefix'],
            correct: 1,
            explanation: 'Parameterisation keeps data out of the query structure entirely.',
          },
          {
            prompt: 'HttpOnly on a session cookie protects against:',
            options: ['CSRF', 'XSS reading the cookie', 'Session fixation', 'Brute force'],
            correct: 1,
            explanation: 'JavaScript cannot read an HttpOnly cookie, so injected scripts cannot exfiltrate the session.',
          },
          {
            prompt: 'A user-supplied URL fetched by the server can enable:',
            options: ['SSRF', 'XSS', 'SQL injection', 'CSRF'],
            correct: 0,
            explanation: 'Server-side request forgery lets an attacker reach internal services through your server.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'security-audit-report',
        title: 'Security Review of Your Own App',
        difficulty: 'advanced',
        estHours: 8,
        brief:
          'Produce the capstone audit: data-flow diagram, STRIDE table, three demonstrated findings with fixes and regression tests, plus a non-technical summary.',
      },
    ],
    exercises: [
      {
        slug: 'sec-slug-validator',
        title: 'Allow-list validator',
        difficulty: 'easy',
        prompt:
          'Read a line. Print `valid` if it matches ^[a-z0-9-]{1,64}$ (lowercase letters, digits, hyphens, length 1-64), else `invalid`.',
        starter: 'value = input().strip()\n# your code here\n',
        solution: 'import re\nvalue = input().strip()\nprint("valid" if re.fullmatch(r"[a-z0-9-]{1,64}", value) else "invalid")\n',
        tests: [
          { input: 'python-programming\n', expected: 'valid' },
          { input: 'Python Programming\n', expected: 'invalid' },
          { input: "a' OR '1'='1\n", expected: 'invalid' },
        ],
      },
    ],
  },
  {
    slug: 'cloud-devops',
    title: 'Cloud Computing & DevOps',
    tagline: 'Ship safely, repeatedly, and know when it breaks.',
    category: 'Infrastructure',
    icon: 'cloud',
    level: 'Beginner → Advanced',
    durationHours: 50,
    outcomes: [
      'Explain compute, storage and network primitives',
      'Containerise an application and run it consistently',
      'Build a CI/CD pipeline with tests and rollback',
      'Instrument logs, metrics and alerts that page nobody needlessly',
    ],
    prereqs: ['Linux command line basics', 'Git', 'One application you can deploy'],
    description:
      'Cloud is rented infrastructure with a control plane; DevOps is the practice of making change safe. This course covers the primitives, then containers, pipelines and observability — with cost awareness throughout.',
    modules: [
      {
        slug: 'cloud-primitives',
        title: 'Cloud Primitives',
        summary: 'Compute, storage, networking, IAM, cost.',
        level: 'beginner',
        lessons: [
          {
            slug: 'cloud-model',
            title: 'The Cloud Model and Its Trade-offs',
            kind: 'reading',
            minutes: 24,
            objectives: ['Distinguish IaaS, PaaS, FaaS', 'Map a workload to a primitive', 'Estimate cost before deploying'],
            body: `## Three shapes

| Model | You manage | Example fit |
|---|---|---|
| IaaS (VMs) | OS, runtime, app | legacy, full control |
| PaaS (managed runtime) | app + config | most web apps |
| FaaS (functions) | a function | spiky, small tasks |

Serverless is not automatically cheaper: at steady high load, reserved compute wins. At near-zero load, FaaS wins. Model the traffic before choosing.

## Storage classes

Object storage for blobs (cheap, eventual consistency), block storage for a database volume, managed database for anything relational. Never run a database on ephemeral instance storage.

## Networking

Regions and zones: deploy across at least two zones. Security groups are the firewall; default-deny inbound, then open the minimum.

## IAM

Least privilege, roles not long-lived keys, separate identities per environment. A leaked long-lived access key is the most common cloud breach vector.

## Cost

Tag every resource with owner and environment. Untagged resources are the ones that quietly bill for months. Set a budget alert on day one.`,
            code: [
              {
                language: 'python',
                caption: 'Compare monthly compute cost',
                source: `def monthly_vm(hours=730, rate=0.02):\n    return hours * rate\n\ndef monthly_faas(requests, ms, mem_gb=0.5, rate_per_gb_s=0.0000166667):\n    return requests * (ms / 1000) * mem_gb * rate_per_gb_s\n\nvm = monthly_vm()\nprint("always-on VM: $" + str(round(vm, 2)) + "/mo")\nfor r in (10_000, 500_000, 5_000_000):\n    print("FaaS @", r, "req: $" + str(round(monthly_faas(r, 200), 2)) + "/mo")

print("break-even requests/mo:", round(monthly_vm() / (200 / 1000 * 0.5 * 0.0000166667)))`,
              },
              {
                language: 'bash',
                caption: 'A container build you can reproduce',
                source: `# Dockerfile — one stage, one purpose\nFROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nENV NODE_ENV=production\nUSER node\nEXPOSE 3000\nHEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/healthz || exit 1\nCMD ["node", "server/index.js"]\n\n# build and run (tag by commit so a rollback target always exists)\nTAG=$(git rev-parse --short HEAD)\ndocker build -t lumen:$TAG .\ndocker run --rm -p 3000:3000 --env-file .env lumen:$TAG`,
              },
            ],
            resources: [DOC('AWS — Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', 'AWS')],
          },
          {
            slug: 'linux-basics',
            title: 'Linux for Deployments',
            kind: 'reading',
            minutes: 24,
            objectives: ['Navigate and inspect a server', 'Manage services and logs', 'Understand permissions'],
            body: `## The twenty commands you actually use

\`\`\`bash
ls -la        pwd           cd            du -sh *
ps aux        top           kill -TERM    systemctl status app
journalctl -u app -n 100   tail -f app.log
ss -tulpn     curl -I localhost:3000
chmod 640 .env             chown app:app .env
df -h         free -m       uptime
\`\`\`

## Permissions in one table

\`\`\`
rwx = 4+2+1
600 → owner read/write, nobody else
644 → owner write, everyone read (files)
755 → owner write, everyone execute (dirs)
\`\`\`

Secrets files should be \`600\`, owned by the service user.

## Processes and signals

\`SIGTERM\` asks politely — handle it to finish in-flight requests. \`SIGKILL\` cannot be caught and loses work. Always stop with TERM first, wait, then KILL.

## Logs

Application logs to stdout, collected by the platform. Rotation is the platform's job — do not write unbounded files inside the container.`,
            code: [
              {
                language: 'bash',
                caption: 'Triage a failing service',
                source: `systemctl status app --no-pager\njournalctl -u app -n 50 --no-pager | tail -20\nss -tulpn | grep 3000\ncurl -sS -o /dev/null -w "%{http_code}\\n" http://localhost:3000/api/health\ndf -h /`,
              },
            ],
            resources: [DOC('The Linux Command Line (free book)', 'https://linuxcommand.org/tlcl.php', 'linuxcommand.org')],
          },
        ],
      },
      {
        slug: 'containers',
        title: 'Containers',
        summary: 'Images, layers, Dockerfiles, compose.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'docker-essentials',
            title: 'Docker Without Mysticism',
            kind: 'reading',
            minutes: 26,
            objectives: ['Explain images vs containers', 'Write a small, cache-friendly Dockerfile', 'Run a local stack with compose'],
            body: `## Image and container

An **image** is an immutable stack of layers (filesystem + metadata). A **container** is a running process with that filesystem, its own network namespace and its own PID namespace. Containers are not VMs: they share the host kernel.

## A good Node Dockerfile

\`\`\`dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev          # cached until package files change
COPY . .
USER node                       # never run as root
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
\`\`\`

Order matters: dependencies first, source second. Layer caching then skips the slow install on code-only changes.

## Compose for local development

\`\`\`yaml
services:
  app:
    build: .
    ports: ["4180:4180"]
    env_file: .env
    depends_on: [db]
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devonly
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes: { pgdata: {} }
\`\`\`

## Hygiene

Small base images (alpine/distroless), \`.dockerignore\` (never copy \`.env\` or \`node_modules\`), no secrets in layers (they persist in history), non-root user.`,
            code: [
              {
                language: 'bash',
                caption: 'Build, run, inspect',
                source: `docker build -t lumen:local .\ndocker run --rm -p 4180:4180 --env-file .env lumen:local\ndocker images lumen:local\ndocker stats --no-stream\ndocker exec -it $(docker ps -q --filter ancestor=lumen:local) sh`,
              },
            ],
            resources: [DOC('Docker — Get started', 'https://docs.docker.com/get-started/', 'docker.com')],
          },
        ],
      },
      {
        slug: 'pipelines',
        title: 'Pipelines & Observability',
        summary: 'CI/CD, environments, logging, metrics, alerts.',
        level: 'intermediate',
        lessons: [
          {
            slug: 'ci-cd',
            title: 'A Pipeline That Earns Its Keep',
            kind: 'reading',
            minutes: 26,
            objectives: ['Order pipeline stages by cost', 'Make deployments reversible', 'Gate on tests, not on hope'],
            body: `## Stage order: cheapest and most likely to fail first

\`\`\`
lint → typecheck → unit tests → build → integration tests → deploy staging → smoke → deploy prod
\`\`\`

## Every deploy must be reversible

- Immutable artifacts (tag by commit SHA, never \`latest\`).
- Blue/green or rolling with health checks.
- One command to roll back to the previous SHA.
- Database migrations that are backwards compatible (expand → migrate → contract).

## Configuration

Same artifact, different env vars per environment. If staging and production use different builds, you are testing something you will not ship.

## Secrets in CI

Store in the platform's secret store, inject at runtime, never echo. Mask them in logs; a printed secret is a leaked secret.

## Smoke test after deploy

Hit \`/api/health\` and one real user journey. If it fails, roll back automatically — do not wait for a human to notice.`,
            code: [
              {
                language: 'yaml',
                caption: 'A minimal CI workflow',
                source: `name: ci\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 22, cache: npm }\n      - run: npm ci\n      - run: npm run lint --if-present\n      - run: npm test\n      - run: npm run build`,
              },
            ],
            resources: [DOC('GitHub Actions — Quickstart', 'https://docs.github.com/en/actions/quickstart', 'GitHub')],
          },
          {
            slug: 'observability',
            title: 'Logs, Metrics and Alerts That Page Correctly',
            kind: 'reading',
            minutes: 24,
            objectives: ['Log structured events with a request id', 'Choose SLIs and SLOs', 'Avoid alert fatigue'],
            body: `## Structured logs

\`\`\`json
{"level":"info","requestId":"a1b2","route":"POST /api/progress","userId":42,"durationMs":18,"status":200}
\`\`\`

JSON logs are queryable. String logs are grep-and-hope.

## Three signals

- **Logs**: what happened for one request.
- **Metrics**: how the system behaves over time (rate, errors, duration).
- **Traces**: where time went across services.

## SLI / SLO

SLI = a measured ratio ("99.2 % of requests under 300 ms"). SLO = the target ("99 % over 30 days"). Alert on **error budget burn**, not on every spike.

## Alert hygiene

Every alert must be: actionable, urgent, and have a runbook link. If nobody can act, it is a dashboard, not an alert. Review noisy alerts monthly and delete them.

## Health endpoints

A shallow health check (\`200 ok\`) hides database outages. Check dependencies, but keep it fast (< 200 ms) and cache it.`,
            code: [
              {
                language: 'js',
                caption: 'Request logging middleware with timing',
                source: `app.use((req, res, next) => {\n  const id = crypto.randomUUID().slice(0, 8);\n  const start = process.hrtime.bigint();\n  res.setHeader("X-Request-Id", id);\n  res.on("finish", () => {\n    const ms = Number(process.hrtime.bigint() - start) / 1e6;\n    console.log(JSON.stringify({\n      level: res.statusCode >= 500 ? "error" : "info",\n      requestId: id,\n      route: \`\${req.method} \${req.path}\`,\n      status: res.statusCode,\n      durationMs: Math.round(ms),\n      userId: req.user?.id ?? null,\n    }));\n  });\n  next();\n});`,
              },
            ],
            resources: [DOC('Google SRE Book (free)', 'https://sre.google/sre-book/table-of-contents/', 'Google')],
          },
        ],
      },
      {
        slug: 'devops-capstone',
        title: 'Deploy It',
        summary: 'Containerise, pipeline, monitor, roll back.',
        level: 'advanced',
        lessons: [
          {
            slug: 'devops-capstone',
            title: 'Capstone: Ship with a Runbook',
            kind: 'project',
            minutes: 40,
            objectives: ['Deploy a real service', 'Prove rollback works', 'Write the runbook someone needs at 2 a.m.'],
            body: `## Brief

Take any application you built in this platform and make it deployable:

1. Multi-stage Dockerfile, non-root user, \`.dockerignore\`.
2. Compose stack for local development (app + database).
3. CI: lint, test, build, artifact tagged by commit SHA.
4. Health endpoint checking the database.
5. Rollback procedure, executed at least once and documented.
6. Runbook: symptoms → checks → fixes, plus where logs live.

## Completion criteria

- A fresh clone deploys with documented commands only.
- Rolling back to the previous SHA takes under five minutes, measured.
- No secret appears in the image history or the client bundle.
- Cost estimate: monthly figure with the assumptions written down.

## Honest dependency note

If you do not have a cloud account, run the stack locally with Compose and document the production mapping (what becomes managed database, what becomes a load balancer). Do not claim a deployment you did not perform.`,
            code: [
              {
                language: 'bash',
                caption: 'Rollback drill',
                source: `CURRENT=$(git rev-parse --short HEAD); echo "current: $CURRENT"\ndocker image ls lumen --format "{{.Tag}} {{.CreatedSince}}" | head -3\ndocker stop lumen-app && docker rm lumen-app\ndocker run -d --name lumen-app --env-file .env -p 4180:4180 lumen:PREVIOUS_SHA\ncurl -fsS localhost:4180/api/health && echo "rollback verified"`,
              },
            ],
            resources: [DOC('The Twelve-Factor App', 'https://12factor.net/', '12factor.net')],
          },
        ],
      },
    ],
    assessments: [
      {
        title: 'Cloud & DevOps Check',
        moduleSlug: 'cloud-primitives',
        passScore: 70,
        timeLimitMinutes: 8,
        questions: [
          {
            prompt: 'Which is the safest way to give a service access to cloud storage?',
            options: ['A long-lived access key in the repo', 'An attached IAM role with least privilege', 'Root account credentials', 'A key in the client bundle'],
            correct: 1,
            explanation: 'Roles are short-lived and scoped; static keys are the most commonly leaked credential.',
          },
          {
            prompt: 'In a Dockerfile, why copy package.json before the source?',
            options: ['Smaller image', 'Dependency layers stay cached when only source changes', 'Docker requires that order', 'It avoids running as root'],
            correct: 1,
            explanation: 'Layer caching: unchanged dependency layers are reused, so builds are much faster.',
          },
          {
            prompt: 'A backwards-compatible migration strategy is:',
            options: ['Drop and recreate the table', 'Expand, migrate, contract across releases', 'Run migrations manually', 'Skip migrations'],
            correct: 1,
            explanation: 'Adding the new shape first, migrating data, then removing the old shape lets old and new code coexist during rollout.',
          },
          {
            prompt: 'The best alert to page a human is one that is:',
            options: ['Every warning level', 'Actionable, urgent, and tied to an SLO burn', 'Any CPU spike', 'Generated daily by email'],
            correct: 1,
            explanation: 'Alerts must be things a human can and must act on now; everything else belongs on a dashboard.',
          },
        ],
      },
    ],
    projects: [
      {
        slug: 'devops-deploy-pipeline',
        title: 'Containerised Deployment Pipeline',
        difficulty: 'intermediate',
        estHours: 12,
        brief:
          'Containerise an app, add a CI pipeline that tests and builds a SHA-tagged artifact, add health checks, and document a rollback you have actually performed.',
      },
    ],
    exercises: [
      {
        slug: 'devops-dockerfile-order',
        title: 'Dockerfile layer order',
        difficulty: 'easy',
        prompt:
          'Read a number `n`, then n lines each being a Dockerfile instruction. Print the instruction that must come first: if a `COPY . .` line exists, print the line immediately before it; otherwise print the first line.',
        starter: 'n = int(input())\nlines = [input().strip() for _ in range(n)]\n# your code here\n',
        solution:
          'n = int(input())\nlines = [input().strip() for _ in range(n)]\nidx = next((i for i, l in enumerate(lines) if l.startswith("COPY . .")), None)\nprint(lines[idx - 1] if idx else lines[0])\n',
        tests: [
          { input: '3\nFROM node:22\nRUN npm ci\nCOPY . .\n', expected: 'RUN npm ci' },
          { input: '2\nFROM python:3.12\nCOPY . .\n', expected: 'FROM python:3.12' },
        ],
      },
    ],
  },
];
