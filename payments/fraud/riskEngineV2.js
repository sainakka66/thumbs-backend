const { queryRows } = require('../../lib/db/safeQuery');
const blockedRepo = require('../repositories/blockedRepository');
const paymentRepo = require('../repositories/paymentRepository');
const { getFraudConfig } = require('../../config/paymentConfig');
const { getRiskThresholds } = require('../../config/securityConfig');
const { evaluateExternalProviders, scoreToCategory, categoryToAction } = require('../risk/riskOrchestrator');
const logger = require('../../lib/logger');

async function upsertRiskScore(userId, score, factors, category) {
  await queryRows(
    `INSERT INTO user_risk_scores (user_id, score, factors, last_calculated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE score = VALUES(score), factors = VALUES(factors), last_calculated_at = NOW()`,
    [userId, score, JSON.stringify({ factors, category })]
  ).catch(() => {});
}

async function recordSuspicious(opts) {
  await queryRows(
    `INSERT INTO suspicious_activities (user_id, payment_order_id, activity_type, severity, risk_score, ip_address, device_fingerprint, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.userId,
      opts.paymentOrderId || null,
      opts.activityType,
      opts.severity,
      opts.riskScore,
      opts.ipAddress,
      opts.deviceFingerprint,
      opts.details ? JSON.stringify(opts.details) : null,
    ]
  ).catch(() => {});
  logger.warn({ userId: opts.userId, activityType: opts.activityType }, 'fraud_alert');
}

async function analyzePaymentRiskInternal(ctx) {
  const config = getFraudConfig();
  const thresholds = getRiskThresholds();
  const factors = [];
  let score = 0;

  const blockChecks = [
    ['user_blocked', () => blockedRepo.isBlocked('user', String(ctx.userId))],
    ['ip_blocked', () => (ctx.ip ? blockedRepo.isBlocked('ip', ctx.ip) : false)],
    ['device_blocked', () => (ctx.deviceFingerprint ? blockedRepo.isBlocked('device', ctx.deviceFingerprint) : false)],
    ['customer_blocked', () => (ctx.customerId ? blockedRepo.isBlocked('customer', String(ctx.customerId)) : false)],
  ];

  for (const [name, fn] of blockChecks) {
    if (await fn()) {
      factors.push({ rule: name, weight: 100 });
      return buildResult(100, factors, thresholds, true);
    }
  }

  const recent = await paymentRepo.countRecentOrders(ctx.userId, config.velocityWindowMinutes);
  if (recent >= config.velocityMaxPayments) {
    factors.push({ rule: 'velocity_exceeded', weight: 40, recent });
    score += 40;
  }

  const [failedRatio] = await queryRows(
    `SELECT
       SUM(status = 'FAILED') AS failed,
       COUNT(*) AS total
     FROM payment_orders WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [ctx.userId]
  ).catch(() => [{ failed: 0, total: 0 }]);

  if (failedRatio?.total >= 5) {
    const ratio = Number(failedRatio.failed) / Number(failedRatio.total);
    if (ratio > 0.5) {
      factors.push({ rule: 'high_failure_ratio', weight: 20, ratio });
      score += 20;
    }
  }

  if (ctx.amountPaise > 0) {
    const avgRows = await queryRows(
      `SELECT AVG(amount_paise) AS avg_paise FROM payment_orders
       WHERE user_id = ? AND status = 'SUCCESS' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [ctx.userId]
    ).catch(() => [{ avg_paise: 0 }]);
    const avg = Number(avgRows[0]?.avg_paise || 0);
    if (avg > 0 && ctx.amountPaise > avg * config.abnormalAmountMultiplier) {
      factors.push({ rule: 'abnormal_amount', weight: 25 });
      score += 25;
    }
  }

  if (ctx.deviceFingerprint) {
    const deviceUsers = await queryRows(
      `SELECT COUNT(DISTINCT user_id) AS cnt FROM payment_orders
       WHERE device_fingerprint = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [ctx.deviceFingerprint]
    ).catch(() => [{ cnt: 0 }]);
    if ((deviceUsers[0]?.cnt || 0) > 3) {
      factors.push({ rule: 'multi_account_device', weight: 35 });
      score += 35;
    }
  }

  if (ctx.deviceTrust?.trustScore != null && ctx.deviceTrust.trustScore < 30) {
    factors.push({ rule: 'untrusted_device', weight: 30, trust: ctx.deviceTrust.trustScore });
    score += 30;
  }

  if (ctx.vpnOrTor) {
    factors.push({ rule: 'vpn_tor', weight: 25 });
    score += 25;
  }

  const [accountAge] = await queryRows(
    `SELECT DATEDIFF(NOW(), created_at) AS days FROM users WHERE id = ?`,
    [ctx.userId]
  ).catch(() => [{ days: 30 }]);
  if ((accountAge[0]?.days ?? 30) < 2) {
    factors.push({ rule: 'new_account', weight: 15 });
    score += 15;
  }

  const [refundAbuse] = await queryRows(
    `SELECT COUNT(*) AS cnt FROM payment_refunds pr
     JOIN payment_transactions pt ON pt.id = pr.payment_transaction_id
     JOIN payment_orders po ON po.id = pt.payment_order_id
     WHERE po.user_id = ? AND pr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [ctx.userId]
  ).catch(() => [{ cnt: 0 }]);
  if ((refundAbuse[0]?.cnt || 0) >= 3) {
    factors.push({ rule: 'refund_abuse', weight: 20 });
    score += 20;
  }

  score = Math.min(100, score);
  return buildResult(score, factors, thresholds, false);
}

function buildResult(score, factors, thresholds, forceBlock) {
  let category = 'LOW';
  if (score >= thresholds.critical) category = 'CRITICAL';
  else if (score >= thresholds.high) category = 'HIGH';
  else if (score >= thresholds.medium) category = 'MEDIUM';

  const action =
    forceBlock || category === 'CRITICAL'
      ? 'block'
      : category === 'HIGH'
        ? 'hold'
        : category === 'MEDIUM'
          ? 'verify'
          : 'allow';

  return {
    score,
    factors,
    category,
    action,
    blocked: action === 'block',
    flagged: action === 'hold' || category === 'HIGH',
    hold: action === 'hold',
  };
}

async function analyzePaymentRisk(ctx) {
  const deviceEnriched = { ...ctx };
  const internal = await analyzePaymentRiskInternal(deviceEnriched);
  const external = await evaluateExternalProviders({
    ...ctx,
    email: ctx.email,
    sessionKey: ctx.deviceFingerprint,
  });

  const thresholds = getRiskThresholds();
  const blendedScore = Math.min(
    100,
    Math.round(internal.score * 0.7 + external.maxScore * 0.3)
  );
  const category = scoreToCategory(Math.max(internal.score, blendedScore), thresholds);
  const action = internal.blocked
    ? 'block'
    : category === 'CRITICAL'
      ? 'block'
      : category === 'HIGH'
        ? 'hold'
        : category === 'MEDIUM'
          ? 'verify'
          : 'allow';

  const score = Math.max(internal.score, blendedScore);
  const blocked = action === 'block';
  const hold = action === 'hold';
  const flagged = hold || category === 'HIGH';

  const externalFactors = (external.results || []).flatMap((r) => r.factors || []);
  await upsertRiskScore(ctx.userId, score, [...internal.factors, ...externalFactors], category);

  if (score >= getFraudConfig().highRiskThreshold) {
    await recordSuspicious({
      userId: ctx.userId,
      paymentOrderId: ctx.paymentOrderId || null,
      activityType: blocked ? 'payment_blocked' : hold ? 'payment_held' : 'high_risk_payment',
      severity: blocked ? 'critical' : hold ? 'high' : 'medium',
      riskScore: score,
      ipAddress: ctx.ip,
      deviceFingerprint: ctx.deviceFingerprint,
      details: {
        category,
        factors: internal.factors,
        providers: ['internal', ...external.results.map((r) => r.provider)],
      },
    });
  }

  return {
    score,
    category,
    action: blocked ? 'block' : hold ? 'hold' : flagged ? 'verify' : 'allow',
    factors: [...internal.factors, ...externalFactors],
    blocked,
    flagged,
    hold,
    providers: ['internal', ...external.results.map((r) => r.provider)],
  };
}

module.exports = {
  analyzePaymentRisk,
  analyzePaymentRiskInternal,
  recordSuspicious,
  upsertRiskScore,
};
