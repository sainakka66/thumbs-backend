const bcrypt = require('bcrypt');
const { queryRows, query } = require('../../lib/db/safeQuery');
const { validatePassword, isUsernameDisabled } = require('../../config');
const { writeAudit } = require('../../lib/audit/auditService');
const notificationService = require('./notificationService');
const emailVerificationService = require('../../lib/security/emailVerificationService');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const SLUG_TO_LEGACY = {
  ADMIN: 'admin',
  MANAGER: 'distributor',
  SALESPERSON: 'user',
  DELIVERY: 'user',
  DELIVERY_AGENT: 'user',
  CUSTOMER: 'user',
};

async function getRoleBySlug(slug) {
  const rows = await queryRows('SELECT id, slug, name FROM roles WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

async function listRoles() {
  return queryRows('SELECT id, slug, name, description FROM roles ORDER BY id');
}

async function listUsers({ includeDeleted = false } = {}) {
  const where = includeDeleted ? '' : 'WHERE u.deleted_at IS NULL';
  return queryRows(
    `SELECT u.id, u.username, u.email, u.email_verified, u.email_verified_at, u.phone, u.role, u.role_id, u.status, u.is_active,
            u.deleted_at, u.created_at, u.updated_at, r.slug AS role_slug, r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.id ASC`
  );
}

async function getUserById(id) {
  const rows = await queryRows(
    `SELECT u.id, u.username, u.email, u.email_verified, u.email_verified_at, u.phone, u.role, u.role_id, u.status, u.is_active,
            u.deleted_at, u.created_at, u.updated_at, r.slug AS role_slug, r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createUser(req, payload) {
  const { username, password, email, phone, roleSlug } = payload;
  if (!username || !password) {
    throw Object.assign(new Error('Username and password are required.'), { status: 400 });
  }
  if (isUsernameDisabled(username)) {
    throw Object.assign(new Error('Username is not allowed.'), { status: 400 });
  }
  const policyError = validatePassword(password);
  if (policyError) {
    throw Object.assign(new Error(policyError), { status: 400 });
  }

  const role = await getRoleBySlug(roleSlug || 'SALESPERSON');
  if (!role) throw Object.assign(new Error('Invalid role.'), { status: 400 });

  const [dup] = await queryRows('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (dup) throw Object.assign(new Error('Username already exists.'), { status: 409 });

  const hash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  const legacyRole = SLUG_TO_LEGACY[role.slug] || 'user';

  const [result] = await query(
    `INSERT INTO users (username, password, email, phone, role, role_id, status, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 1)`,
    [username, hash, email || null, phone || null, legacyRole, role.id]
  );

  const userId = result[0].insertId;
  if (email) {
    await emailVerificationService.resetVerificationOnEmailChange(userId);
  }
  await writeAudit(req, {
    action: 'user_create',
    entityType: 'user',
    entityId: userId,
    afterValue: { username, roleSlug: role.slug, email, phone },
  });

  await notificationService.createNotification({
    userId: null,
    type: 'user_created',
    title: 'New user created',
    message: `User ${username} (${role.name}) was created`,
    entityType: 'user',
    entityId: userId,
  });

  return getUserById(userId);
}

async function updateUser(req, id, payload) {
  const existing = await getUserById(id);
  if (!existing || existing.deleted_at) {
    throw Object.assign(new Error('User not found.'), { status: 404 });
  }

  const { email, phone, roleSlug } = payload;
  let role = null;
  if (roleSlug) {
    role = await getRoleBySlug(roleSlug);
    if (!role) throw Object.assign(new Error('Invalid role.'), { status: 400 });
  }

  const legacyRole = role ? SLUG_TO_LEGACY[role.slug] || 'user' : existing.role;

  const nextEmail = email !== undefined ? email : existing.email;
  const emailChanged = email !== undefined && nextEmail !== existing.email;

  await queryRows(
    `UPDATE users SET email = COALESCE(?, email), phone = COALESCE(?, phone),
     role = ?, role_id = COALESCE(?, role_id), updated_at = NOW()
     WHERE id = ?`,
    [nextEmail, phone !== undefined ? phone : existing.phone, legacyRole, role ? role.id : existing.role_id, id]
  );

  if (emailChanged) {
    await emailVerificationService.resetVerificationOnEmailChange(id);
  }

  const action = role && role.slug !== existing.role_slug ? 'permission_change' : 'user_update';
  await writeAudit(req, {
    action,
    entityType: 'user',
    entityId: id,
    beforeValue: { role_slug: existing.role_slug, email: existing.email, phone: existing.phone },
    afterValue: { role_slug: role?.slug || existing.role_slug, email, phone },
  });

  if (action === 'permission_change') {
    await notificationService.createNotification({
      userId: null,
      type: 'permission_change',
      title: 'User role changed',
      message: `${existing.username}: ${existing.role_slug || '—'} → ${role.slug}`,
      entityType: 'user',
      entityId: id,
    });
  }

  return getUserById(id);
}

async function patchUserStatus(req, id, { status, is_active: isActive }) {
  const existing = await getUserById(id);
  if (!existing || existing.deleted_at) {
    throw Object.assign(new Error('User not found.'), { status: 404 });
  }
  if (req.businessUser?.id === id && (status === 'banned' || status === 'suspended' || isActive === 0)) {
    throw Object.assign(new Error('Cannot deactivate your own account.'), { status: 400 });
  }

  await queryRows(
    `UPDATE users SET status = COALESCE(?, status), is_active = COALESCE(?, is_active), updated_at = NOW()
     WHERE id = ?`,
    [status || existing.status, isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active, id]
  );

  await writeAudit(req, {
    action: 'user_update',
    entityType: 'user',
    entityId: id,
    afterValue: { status: status || existing.status, is_active: isActive },
  });

  return getUserById(id);
}

async function resetPassword(req, id, newPassword) {
  const existing = await getUserById(id);
  if (!existing || existing.deleted_at) {
    throw Object.assign(new Error('User not found.'), { status: 404 });
  }
  const policyError = validatePassword(newPassword);
  if (policyError) throw Object.assign(new Error(policyError), { status: 400 });

  const hash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
  await queryRows('UPDATE users SET password = ? WHERE id = ?', [hash, id]);

  await writeAudit(req, {
    action: 'user_password_reset',
    entityType: 'user',
    entityId: id,
    afterValue: { username: existing.username },
  });

  return { success: true };
}

async function softDeleteUser(req, id) {
  const existing = await getUserById(id);
  if (!existing || existing.deleted_at) {
    throw Object.assign(new Error('User not found.'), { status: 404 });
  }
  if (req.businessUser?.id === id) {
    throw Object.assign(new Error('Cannot delete your own account.'), { status: 400 });
  }

  await queryRows(
    `UPDATE users SET deleted_at = NOW(), is_active = 0, status = 'suspended' WHERE id = ?`,
    [id]
  );

  await writeAudit(req, {
    action: 'user_delete',
    entityType: 'user',
    entityId: id,
    beforeValue: { username: existing.username },
  });

  return { success: true };
}

module.exports = {
  listUsers,
  getUserById,
  listRoles,
  createUser,
  updateUser,
  patchUserStatus,
  resetPassword,
  softDeleteUser,
  SLUG_TO_LEGACY,
};
