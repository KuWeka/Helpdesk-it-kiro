import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * Role-Based Authorization Middleware Factory.
 *
 * Creates a middleware that checks if the authenticated user's role
 * is included in the list of allowed roles.
 *
 * MUST be used AFTER the `authenticate` middleware, which attaches
 * `req.user` with the decoded JWT payload.
 *
 * @param roles - One or more Role values that are permitted access
 * @returns Express middleware that enforces role-based access control
 *
 * @example
 * // Allow only BIDTEKKOM
 * router.get('/staff', authenticate, authorize(Role.BIDTEKKOM), staffController.list);
 *
 * // Allow BIDTEKKOM and PADAL
 * router.get('/reports', authenticate, authorize(Role.BIDTEKKOM, Role.PADAL), reportController.get);
 */
export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If req.user is not set, authenticate middleware was not called first
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Token autentikasi tidak ditemukan',
      });
      return;
    }

    // Check if user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Anda tidak memiliki akses ke resource ini',
      });
      return;
    }

    next();
  };
};
