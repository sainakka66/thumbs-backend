const { queryRows } = require('../../lib/db/safeQuery');

async function createNotification(opts) {
  const { userId = null, type, title, message, entityType = null, entityId = null } = opts;
  try {
    await queryRows(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, entityType, entityId != null ? String(entityId) : null]
    );
  } catch (e) {
    if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
  }
}

async function listForUser(userId, { unreadOnly = false, limit = 50 } = {}) {
  try {
    const where = unreadOnly ? 'AND is_read = 0' : '';
    return await queryRows(
      `SELECT id, user_id, type, title, message, entity_type, entity_id, is_read, read_at, created_at
       FROM notifications
       WHERE (user_id IS NULL OR user_id = ?) ${where}
       ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return [];
    throw e;
  }
}

async function countUnread(userId) {
  try {
    const [row] = await queryRows(
      `SELECT COUNT(*) AS cnt FROM notifications
       WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0`,
      [userId]
    );
    return row?.cnt || 0;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return 0;
    throw e;
  }
}

async function markRead(id, userId) {
  await queryRows(
    `UPDATE notifications SET is_read = 1, read_at = NOW()
     WHERE id = ? AND (user_id IS NULL OR user_id = ?)`,
    [id, userId]
  );
}

async function markAllRead(userId) {
  await queryRows(
    `UPDATE notifications SET is_read = 1, read_at = NOW()
     WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0`,
    [userId]
  );
}

module.exports = {
  createNotification,
  listForUser,
  countUnread,
  markRead,
  markAllRead,
};
