type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Basic console logger with timestamp and level prefix.
 * Provides structured logging for the backend application.
 */
export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
  },

  error(message: string, ...args: unknown[]): void {
    console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args);
  },

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${getTimestamp()}] [DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log with a specific level.
   */
  log(level: LogLevel, message: string, ...args: unknown[]): void {
    this[level](message, ...args);
  },
};

function getTimestamp(): string {
  return new Date().toISOString();
}
