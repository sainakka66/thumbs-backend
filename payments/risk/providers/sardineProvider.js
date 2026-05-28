const logger = require('../../../lib/logger');
const { getSecurityConfig } = require('../../../config/securityConfig');

/**
 * Optional Sardine.ai adapter — no-op when SARDINE_ENABLED != true.
 */
async function evaluate(ctx) {
  const config = getSecurityConfig();
  if (!config.sardineEnabled || !config.sardineApiKey) {
    return null;
  }

  try {
    const res = await fetch(`${config.sardineBaseUrl}/v1/customers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.sardineApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionKey: ctx.sessionKey || ctx.deviceFingerprint,
        customerId: String(ctx.userId),
        transaction: {
          amount: ctx.amountPaise / 100,
          currencyCode: 'INR',
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'sardine_provider_degraded');
      return null;
    }

    const data = await res.json();
    const level = data?.level || data?.riskLevel || 'low';
    const scoreMap = { low: 15, medium: 45, high: 75, very_high: 95 };
    const score = scoreMap[String(level).toLowerCase()] || 30;
    return {
      provider: 'sardine',
      score,
      factors: [{ rule: 'sardine_risk_level', level }],
      category: score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
    };
  } catch (err) {
    logger.warn({ err: err.message }, 'sardine_provider_unavailable');
    return null;
  }
}

module.exports = { evaluate, name: 'sardine' };
