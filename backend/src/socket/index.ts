import { Server, Socket } from 'socket.io';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { JwtUserPayload } from '../types/express';

/**
 * Extends the default SocketData interface to include the authenticated user payload.
 */
declare module 'socket.io' {
  interface SocketData {
    user?: JwtUserPayload;
  }
}

/**
 * Sets up Socket.io JWT authentication middleware and connection handlers.
 *
 * - Uses io.use() middleware to verify JWT token from socket.handshake.auth.token
 * - On successful auth: joins user to room `user_{userId}`
 * - On disconnect: logs disconnection
 * - On auth failure: emits error event and disconnects the socket
 *
 * @param io - The Socket.io Server instance
 */
export function setupSocketAuth(io: Server): void {
  const jwtSecret = process.env.JWT_SECRET;

  // JWT authentication middleware
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        const err = new Error('Token autentikasi tidak ditemukan');
        (err as any).data = { code: 'UNAUTHORIZED' };
        return next(err);
      }

      if (!jwtSecret) {
        const err = new Error('JWT_SECRET is not configured');
        (err as any).data = { code: 'SERVER_ERROR' };
        return next(err);
      }

      const decoded = jwt.verify(token, jwtSecret) as JwtUserPayload;

      // Attach decoded payload to socket.data
      socket.data.user = decoded;
      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        const err = new Error('Token telah kedaluwarsa');
        (err as any).data = { code: 'TOKEN_EXPIRED' };
        return next(err);
      }

      if (error instanceof JsonWebTokenError) {
        const err = new Error('Token tidak valid');
        (err as any).data = { code: 'INVALID_TOKEN' };
        return next(err);
      }

      const err = new Error('Autentikasi gagal');
      (err as any).data = { code: 'AUTH_FAILED' };
      return next(err);
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.emit('error', { message: 'Autentikasi gagal', code: 'AUTH_FAILED' });
      socket.disconnect(true);
      return;
    }

    // Join user to their personal room
    const userRoom = `user_${user.userId}`;
    socket.join(userRoom);
    console.log(`[Socket.io] User ${user.nama} (${user.userId}) connected - room: ${userRoom}`);

    // Handle disconnect
    socket.on('disconnect', (reason: string) => {
      console.log(`[Socket.io] User ${user.nama} (${user.userId}) disconnected - reason: ${reason}`);
    });
  });
}
