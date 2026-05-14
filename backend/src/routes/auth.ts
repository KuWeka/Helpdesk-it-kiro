import { Router } from 'express';
import { registerHandler, loginHandler, forgotPasswordHandler, resetPasswordHandler } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth';
import { registerLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimit';

const router = Router();

// POST /api/auth/register
router.post('/register', registerLimiter, validate(registerSchema), registerHandler);

// POST /api/auth/login
router.post('/login', loginLimiter, validate(loginSchema), loginHandler);

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPasswordHandler);

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler);

export default router;
