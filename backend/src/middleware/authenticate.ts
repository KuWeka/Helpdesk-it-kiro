import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JwtUserPayload } from '../types/express';

const prisma = new PrismaClient();

/**
 * JWT Authentication Middleware.
 *
 * Extracts Bearer token from Authorization header, verifies it,
 * checks the user is not soft-deleted, and attaches the decoded
 * payload to req.user.
 *
 * Returns 401 for missing, invalid, or expired tokens, and for
 * soft-deleted users.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Token autentikasi tidak ditemukan',
      });
      return;
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Token autentikasi tidak ditemukan',
      });
      return;
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtUserPayload;

    // Check that user exists and is not soft-deleted
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'User tidak ditemukan',
      });
      return;
    }

    if (user.deletedAt !== null) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Akun telah dinonaktifkan',
      });
      return;
    }

    // Attach decoded payload to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Token telah kedaluwarsa',
      });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Token tidak valid',
      });
      return;
    }

    // Unexpected errors
    next(error);
  }
};
