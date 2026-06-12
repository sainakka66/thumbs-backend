const { randomUuid } = require('../utils/crypto');

const SYSTEM_ACTOR = Object.freeze({
  actorUserId: null,
  roleSlug: 'SYSTEM',
  permissions: new Set(['system.internal']),
  eventSource: 'SYSTEM',
});

function systemCorrelationId(prefix = 'system') {
  return `${prefix}:${randomUuid()}`;
}

function asSystemContext(overrides = {}) {
  return {
    ...SYSTEM_ACTOR,
    correlationId: overrides.correlationId || systemCorrelationId(overrides.prefix || 'worker'),
    ...overrides,
  };
}

module.exports = { SYSTEM_ACTOR, systemCorrelationId, asSystemContext };
