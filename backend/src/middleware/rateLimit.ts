import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Creates a rate limiter handler that returns a 429 JSON response
 * with code, message, and retryAfter (seconds until reset).
 */
function rateLimitHandler(message: string) {
  return (_req: Request, res: Response) => {
    const retryAfter = Math.ceil(
      (res.getHeader('Retry-After') as number) || 60
    );
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      retryAfter,
    });
  };
}

/**
 * Registration rate limiter: 5 requests per 60 minutes per IP.
 * Requirements: 1.3, 1.4
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: rateLimitHandler(
    'Terlalu banyak permintaan registrasi. Silakan coba lagi nanti.'
  ),
});

/**
 * Login rate limiter: 10 requests per 15 minutes per IP.
 * Requirements: 2.3, 2.4
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: rateLimitHandler(
    'Terlalu banyak percobaan login. Silakan coba lagi nanti.'
  ),
});

/**
 * Password reset rate limiter: 5 requests per 60 minutes per IP.
 * Requirements: 3.6
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: rateLimitHandler(
    'Terlalu banyak permintaan reset password. Silakan coba lagi nanti.'
  ),
});
