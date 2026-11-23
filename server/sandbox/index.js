/**
 * Sandboxed code execution.
 *
 * Trust boundary: untrusted student code NEVER runs in the API process.
 *
 * Modes (SANDBOX_MODE):
 *   L0  process  — child_process with scrubbed env, temp cwd, timeouts, output caps.
 *                  Real isolation of environment, NOT of the OS. Suitable for a
 *                  single-user or trusted-classroom deployment.
 *   L1  docker   — one container per run, --network none, --read-only, memory and
 *                  CPU limits, non-root user. Requires SANDBOX_DOCKER_IMAGE.
 *   L2  microvm  — firecracker/gVisor style. Interface present, not implemented here;
 *                  returns a clear error rather than pretending to run.
 *
 * If the configured mode is unavailable, /api/lab/health says so and runs are refused.
 * We never silently fall back to a weaker mode.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MODE = (process.env.SANDBOX_MODE || 'process').toLowerCase();
const DOCKER_IMAGE = process.env.SANDBOX_DOCKER_IMAGE || '';
const MAX_OUTPUT = 16 * 1024;
const DEFAULT_TIMEOUT = 5000;
const MAX_TIMEOUT = 10000;

export const LANGUAGES = {
  python: {
    label: 'Python',
    extension: 'py',
    binary: process.env.PYTHON_BIN || 'python',
    args: (file) => [file],
    versionArgs: ['--version'],
    dockerImage: DOCKER_IMAGE,
  },
  javascript: {
    label: 'JavaScript',
    extension: 'js',
    binary: process.env.NODE_BIN || process.execPath,
    args: (file) => [file],
    versionArgs: ['--version'],
    dockerImage: DOCKER_IMAGE,
  },
  bash: { label: 'Bash', extension: 'sh', binary: 'sh', enabled: false },
};

/**
 * On Windows the launcher "python" may not be on PATH while "py" is, and vice
 * versa. Resolve once, honestly: if neither responds, the language is reported
 * unavailable rather than failing at run time.
 */
async function probeBinary(lang) {
  const candidates = [lang.binary];
  if (process.platform === 'win32' && lang.binary === 'python') candidates.push('py');
  for (const bin of candidates) {
    const ok = await new Promise((resolve) => {
      let child;
      try {
        // Probe with the host PATH: we are checking whether the runtime exists,
        // not what student code will be allowed to see.
        child = spawn(bin, lang.versionArgs || ['--version'], { windowsHide: true, env: process.env });
      } catch {
        resolve(false);
        return;
      }
      const t = setTimeout(() => {
        child.kill('SIGKILL');
        resolve(false);
      }, 4000);
      child.on('error', () => {
        clearTimeout(t);
        resolve(false);
      });
      child.on('close', (code) => {
        clearTimeout(t);
        resolve(code === 0);
      });
    });
    if (ok) return bin;
  }
  return null;
}

/** Absolute path of a verified runtime, or null. Cached per process. */
const resolved = new Map();
async function runtimeFor(id) {
  if (resolved.has(id)) return resolved.get(id);
  const lang = LANGUAGES[id];
  const found = await probeBinary(lang);
  resolved.set(id, found ? absRuntime(found) : null);
  return resolved.get(id);
}

/** Windows cannot spawn a bare name once the scrubbed PATH is in effect; resolve it. */
function absRuntime(bin) {
  if (path.isAbsolute(bin)) return bin;
  const dirs = String(process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, bin + ext);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        /* keep looking */
      }
    }
  }
  return null;
}

/** Environment given to student code: no host secrets, only what a runtime needs. */
const CLEAN_ENV = {
  PATH: process.env.SANDBOX_PATH || (process.platform === 'win32'
    ? `${path.dirname(process.execPath)};${process.env.SystemRoot || 'C:\\Windows'}\\System32`
    : '/usr/local/bin:/usr/bin:/bin'),
  HOME: process.platform === 'win32' ? process.env.TEMP || '.' : '/tmp',
  TMPDIR: process.platform === 'win32' ? process.env.TEMP || '.' : '/tmp',
  LANG: 'C.UTF-8',
  PYTHONIOENCODING: 'utf-8',
  PYTHONDONTWRITEBYTECODE: '1',
  NODE_NO_WARNINGS: '1',
};

function clampTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT;
  return Math.min(n, MAX_TIMEOUT);
}

function truncate(text) {
  if (text.length <= MAX_OUTPUT) return { text, truncated: false };
  return { text: `${text.slice(0, MAX_OUTPUT)}\n… output truncated (${text.length} bytes)`, truncated: true };
}

function runProcess({ file, args, cwd, stdin, timeoutMs }) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let killedFor = null;

    const child = spawn(file, args, {
      cwd,
      env: CLEAN_ENV,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      killedFor = 'timeout';
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (b) => {
      if (stdout.length < MAX_OUTPUT * 2) stdout += b.toString('utf8');
    });
    child.stderr.on('data', (b) => {
      if (stderr.length < MAX_OUTPUT * 2) stderr += b.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: { code: 'sandbox_unavailable', message: `Could not start the runtime: ${err.message}` },
      });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const out = truncate(stdout);
      const err = truncate(stderr);
      resolve({
        ok: true,
        data: {
          stdout: out.text,
          stderr: err.text,
          exitCode: code,
          signal,
          timedOut: killedFor === 'timeout' || signal === 'SIGKILL',
          durationMs: Date.now() - started,
          truncated: out.truncated || err.truncated,
          mode: MODE,
        },
      });
    });

    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
  });
}

async function dockerAvailable() {
  return new Promise((resolve) => {
    const child = spawn('docker', ['version', '--format', '{{.Server.Version}}'], {
      env: { PATH: process.env.PATH },
      windowsHide: true,
    });
    const t = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(false);
    }, 4000);
    child.on('error', () => {
      clearTimeout(t);
      resolve(false);
    });
    child.on('close', (code) => {
      clearTimeout(t);
      resolve(code === 0);
    });
  });
}

function dockerArgs({ dir, file, image, timeoutMs, memoryMb, cpus }) {
  return [
    'run', '--rm', '-i',
    '--network', 'none',
    '--read-only',
    '--tmpfs', '/tmp:rw,size=16m,noexec,nosuid',
    '--memory', `${memoryMb}m`,
    '--memory-swap', `${memoryMb}m`,
    '--cpus', String(cpus),
    '--pids-limit', '64',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--user', '65534:65534',
    '-v', `${dir}:/work:ro`,
    '-w', '/work',
    '--stop-timeout', '1',
    image,
    'sh', '-c', `timeout -s KILL ${Math.ceil(timeoutMs / 1000)} "$0" "$1"`, path.basename(file), path.basename(file),
  ];
}

export async function health() {
  const langs = Object.entries(LANGUAGES)
    .filter(([, v]) => v.enabled !== false)
    .map(([k, v]) => ({ id: k, label: v.label }));

  if (MODE === 'process') {
    const results = {};
    for (const [id, lang] of Object.entries(LANGUAGES)) {
      if (lang.enabled === false) {
        results[id] = { ready: false, reason: 'not enabled in this build' };
        continue;
      }
      const bin = await runtimeFor(id);
      results[id] = bin ? { ready: true } : { ready: false, reason: `${lang.label} runtime not found on this server` };
    }
    return {
      mode: MODE,
      level: 'L0',
      label: 'Process isolation',
      ready: Object.values(results).some((r) => r.ready),
      isolation: 'Separate process, scrubbed environment, temporary working directory, hard time and output limits. Not an OS-level boundary — do not run hostile code in this mode.',
      productionReady: false,
      languages: langs.map((l) => ({ ...l, ...results[l.id] })),
      limits: { timeoutMs: MAX_TIMEOUT, outputBytes: MAX_OUTPUT },
    };
  }

  if (MODE === 'docker') {
    const available = await dockerAvailable();
    const imageReady = Boolean(DOCKER_IMAGE);
    return {
      mode: MODE,
      level: 'L1',
      label: 'Container isolation',
      ready: available && imageReady,
      isolation: 'One container per run: no network, read-only filesystem, dropped capabilities, non-root user, memory/CPU/PID limits.',
      productionReady: available && imageReady,
      reason: !imageReady ? 'SANDBOX_DOCKER_IMAGE is not set' : !available ? 'Docker daemon is not reachable' : undefined,
      image: DOCKER_IMAGE || null,
      languages: langs,
      limits: { timeoutMs: MAX_TIMEOUT, outputBytes: MAX_OUTPUT },
    };
  }

  return {
    mode: MODE,
    level: MODE === 'microvm' ? 'L2' : 'unknown',
    label: 'MicroVM isolation',
    ready: false,
    isolation: 'Hardware-virtualised execution.',
    productionReady: false,
    reason: 'MicroVM execution is not implemented in this build. Set SANDBOX_MODE=docker with SANDBOX_DOCKER_IMAGE, or SANDBOX_MODE=process for trusted use.',
    languages: langs,
    limits: { timeoutMs: MAX_TIMEOUT, outputBytes: MAX_OUTPUT },
  };
}

