const express = require('express');
const { protect } = require('../../lib/rbac/protect');
const userService = require('../services/userService');

function createUsersRoutes({ verifyToken }) {
  const router = express.Router();

  router.get(
    '/',
    ...protect(verifyToken, 'users.manage', async (req, res) => {
      try {
        const users = await userService.listUsers({
          includeDeleted: req.query.includeDeleted === '1',
        });
        res.json({ success: true, users });
      } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/roles/list',
    ...protect(verifyToken, 'users.manage', async (_req, res) => {
      try {
        const roles = await userService.listRoles();
        res.json({ success: true, roles });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/:id',
    ...protect(verifyToken, 'users.manage', async (req, res) => {
      try {
        const user = await userService.getUserById(parseInt(req.params.id, 10));
        if (!user) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, user });
      } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
      }
    })
  );

  router.post(
    '/',
    ...protect(verifyToken, 'users.manage', async (req, res) => {
      try {
        const user = await userService.createUser(req, req.body || {});
        res.status(201).json({ success: true, user });
      } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
      }
    })
  );

  router.put(
    '/:id',
    ...protect(verifyToken, 'users.manage', async (req, res) => {
      try {
        const user = await userService.updateUser(req, parseInt(req.params.id, 10), req.body || {});
        res.json({ success: true, user });
      } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
      }
    })
  );

  router.patch(
    '/:id/status',
    ...protect(verifyToken, 'users.manage', async (req, res) => {
      try {
        const user = await userService.patchUserStatus(req, parseInt(req.params.id, 10), req.body || {});
        res.json({ success: true, user });
      } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
      }
    })
  );

  router.post(
    '/:id/reset-password',
    ...protect(verifyToken, 'users.manage', async (req, res) => {
      try {
        const { password } = req.body || {};
        await userService.resetPassword(req, parseInt(req.params.id, 10), password);
        res.json({ success: true, message: 'Password reset' });
      } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
      }
    })
  );

  router.delete(
    '/:id',
    ...protect(verifyToken, 'users.manage', async (req, res) => {
      try {
        await userService.softDeleteUser(req, parseInt(req.params.id, 10));
        res.json({ success: true });
      } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
      }
    })
  );

  return router;
}

module.exports = { createUsersRoutes };
