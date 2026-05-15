import { z } from 'zod';

/**
 * Enum kategori tiket yang valid.
 * Sesuai dengan enum TicketCategory di Prisma schema.
 */
const ticketCategoryEnum = z.enum(
  ['HARDWARE', 'SOFTWARE', 'JARINGAN', 'EMAIL', 'WEBSITE', 'LAINNYA'],
  {
    errorMap: () => ({
      message:
        'Kategori harus salah satu dari: HARDWARE, SOFTWARE, JARINGAN, EMAIL, WEBSITE, LAINNYA',
    }),
  }
);

/**
 * Schema validasi untuk pembuatan tiket baru.
 * - judul: 1-150 karakter, wajib
 * - deskripsi: 1-2000 karakter, wajib
 * - kategori: salah satu dari enum TicketCategory, wajib
 * - lokasi: 1-200 karakter, wajib
 */
export const createTicketSchema = z.object({
  judul: z
    .string({ required_error: 'Judul tiket wajib diisi' })
    .min(1, { message: 'Judul tiket tidak boleh kosong' })
    .max(150, { message: 'Judul tiket tidak boleh lebih dari 150 karakter' }),
  deskripsi: z
    .string({ required_error: 'Deskripsi tiket wajib diisi' })
    .min(1, { message: 'Deskripsi tiket tidak boleh kosong' })
    .max(2000, { message: 'Deskripsi tiket tidak boleh lebih dari 2000 karakter' }),
  kategori: ticketCategoryEnum,
  lokasi: z
    .string({ required_error: 'Lokasi wajib diisi' })
    .min(1, { message: 'Lokasi tidak boleh kosong' })
    .max(200, { message: 'Lokasi tidak boleh lebih dari 200 karakter' }),
});

/**
 * Schema validasi untuk assign tiket ke Padal.
 * - padalId: UUID format, wajib
 */
export const assignTicketSchema = z.object({
  padalId: z
    .string({ required_error: 'ID Padal wajib diisi' })
    .uuid({ message: 'ID Padal harus berformat UUID yang valid' }),
});

/**
 * Schema validasi untuk pembatalan tiket.
 * - alasanBatal: 1-500 karakter, opsional (jika diisi harus 1-500 karakter)
 */
export const cancelTicketSchema = z.object({
  alasanBatal: z
    .string()
    .min(1, { message: 'Alasan pembatalan tidak boleh kosong jika diisi' })
    .max(500, { message: 'Alasan pembatalan tidak boleh lebih dari 500 karakter' })
    .optional(),
});

/**
 * Schema validasi untuk penolakan tiket oleh Bidtekkom.
 * - alasanTolak: 1-500 karakter, wajib
 */
export const rejectTicketSchema = z.object({
  alasanTolak: z
    .string({ required_error: 'Alasan penolakan wajib diisi' })
    .min(1, { message: 'Alasan penolakan wajib diisi' })
    .max(500, { message: 'Alasan penolakan tidak boleh lebih dari 500 karakter' }),
});

/**
 * Schema validasi untuk route param tiket.
 * - id: UUID format, wajib
 */
export const ticketIdParamSchema = z.object({
  id: z
    .string({ required_error: 'ID tiket wajib diisi' })
    .uuid({ message: 'ID tiket harus berformat UUID yang valid' }),
});

/**
 * Schema validasi untuk route param attachment tiket.
 * - id: UUID format, wajib
 * - fileId: string, wajib
 */
export const ticketAttachmentParamSchema = z.object({
  id: z
    .string({ required_error: 'ID tiket wajib diisi' })
    .uuid({ message: 'ID tiket harus berformat UUID yang valid' }),
  fileId: z
    .string({ required_error: 'ID file wajib diisi' })
    .min(1, { message: 'ID file tidak boleh kosong' }),
});
