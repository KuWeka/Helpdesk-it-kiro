# Prisma Guide (Backend)

Dokumentasi singkat untuk pengelolaan schema dan migration Prisma pada backend.

## Lokasi Penting

- Schema utama: `backend/src/prisma/schema.prisma`
- Migration: `backend/src/prisma/migrations/`
- Seed script: `backend/src/prisma/seed.ts`

## Perintah Umum

Generate Prisma Client:

```bash
npm run prisma:generate --workspace=backend
```

Buat dan terapkan migration baru (development):

```bash
npm run prisma:migrate --workspace=backend -- --schema=src/prisma/schema.prisma
```

Terapkan migration existing di environment deployment:

```bash
npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

Jalankan seed data:

```bash
npm run prisma:seed --workspace=backend
```

## Menambah Perubahan Schema

1. Ubah `schema.prisma` sesuai kebutuhan model/enum/relasi.
2. Jalankan migration dev untuk menghasilkan folder migration baru.
3. Pastikan Prisma Client ter-generate ulang.
4. Jalankan test/typecheck backend.
5. Commit perubahan berikut secara bersamaan:
   - `schema.prisma`
   - folder migration baru
   - perubahan kode service/controller yang terkait

## Catatan Deployment

- Di Railway, start command saat ini sudah menjalankan `prisma migrate deploy` sebelum server start.
- Endpoint health check backend tersedia di `/api/health`.
