const { ForbiddenError, NotFoundError } = require('../../lib/errors');
const { isPrivilegedRole } = require('../../lib/rbac/requirePermission');

function hasPermission(req, slug) {
  if (isPrivilegedRole(req)) return true;
  return req.permissions?.has(slug) || false;
}

/** Legacy `payments.view` grants view-all for backward compatibility. */
function canViewAllPayments(req) {
  return hasPermission(req, 'payments.view.all') || hasPermission(req, 'payments.view');
}

function canViewOwnPayment(req, order) {
  if (!order || !req.authUser) return false;
  return order.user_id === req.authUser.id;
}

function canViewPayment(req, order) {
  if (!order) return false;
  if (canViewAllPayments(req)) return true;
  if (hasPermission(req, 'payments.view.self') && canViewOwnPayment(req, order)) return true;
  return false;
}

function assertCanViewPayment(req, order) {
  if (!order || !canViewPayment(req, order)) throw new NotFoundError('Order not found');
  return order;
}

function assertCanCreatePayment(req) {
  if (!hasPermission(req, 'payments.create')) {
    throw new ForbiddenError('Cannot create payments');
  }
}

module.exports = {
  hasPermission,
  canViewAllPayments,
  canViewOwnPayment,
  canViewPayment,
  assertCanViewPayment,
  assertCanCreatePayment,
};
