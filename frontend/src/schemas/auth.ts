import { z } from 'zod';

/**
 * Aturan validasi password yang digunakan di register dan reset password:
 * - Minimal 8 karakter, maksimal 128 karakter
 * - Minimal 1 huruf kapital (uppercase)
 * - Minimal 1 angka
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password harus minimal 8 karakter' })
  .max(128, { message: 'Password tidak boleh lebih dari 128 karakter' })
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password harus mengandung minimal 1 huruf kapital',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Password harus mengandung minimal 1 angka',
  });

/**
 * Schema validasi untuk registrasi user baru.
 * - nama: 2-100 karakter
 * - email: format email valid
 * - nomorWhatsApp: 9-15 digit angka
 * - password: sesuai aturan passwordSchema
 */
export const registerSchema = z.object({
  nama: z
    .string()
    .min(2, { message: 'Nama harus minimal 2 karakter' })
    .max(100, { message: 'Nama tidak boleh lebih dari 100 karakter' }),
  email: z
    .string()
    .email({ message: 'Format email tidak valid' }),
  nomorWhatsApp: z
    .string()
    .regex(/^\d{9,15}$/, {
      message: 'Nomor WhatsApp harus berupa 9-15 digit angka',
    }),
  password: passwordSchema,
});

/**
 * Schema validasi untuk login.
 * - email: format email valid
 * - password: string minimal 1 karakter (tidak kosong)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: 'Format email tidak valid' }),
  password: z
    .string()
    .min(1, { message: 'Password tidak boleh kosong' }),
});

/**
 * Schema validasi untuk permintaan lupa password.
 * - email: format email valid
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: 'Format email tidak valid' }),
});

/**
 * Schema validasi untuk reset password dengan token.
 * - token: string minimal 1 karakter (tidak kosong)
 * - password: sesuai aturan passwordSchema
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, { message: 'Token tidak boleh kosong' }),
  password: passwordSchema,
});

// Inferred types for form usage with React Hook Form
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
