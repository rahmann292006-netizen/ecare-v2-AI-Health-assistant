import crypto from 'node:crypto';

const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algo, N, r, p, saltB64, hashB64] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Password policy: 10+ chars, not a known-dumb password, some variety. */
export function passwordProblems(password) {
  const problems = [];
  if (typeof password !== 'string' || password.length < 10) problems.push('Use at least 10 characters.');
  if (password && password.length > 200) problems.push('Use fewer than 200 characters.');
  if (password && !/[a-zA-Z]/.test(password)) problems.push('Include at least one letter.');
  if (password && !/[0-9]/.test(password)) problems.push('Include at least one number.');
  if (password && /^(password|12345678|qwerty)/i.test(password)) problems.push('This password is too common.');
  return problems;
}

export function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
