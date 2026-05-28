const { query, queryRows } = require('../../lib/db/safeQuery');
const logger = require('../../lib/logger');

async function recordSecurityIncident({ incidentType, severity, userId, paymentOrderId, details, ipAddress }) {
  try {
    await query(
      `INSERT INTO security_incidents (incident_type, severity, user_id, payment_order_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        incidentType,
        severity || 'medium',
        userId || null,
        paymentOrderId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
      ]
    );
    logger.warn({ incidentType, severity, userId }, 'security_incident');
  } catch (err) {
    logger.error({ err: err.message, incidentType }, 'security_incident_log_failed');
  }
}

async function logAdminAction({ adminUserId, action, targetType, targetId, details, ipAddress }) {
  try {
    await query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminUserId, action, targetType || null, targetId || null, details ? JSON.stringify(details) : null, ipAddress || null]
    );
  } catch (err) {
    logger.error({ err: err.message }, 'admin_audit_log_failed');
  }
}

async function createAdminApproval({ actionType, targetRef, requestedBy, payload, expiresMinutes = 15 }) {
  const [result] = await query(
    `INSERT INTO admin_action_approvals (action_type, target_ref, requested_by, status, payload, expires_at)
     VALUES (?, ?, ?, 'PENDING', ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [actionType, targetRef, requestedBy, JSON.stringify(payload || {}), expiresMinutes]
  );
  return result.insertId;
}

async function findPendingApproval(actionType, targetRef) {
  const rows = await queryRows(
    `SELECT * FROM admin_action_approvals
     WHERE action_type = ? AND target_ref = ? AND status = 'PENDING' AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [actionType, targetRef]
  );
  return rows[0] || null;
}

async function approveAction(approvalId, approvedBy) {
  await query(
    `UPDATE admin_action_approvals SET status = 'APPROVED', approved_by = ? WHERE id = ? AND status = 'PENDING'`,
    [approvedBy, approvalId]
  );
}

module.exports = {
  recordSecurityIncident,
  logAdminAction,
  createAdminApproval,
  findPendingApproval,
  approveAction,
};
