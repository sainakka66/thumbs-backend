const logger = require('../../../lib/logger');
const { getSecurityConfig } = require('../../../config/securityConfig');

/**
 * Optional Socure adapter — no-op when SOCURE_ENABLED != true.
 */
async function evaluate(ctx) {
  const config = getSecurityConfig();
  if (!config.socureEnabled || !config.socureApiKey) {
    return null;
  }

  try {
    const res = await fetch(`${config.socureBaseUrl}/api/3.0/EmailAuthScore`, {
      method: 'POST',
      headers: {
        Authorization: `SocureApiKey ${config.socureApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modules: ['fraud'],
        email: ctx.email || undefined,
        userId: String(ctx.userId),
        deviceSessionId: ctx.deviceFingerprint,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'socure_provider_degraded');
      return null;
    }

    const data = await res.json();
    const score = Number(data?.fraud?.scores?.[0]?.score || 0) * 100;
    return {
      provider: 'socure',
      score: Math.min(100, score),
      factors: [{ rule: 'socure_fraud_score', score }],
      category: score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
    };
  } catch (err) {
    logger.warn({ err: err.message }, 'socure_provider_unavailable');
    return null;
  }
}

module.exports = { evaluate, name: 'socure' };