/**
 * Run source code. Returns the API envelope shape.
 * @param {{language:string, source:string, stdin?:string, timeoutMs?:number}} opts
 */
export async function execute({ language, source, stdin = '', timeoutMs }) {
  const lang = LANGUAGES[language];
  if (!lang) {
    return { ok: false, error: { code: 'unsupported_language', message: `Language "${language}" is not available.` } };
  }
  if (lang.enabled === false) {
    return { ok: false, error: { code: 'unsupported_language', message: `${lang.label} execution is not enabled in this build.` } };
  }
  if (typeof source !== 'string' || !source.trim()) {
    return { ok: false, error: { code: 'empty_source', message: 'There is no code to run.' } };
  }
  if (source.length > 100_000) {
    return { ok: false, error: { code: 'source_too_large', message: 'Code is limited to 100,000 characters.' } };
  }
  if (typeof stdin === 'string' && stdin.length > 20_000) {
    return { ok: false, error: { code: 'stdin_too_large', message: 'Input is limited to 20,000 characters.' } };
  }

  const timeout = clampTimeout(timeoutMs);
  const h = await health();
  if (!h.ready) {
    return {
      ok: false,
      error: {
        code: 'sandbox_unavailable',
        message: h.reason || 'The code sandbox is not available. Configure SANDBOX_MODE and SANDBOX_DOCKER_IMAGE to enable execution.',
      },
    };
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'lumen-run-'));
  const file = path.join(dir, `main.${lang.extension}`);
  try {
    await writeFile(file, source, 'utf8');
    if (MODE === 'docker') {
      return await runProcess({
        file: 'docker',
        args: dockerArgs({ dir, file, image: DOCKER_IMAGE, timeoutMs: timeout, memoryMb: 128, cpus: 0.5 }),
        cwd: dir,
        stdin,
        timeoutMs: timeout + 4000,
      });
    }
    if (MODE !== 'process') {
      return {
        ok: false,
        error: { code: 'sandbox_unavailable', message: `Sandbox mode "${MODE}" is not implemented. Use process or docker.` },
      };
    }
    const bin = await runtimeFor(language);
    if (!bin) {
      return { ok: false, error: { code: 'sandbox_unavailable', message: `${lang.label} runtime is not available on this server.` } };
    }
    return await runProcess({ file: bin, args: lang.args(file), cwd: dir, stdin, timeoutMs: timeout });
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Normalise output for test comparison: CRLF → LF, trim trailing whitespace per line and overall. */
export function normaliseOutput(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Run an exercise's test cases against the submitted code.
 * Each test's `input` is fed to stdin; `expected` is compared with normalised stdout.
 */
export async function runTests({ language, source, tests, timeoutMs }) {
  const results = [];
  let passed = 0;
  for (const test of tests) {
    const r = await execute({ language, source, stdin: test.input ?? '', timeoutMs });
    if (!r.ok) return r;
    const got = normaliseOutput(r.data.stdout);
    const want = normaliseOutput(test.expected);
    const ok = got === want && r.data.exitCode === 0 && !r.data.timedOut;
    if (ok) passed += 1;
    results.push({
      input: test.input ?? '',
      expected: want,
      actual: got,
      passed: ok,
      exitCode: r.data.exitCode,
      timedOut: r.data.timedOut,
      stderr: r.data.stderr,
    });
    if (r.data.timedOut) break;
  }
  return { ok: true, data: { results, passed, total: tests.length, allPassed: passed === tests.length } };
}
