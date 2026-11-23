/** Tiny schema validator — keeps every route's input checked without a dependency. */

export class ValidationError extends Error {
  constructor(fields) {
    super('Validation failed');
    this.code = 'invalid_input';
    this.status = 422;
    this.fields = fields;
  }
}

function checkField(name, value, rule) {
  const label = rule.label || name;
  if (value === undefined || value === null || value === '') {
    if (rule.required) return `${label} is required.`;
    return null;
  }
  if (rule.type === 'string') {
    if (typeof value !== 'string') return `${label} must be text.`;
    const v = value.trim();
    if (rule.min !== undefined && v.length < rule.min) return `${label} must be at least ${rule.min} characters.`;
    if (rule.max !== undefined && v.length > rule.max) return `${label} must be at most ${rule.max} characters.`;
    if (rule.pattern && !rule.pattern.test(v)) return rule.patternMessage || `${label} is not valid.`;
  }
  if (rule.type === 'email') {
    if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim())) return 'Enter a valid email address.';
    if (value.length > 254) return 'Email address is too long.';
  }
  if (rule.type === 'int') {
    const n = Number(value);
    if (!Number.isInteger(n)) return `${label} must be a whole number.`;
    if (rule.min !== undefined && n < rule.min) return `${label} must be at least ${rule.min}.`;
    if (rule.max !== undefined && n > rule.max) return `${label} must be at most ${rule.max}.`;
  }
  if (rule.type === 'bool') {
    if (typeof value !== 'boolean') return `${label} must be true or false.`;
  }
  if (rule.type === 'enum') {
    if (!rule.values.includes(value)) return `${label} must be one of: ${rule.values.join(', ')}.`;
  }
  if (rule.type === 'array') {
    if (!Array.isArray(value)) return `${label} must be a list.`;
    if (rule.max !== undefined && value.length > rule.max) return `${label} must have at most ${rule.max} items.`;
  }
  return null;
}

/** Returns cleaned values (trimmed strings, coerced ints). Throws ValidationError with field map. */
export function validate(input, schema) {
  const source = input && typeof input === 'object' ? input : {};
  const out = {};
  const errors = {};
  for (const [name, rule] of Object.entries(schema)) {
    const raw = source[name];
    const problem = checkField(name, raw, rule);
    if (problem) { errors[name] = problem; continue; }
    if (raw === undefined || raw === null || raw === '') { if (rule.default !== undefined) out[name] = rule.default; continue; }
    if (rule.type === 'string' || rule.type === 'email') out[name] = String(raw).trim();
    else if (rule.type === 'int') out[name] = Math.trunc(Number(raw));
    else if (rule.type === 'bool') out[name] = raw === true || raw === 'true';
    else out[name] = raw;
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}
