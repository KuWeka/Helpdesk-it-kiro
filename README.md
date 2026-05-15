# PoldaHelp Kalsel

Sistem IT Helpdesk ticketing untuk Polda Kalimantan Selatan dengan arsitektur monorepo (frontend, backend, shared).

## Overview

Aplikasi ini mendukung alur end-to-end pelaporan dan penanganan tiket gangguan TI untuk beberapa role:

- SATKER: membuat tiket, memantau progres, memberi rating.
- BIDTEKKOM: validasi, assignment, pembatalan/penolakan, manajemen user.
- PADAL: penanggung jawab teknis, assignment teknisi, penyelesaian tiket.
- TEKNISI: eksekusi penanganan di lapangan.

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, TanStack Query, Socket.io Client.
- Backend: Express, TypeScript, Prisma, MySQL, Socket.io, Zod, JWT.
- Shared: package internal untuk constants dan types lintas workspace.
- Deployment: Vercel (frontend) + Railway (backend).

## Prerequisites

- Node.js >= 18
- npm >= 9
- MySQL aktif secara lokal (untuk development)
- Akun Cloudinary (upload file)
- SMTP credentials (fitur forgot/reset password)

## Setup Lokal

1. Install dependency workspace:

```bash
npm install
```

2. Siapkan environment:

- Salin `backend/.env.example` menjadi `backend/.env`
- Salin `frontend/.env.example` menjadi `frontend/.env.local`

3. Jalankan migrasi Prisma di backend:

```bash
npm run prisma:migrate --workspace=backend -- --schema=src/prisma/schema.prisma
```

4. Opsional isi data awal:

```bash
npm run prisma:seed --workspace=backend
```

5. Jalankan backend dan frontend di terminal terpisah:

```bash
npm run dev:backend
npm run dev:frontend
```

## Environment Variables

### Backend (`backend/.env`)

- `PORT`: port API backend.
- `NODE_ENV`: mode runtime (`development`/`production`).
- `DATABASE_URL`: koneksi MySQL untuk Prisma.
- `JWT_SECRET`: secret token autentikasi.
- `JWT_EXPIRES_IN`: TTL JWT.
- `CORS_ORIGIN`: origin frontend yang diizinkan.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: konfigurasi email reset password.
- `PASSWORD_RESET_URL`: URL tujuan reset password frontend.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: upload aset.
- `UPLOAD_DIR`, `MAX_FILE_SIZE`: fallback upload lokal/limit ukuran file.

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`: base URL API backend (`.../api`).
- `NEXT_PUBLIC_SOCKET_URL`: base URL Socket.io backend.
- `NEXT_PUBLIC_APP_NAME`: nama aplikasi.
- `NEXT_PUBLIC_DEFAULT_LOCALE`: locale default.

## Deployment

### Frontend (Vercel)

- Import repository ke Vercel.
- Set environment variables `NEXT_PUBLIC_*`.
- Deploy branch utama.

### Backend (Railway)

- Deploy folder backend sebagai service.
- Pastikan env backend terisi lengkap.
- `railway.json` sudah menyetel:
  - start command migrasi + start server
  - health check path `'/api/health'`

## Struktur Folder

```text
frontend/   -> UI Next.js
backend/    -> API Express + Prisma + Socket.io
shared/     -> shared types/constants lintas package
documents/  -> analisis, requirements, laporan sprint
```

## Development Workflow

1. Buat branch fitur dari branch utama.
2. Kerjakan task per sprint sesuai `tasks.md`.
3. Jalankan validasi lokal sebelum commit:

```bash
npm run typecheck --workspace=backend
npm run test --workspace=backend
npm run build --workspace=frontend
```

4. Buka Pull Request dengan ringkasan perubahan + bukti test.
5. Merge setelah review lulus.
