import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';

/**
 * POST /api/auth/register
 * Register a new user with SATKER role.
 */
export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nama, email, nomorWhatsApp, password } = req.body;
    const result = await authService.register({ nama, email, nomorWhatsApp, password });

    res.status(201).json({
      status: 'success',
      data: { userId: result.userId },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.status(200).json({
      status: 'success',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/forgot-password
 * Request a password reset email.
 * Always returns 200 with a generic message to prevent email enumeration.
 */
export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);

    res.status(200).json({
      status: 'success',
      message: 'Jika email terdaftar, instruksi reset password telah dikirim',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token.
 */
export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.status(200).json({
      status: 'success',
      message: 'Password berhasil direset',
    });
  } catch (error) {
    next(error);
  }
}
