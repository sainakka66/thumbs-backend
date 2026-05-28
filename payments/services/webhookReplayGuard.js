const crypto = require('crypto');
const { queryRows } = require('../../lib/db/safeQuery');
const logger = require('../../lib/logger');
const { getSecurityConfig } = require('../../config/securityConfig');
const { recordSecurityIncident } = require('../repositories/securityRepository');

function hashSignature(sig) {
  return crypto.createHash('sha256').update(String(sig || '')).digest('hex');
}

function extractTimestamp(payload) {
  const ts =
    payload?.created_at ||
    payload?.payload?.payment?.entity?.created_at ||
    payload?.payload?.order?.entity?.created_at;
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function extractNonce(payload, payloadHash) {
  return (
    payload?.id ||
    payload?.event_id ||
    payload?.payload?.payment?.entity?.id ||
    `${payloadHash.slice(0, 32)}`
  );
}

async function validateWebhookReplay({ rawBody, signature, payload, sourceIp }) {
  const config = getSecurityConfig();
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const signatureHash = hashSignature(signature);
  const eventId = payload?.event || payload?.id || payloadHash;
  const webhookTs = extractTimestamp(payload);
  const nonce = extractNonce(payload, payloadHash);
  const nowSec = Math.floor(Date.now() / 1000);

  if (webhookTs && Math.abs(nowSec - webhookTs) > config.webhookMaxAgeSec) {
    await recordSecurityIncident({
      incidentType: 'webhook_stale_timestamp',
      severity: 'high',
      details: { eventId, webhookTs, nowSec, maxAge: config.webhookMaxAgeSec },
      ipAddress: sourceIp,
    });
    return { allowed: false, reason: 'stale_timestamp', replay: true };
  }

  const existing = await queryRows(
    `SELECT id, replay_detected FROM webhook_replay_guard WHERE event_id = ? OR payload_hash = ? LIMIT 1`,
    [String(eventId), payloadHash]
  ).catch(() => []);

  if (existing.length) {
    await queryRows(
      `UPDATE webhook_replay_guard SET replay_detected = 1 WHERE id = ?`,
      [existing[0].id]
    ).catch(() => {});
    await recordSecurityIncident({
      incidentType: 'webhook_replay',
      severity: 'critical',
      details: { eventId, payloadHash },
      ipAddress: sourceIp,
    });
    logger.warn({ eventId }, 'webhook_replay_rejected');
    return { allowed: false, reason: 'replay_detected', replay: true, duplicate: true };
  }

  await queryRows(
    `INSERT INTO webhook_replay_guard (event_id, payload_hash, signature_hash, webhook_timestamp, nonce, source_ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [String(eventId), payloadHash, signatureHash, webhookTs, String(nonce), sourceIp || null]
  ).catch((err) => {
    if (err.code === 'ER_DUP_ENTRY') {
      return { allowed: false, reason: 'race_duplicate', replay: true };
    }
    throw err;
  });

  return {
    allowed: true,
    eventId: String(eventId),
    payloadHash,
    signatureHash,
    webhookTs,
    nonce: String(nonce),
  };
}

module.exports = { validateWebhookReplay, hashSignature };
