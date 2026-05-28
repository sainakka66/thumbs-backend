const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');

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
      socket.userRole = decoded.role || 'user';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (socket.userRole === 'admin') {
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
