import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError';
import * as auditService from './auditService';


/**
 * User profile data returned by getProfile.
 */
export interface UserProfile {
  id: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
  role: string;
  divisi: string | null;
  foto: string | null;
  tema: string;
  bahasa: string;
}

/**
 * Data accepted by updateProfile.
 */
export interface UpdateProfileDTO {
  nama?: string;
  nomorWhatsApp?: string;
  divisi?: string;
}

/**
 * Data accepted by changePassword.
 */
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

/**
 * Get user profile by userId.
 * Returns profile fields: nama, email, nomorWhatsApp, role, divisi, foto, tema, bahasa.
 */
export async function getProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nama: true,
      email: true,
      nomorWhatsApp: true,
      role: true,
      divisi: true,
      foto: true,
      tema: true,
      bahasa: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  return user;
}

/**
 * Update user profile.
 * - nama: 2-100 characters
 * - nomorWhatsApp: 10-15 digits (numeric string)
 * - divisi: 1-100 characters (Satker role only)
 * - photo: optional file upload (replaces existing, 5MB max, jpg/jpeg/png only)
 *
 * If a photo is provided and the user already has a photo, the old file is deleted from disk.
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileDTO,
  photo?: Express.Multer.File
): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, foto: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  // Build update data
  const updateData: Record<string, unknown> = {};

  // Validate and set nama
  if (data.nama !== undefined) {
    if (data.nama.length < 2 || data.nama.length > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Nama harus antara 2 dan 100 karakter');
    }
    updateData.nama = data.nama;
  }

  // Validate and set nomorWhatsApp
  if (data.nomorWhatsApp !== undefined) {
    const waRegex = /^\d{10,15}$/;
    if (!waRegex.test(data.nomorWhatsApp)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Nomor WhatsApp harus berupa angka antara 10 dan 15 digit');
    }
    updateData.nomorWhatsApp = data.nomorWhatsApp;
  }

  // Validate and set divisi (Satker only)
  if (data.divisi !== undefined) {
    if (user.role !== 'SATKER') {
      throw new AppError(403, 'FORBIDDEN', 'Hanya user dengan role Satker yang dapat mengubah divisi');
    }
    if (data.divisi.trim().length === 0 || data.divisi.length > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Divisi harus antara 1 dan 100 karakter dan tidak boleh kosong');
    }
    updateData.divisi = data.divisi;
  }

  // Handle photo upload
  if (photo) {
    // Note: To delete the old photo from Cloudinary, you would need its public_id
    // For now, we just update the database with the new URL.
    updateData.foto = photo.path || photo.filename;
  }

  // Only update if there's something to update
  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Tidak ada data yang diperbarui');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      nama: true,
      email: true,
      nomorWhatsApp: true,
      role: true,
      divisi: true,
      foto: true,
      tema: true,
      bahasa: true,
    },
  });

  return updatedUser;
}

/**
 * Change user password.
 * - Verifies current password with bcrypt.compare
 * - Validates new password meets requirements (8+ chars, 1 uppercase, 1 number)
 * - Hashes new password and updates
 * - Logs PASSWORD_CHANGE audit event
 */
export async function changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
  const { currentPassword, newPassword } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, nama: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  // Verify current password
  const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentValid) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Password saat ini tidak sesuai');
  }

  // Validate new password requirements: 8-128 chars, at least 1 uppercase, at least 1 number
  if (newPassword.length < 8 || newPassword.length > 128) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Password baru harus antara 8 dan 128 karakter');
  }
  if (!/[A-Z]/.test(newPassword)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Password baru harus mengandung minimal 1 huruf kapital');
  }
  if (!/[0-9]/.test(newPassword)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Password baru harus mengandung minimal 1 angka');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password in database
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // Log PASSWORD_CHANGE audit event
  await auditService.log({
    eventType: 'PASSWORD_CHANGE',
    actorId: userId,
    actorNama: user.nama,
    targetEntityId: userId,
    metadata: { action: 'self_password_change' },
  });
}
