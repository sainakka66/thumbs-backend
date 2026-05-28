const { analyzePaymentRiskInternal } = require('../../fraud/riskEngineV2');

async function evaluate(ctx) {
  const result = await analyzePaymentRiskInternal(ctx);
  return {
    provider: 'internal',
    score: result.score,
    factors: result.factors,
    category: result.category,
    action: result.action,
    blocked: result.blocked,
    flagged: result.flagged,
    hold: result.hold,
  };
}

module.exports = { evaluate, name: 'internal' };
