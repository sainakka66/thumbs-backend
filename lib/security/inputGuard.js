const { ValidationError } = require('../errors');

const SQL_INJECTION_PATTERNS = [
  /(\bunion\b.+\bselect\b)/i,
  /\bselect\b.+\bfrom\b/i,
  /\binsert\b.+\binto\b/i,
  /\bupdate\b.+\bset\b/i,
  /\bdelete\b.+\bfrom\b/i,
  /\bdrop\b.+\b(table|database)\b/i,
  /\bexec\b\s*\(/i,
  /;\s*--/,
  /\/\*[\s\S]*?\*\//,
  /0x[0-9a-f]{4,}/i,
  /%27|%22|%3B|%2D%2D/i,
];

function assertNoSqlInjection(value, fieldName = 'input') {
  if (value == null) return;
  const str = String(value);
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(str)) {
      throw new ValidationError(`Rejected dangerous ${fieldName}`);
    }
  }
}

function parseStrictInt(value, fieldName = 'id') {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError(`Invalid ${fieldName}`);
    }
    return value;
  }
  const str = String(value).trim();
  assertNoSqlInjection(str, fieldName);
  if (!/^\d+$/.test(str)) throw new ValidationError(`Invalid ${fieldName}`);
  const n = parseInt(str, 10);
  if (!Number.isSafeInteger(n)) throw new ValidationError(`Invalid ${fieldName}`);
  return n;
}

function parseStrictPositiveInt(value, fieldName = 'id') {
  const n = parseStrictInt(value, fieldName);
  if (n == null || n <= 0) throw new ValidationError(`Invalid ${fieldName}`);
  return n;
}

function validateUuid(value, fieldName = 'uuid') {
  const str = String(value || '').trim();
  assertNoSqlInjection(str, fieldName);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
  return str;
}

function sanitizeRequestBody(body, maxDepth = 3) {
  if (!body || typeof body !== 'object') return body;
  const walk = (obj, depth) => {
    if (depth > maxDepth) throw new ValidationError('Payload too deep');
    for (const [k, v] of Object.entries(obj)) {
      assertNoSqlInjection(k, 'field name');
      if (typeof v === 'string') assertNoSqlInjection(v, k);
      else if (typeof v === 'object' && v !== null) walk(v, depth + 1);
    }
  };
  walk(body, 0);
  return body;
}

module.exports = {
  assertNoSqlInjection,
  parseStrictInt,
  parseStrictPositiveInt,
  validateUuid,
  sanitizeRequestBody,
  SQL_INJECTION_PATTERNS,
};
