import { z } from 'zod';

/**
 * Schema validasi untuk rating tiket.
 * - bintang: integer 1-5
 * - feedback: 1-1000 karakter, tidak boleh hanya whitespace
 */
export const ratingSchema = z.object({
  bintang: z
    .number({ required_error: 'Rating bintang wajib diisi' })
    .int({ message: 'Rating bintang harus berupa bilangan bulat' })
    .min(1, { message: 'Rating bintang minimal 1' })
    .max(5, { message: 'Rating bintang maksimal 5' }),
  feedback: z
    .string({ required_error: 'Feedback wajib diisi' })
    .min(1, { message: 'Feedback tidak boleh kosong' })
    .max(1000, { message: 'Feedback tidak boleh lebih dari 1000 karakter' })
    .refine((val) => val.trim().length > 0, {
      message: 'Feedback tidak boleh hanya berisi spasi',
    }),
});

// Inferred type for form usage with React Hook Form
export type RatingFormData = z.infer<typeof ratingSchema>;
