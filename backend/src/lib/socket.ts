import { Server as IOServer } from 'socket.io';

/**
 * Socket.io singleton manager (TASK-009)
 * Provides centralized access to the Socket.io instance without circular dependencies
 */

let ioInstance: IOServer | null = null;

/**
 * Set the Socket.io instance (called by server.ts after instantiation)
 */
export function setIO(io: IOServer): void {
  ioInstance = io;
}

/**
 * Get the Socket.io instance
 * Called by notificationService and other modules that need to emit events
 */
export function getIO(): IOServer {
  if (!ioInstance) {
    throw new Error(
      'Socket.io instance not initialized. Call setIO() first in server startup.'
    );
  }
  return ioInstance;
}
