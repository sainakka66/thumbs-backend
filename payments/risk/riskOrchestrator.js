const socure = require('./providers/socureProvider');
const sardine = require('./providers/sardineProvider');
const { getSecurityConfig } = require('../../config/securityConfig');
const logger = require('../../lib/logger');

function scoreToCategory(score, thresholds) {
  if (score >= thresholds.critical) return 'CRITICAL';
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.medium) return 'MEDIUM';
  return 'LOW';
}

function categoryToAction(category) {
  switch (category) {
    case 'CRITICAL':
      return 'block';
    case 'HIGH':
      return 'hold';
    case 'MEDIUM':
      return 'verify';
    default:
      return 'allow';
  }
}

async function evaluateExternalProviders(ctx) {
  const config = getSecurityConfig();
  const providers = [];
  if (config.socureEnabled) providers.push(socure);
  if (config.sardineEnabled) providers.push(sardine);

  const results = [];
  for (const p of providers) {
    const r = await p.evaluate(ctx);
    if (r) results.push(r);
  }

  const maxScore = results.length ? Math.max(...results.map((r) => r.score)) : 0;
  logger.info({ userId: ctx.userId, maxScore, providers: results.map((r) => r.provider) }, 'external_risk_evaluated');

  return { results, maxScore };
}

module.exports = { evaluateExternalProviders, scoreToCategory, categoryToAction };
