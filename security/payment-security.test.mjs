import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  assertNoSqlInjection,
  parseStrictPositiveInt,
  validateUuid,
} = require('../lib/security/inputGuard.js');
const { assertSafeSql, assertParams } = require('../lib/db/safeQuery.js');
const { scoreToCategory, categoryToAction } = require('../payments/risk/riskOrchestrator.js');

describe('SQL injection guard', () => {
  it('rejects UNION SELECT payloads', () => {
    assert.throws(() => assertNoSqlInjection("1' UNION SELECT * FROM users--"), /Rejected/);
  });

  it('rejects stacked queries', () => {
    assert.throws(() => assertNoSqlInjection('x; DROP TABLE users--'), /Rejected/);
  });

  it('parses strict integers only', () => {
    assert.equal(parseStrictPositiveInt('42'), 42);
    assert.throws(() => parseStrictPositiveInt('42abc'), /Invalid/);
    assert.throws(() => parseStrictPositiveInt('1 OR 1=1'), /Invalid|Rejected/);
  });

  it('validates UUID format', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    assert.equal(validateUuid(id), id);
    assert.throws(() => validateUuid('not-a-uuid'), /Invalid/);
  });
});

describe('safeQuery SQL guard', () => {
  it('rejects template literal injection patterns', () => {
    assert.throws(() => assertSafeSql('SELECT * FROM users WHERE id = ${id}'), /parameterized/);
  });

  it('rejects dangerous SQL functions', () => {
    assert.throws(() => assertSafeSql('SELECT SLEEP(10)'), /Forbidden/);
  });

  it('requires array params', () => {
    assert.throws(() => assertParams({ a: 1 }), /array/);
    assert.deepEqual(assertParams([1, 2]), [1, 2]);
  });
});

describe('risk category mapping', () => {
  it('maps scores to categories and actions', () => {
    const t = { critical: 90, high: 75, medium: 50, low: 25 };
    assert.equal(scoreToCategory(95, t), 'CRITICAL');
    assert.equal(categoryToAction('CRITICAL'), 'block');
    assert.equal(categoryToAction('HIGH'), 'hold');
    assert.equal(categoryToAction('MEDIUM'), 'verify');
    assert.equal(categoryToAction('LOW'), 'allow');
  });
});
