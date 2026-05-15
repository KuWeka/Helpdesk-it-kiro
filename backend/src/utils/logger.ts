import { getRequestId } from '../lib/requestContext';
import { format } from 'node:util';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/**
 * Basic console logger with timestamp and level prefix.
 * Provides structured logging for the backend application.
 */
export const logger = {
  info(message: string, ...args: unknown[]): void {
    writeLog('INFO', message, args);
  },

  warn(message: string, ...args: unknown[]): void {
    writeLog('WARN', message, args);
  },

  error(message: string, ...args: unknown[]): void {
    writeLog('ERROR', message, args);
  },

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      writeLog('DEBUG', message, args);
    }
  },

  /**
   * Log with a specific level.
   */
  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level === 'INFO') {
      this.info(message, ...args);
      return;
    }

    if (level === 'WARN') {
      this.warn(message, ...args);
      return;
    }

    if (level === 'ERROR') {
      this.error(message, ...args);
      return;
    }

    this.debug(message, ...args);
  },
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function getLogPrefix(level: LogLevel): string {
  const requestId = getRequestId();
  if (requestId) {
    return `[${getTimestamp()}] [${level}] [req:${requestId}]`;
  }

  return `[${getTimestamp()}] [${level}]`;
}

function writeLog(level: LogLevel, message: string, args: unknown[]): void {
  const line = format(`${getLogPrefix(level)} ${message}`, ...args);
  const output = `${line}\n`;

  if (level === 'ERROR') {
    process.stderr.write(output);
    return;
  }

  process.stdout.write(output);
}
