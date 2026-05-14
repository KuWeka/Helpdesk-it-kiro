import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { JwtUserPayload } from '../types/express';
import { sendPasswordResetEmail } from './emailService';

const prisma = new PrismaClient();

interface RegisterData {
  nama: string;
  email: string;
  nomorWhatsApp: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface LoginResult {
  token: string;
  user: {
    userId: string;
    nama: string;
    email: string;
    role: string;
  };
}

/**
 * Register a new user with SATKER role.
 * Does not accept divisi during registration.
 */
export async function register(data: RegisterData): Promise<{ userId: string }> {
  const { nama, email, nomorWhatsApp, password } = data;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email sudah terdaftar');
  }

  // Hash password with 10 rounds
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user with SATKER role (no divisi)
  const user = await prisma.user.create({
    data: {
      nama,
      email,
      nomorWhatsApp,
      password: hashedPassword,
      role: 'SATKER',
    },
  });

  return { userId: user.id };
}

/**
 * Login user by verifying credentials and generating a JWT.
 * Rejects soft-deleted accounts.
 */
export async function login(data: LoginData): Promise<LoginResult> {
  const { email, password } = data;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // If not found, throw generic error (don't reveal which field is wrong)
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }

  // Reject soft-deleted accounts
  if (user.deletedAt !== null) {
    throw new AppError(401, 'ACCOUNT_INACTIVE', 'Akun telah dinonaktifkan');
  }

  // Generate JWT with 24h expiry
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload: JwtUserPayload = {
    userId: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });

  return {
    token,
    user: {
      userId: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Request a password reset. Generates a crypto token, hashes and stores it,
 * then sends the unhashed token via email.
 * Returns void regardless of whether the email exists (prevents email enumeration).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Return silently if user not found (prevent email enumeration)
  if (!user) {
    return;
  }

  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token before storing
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Store hashed token and expiry (15 minutes from now)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: expiresAt,
    },
  });

  // Send email with the UNHASHED token
  await sendPasswordResetEmail(user.email, resetToken);
}

/**
 * Reset password using a valid token.
 * Verifies the token is not expired, validates and hashes the new password,
 * updates the user record, and invalidates the token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with matching token that hasn't expired
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError(400, 'INVALID_TOKEN', 'Token tidak valid atau sudah kedaluwarsa');
  }

  // Hash new password with bcrypt (10 rounds)
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and clear reset token fields
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
}
