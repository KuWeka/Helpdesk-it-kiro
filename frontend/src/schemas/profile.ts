import { z } from 'zod';
import { passwordSchema } from './auth';

/**
 * Schema validasi untuk update profil user.
 * - nama: 2-100 karakter
 * - nomorWhatsApp: 10-15 digit angka (Req 18.7 — berbeda dari register yang 9-15)
 * - divisi: 1-100 karakter (opsional, hanya untuk Satker)
 */
export const updateProfileSchema = z.object({
  nama: z
    .string()
    .min(2, { message: 'Nama harus minimal 2 karakter' })
    .max(100, { message: 'Nama tidak boleh lebih dari 100 karakter' }),
  nomorWhatsApp: z
    .string()
    .regex(/^\d{10,15}$/, {
      message: 'Nomor WhatsApp harus berupa 10-15 digit angka',
    }),
  divisi: z
    .string()
    .min(1, { message: 'Divisi tidak boleh kosong' })
    .max(100, { message: 'Divisi tidak boleh lebih dari 100 karakter' })
    .optional(),
});

/**
 * Schema validasi untuk ganti password.
 * - currentPassword: wajib diisi (tidak kosong)
 * - newPassword: sesuai aturan passwordSchema (8-128, uppercase, angka)
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: 'Password saat ini tidak boleh kosong' }),
  newPassword: passwordSchema,
});

// Inferred types for form usage with React Hook Form
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
