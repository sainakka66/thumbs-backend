const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');
const { normalizeRoleSlug } = require('../lib/rbac/roleMap');

const PAYMENT_ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'FINANCE']);

function attachSocketIO(httpServer, { jwtSecret, corsOrigins }) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = jwt.verify(token, jwtSecret);
      socket.userId = decoded.id;
      socket.userRole = normalizeRoleSlug(decoded.role || 'user');
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (PAYMENT_ADMIN_ROLES.has(socket.userRole)) {
      socket.join('admin:payments');
    }
    logger.info({ userId: socket.userId }, 'socket_connected');
    socket.on('disconnect', () => {
      logger.info({ userId: socket.userId }, 'socket_disconnected');
    });
  });

  return io;
}

module.exports = { attachSocketIO };
