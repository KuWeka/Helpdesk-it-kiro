import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { setupSocketAuth } from './socket';
import { setIO } from './lib/socket';

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
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

export default server;
