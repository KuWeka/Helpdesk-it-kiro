import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { setupSocketAuth } from './socket';
import { setIO } from './lib/socket';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io to HTTP server
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Initialize Socket.io singleton (TASK-009)
setIO(io);

// Setup Socket.io JWT authentication and connection handlers
setupSocketAuth(io);

// Export io instance for backwards compatibility
export { io };

// Start server
server.listen(PORT, () => {
  logger.info(`[Server] Running on port ${PORT}`);
  logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`[Server] CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

// Process-level error handlers for safer production operation.
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('[Server] Unhandled Promise Rejection:', reason);
  logger.error('[Server] Promise:', String(promise));
});

process.on('uncaughtException', (error: Error) => {
  logger.error('[Server] Uncaught Exception:', error.message);
  logger.error('[Server] Stack:', error.stack);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('[Server] SIGTERM received - shutting down gracefully');
  server.close(() => {
    logger.info('[Server] HTTP server closed');
    process.exit(0);
  });
});

export default server;
