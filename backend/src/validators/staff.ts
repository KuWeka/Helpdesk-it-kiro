import { z } from 'zod';

export const staffUserIdParamSchema = z.object({
  id: z
    .string({ required_error: 'ID user wajib diisi' })
    .uuid({ message: 'ID user harus berformat UUID yang valid' }),
});

export const staffPadalIdParamSchema = z.object({
  padalId: z
    .string({ required_error: 'ID padal wajib diisi' })
    .uuid({ message: 'ID padal harus berformat UUID yang valid' }),
});

export const staffTeamMemberParamSchema = z.object({
  padalId: z
    .string({ required_error: 'ID padal wajib diisi' })
    .uuid({ message: 'ID padal harus berformat UUID yang valid' }),
  teknisiId: z
    .string({ required_error: 'ID teknisi wajib diisi' })
    .uuid({ message: 'ID teknisi harus berformat UUID yang valid' }),
});

export const addTeknisiToPadalSchema = z.object({
  teknisiId: z
    .string({ required_error: 'ID teknisi wajib diisi' })
    .uuid({ message: 'ID teknisi harus berformat UUID yang valid' }),
});
