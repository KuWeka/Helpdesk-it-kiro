# Tasks — PoldaHelp Kalsel IT Helpdesk
> Daftar lengkap perbaikan, revisi, dan improvement berdasarkan hasil analisis teknis menyeluruh.  
> Dikerjakan secara berurutan per sprint. Tandai dengan `[x]` setelah selesai.

---

## Legenda Prioritas
- 🔴 **KRITIS** — bug nyata atau masalah yang berdampak langsung di production
- 🟠 **TINGGI** — masalah fungsional atau keamanan yang perlu segera dibenahi
- 🟡 **SEDANG** — code quality, maintainability, dan UX improvement
- 🟢 **RENDAH** — nice-to-have, feature gap, dan polishing

---

## Sprint 1 — Perbaikan Kritis
> Target: selesai dalam 1–2 hari. Semua item ini harus selesai sebelum project dianggap production-ready.

---

### 🔴 TASK-001 — Buat Singleton PrismaClient

**Masalah:** `new PrismaClient()` dipanggil di 13 file berbeda secara terpisah, membuka connection pool MySQL yang berlebihan.

**File yang terdampak:**
- `backend/src/services/authService.ts`
- `backend/src/services/ticketService.ts`
- `backend/src/services/staffService.ts`
- `backend/src/services/profileService.ts`
- `backend/src/services/reportService.ts`
- `backend/src/services/ratingService.ts`
- `backend/src/services/settingsService.ts`
- `backend/src/services/notificationService.ts`
- `backend/src/services/dashboardService.ts`
- `backend/src/services/auditService.ts`
- `backend/src/middleware/authenticate.ts`
- `backend/src/controllers/ticketController.ts`

**Langkah pengerjaan:**

- [x] Buat file baru `backend/src/lib/prisma.ts` dengan isi:
  ```ts
  import { PrismaClient } from '@prisma/client';

  const globalForPrisma = global as unknown as { prisma: PrismaClient };

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
  ```
- [x] Di setiap file yang terdampak, hapus baris `const prisma = new PrismaClient();`
- [x] Tambahkan import: `import { prisma } from '../lib/prisma';` (sesuaikan path relatif)
- [x] Khusus `ticketController.ts`: import dari `'../lib/prisma'`
- [x] Khusus `middleware/authenticate.ts`: import dari `'../lib/prisma'`
- [x] Verifikasi aplikasi masih berjalan normal setelah perubahan: `npm run dev --workspace=backend`

---

### 🔴 TASK-002 — Implementasi Server-Side Search untuk Tiket

**Masalah:** Frontend mengirim parameter `search` ke backend, tapi backend mengabaikannya. Search hanya bekerja pada data yang sudah ada di halaman saat ini (client-side), bukan seluruh dataset.

**Langkah pengerjaan:**

- [x] **`backend/src/services/ticketService.ts`** — tambahkan field `search` ke interface `TicketFilters`:
  ```ts
  export interface TicketFilters {
    search?: string; // ← tambahkan ini
    unrated?: boolean;
    startDate?: string;
    endDate?: string;
  }
  ```
- [x] Di fungsi `listForSatker`, tambahkan blok search di dalam where clause builder:
  ```ts
  if (filters?.search?.trim()) {
    where.OR = [
      { judul: { contains: filters.search.trim() } },
      { nomorTiket: { contains: filters.search.trim() } },
    ];
  }
  ```
- [x] Lakukan hal yang sama di fungsi `listForBidtekkom`, `listForPadal`, dan `listForTeknisi`
- [x] **`backend/src/controllers/ticketController.ts`** — parse parameter `search` dari query:
  ```ts
  const filters = {
    search: req.query.search as string | undefined, // ← tambahkan
    unrated: req.query.unrated === 'true',
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };
  ```
- [x] Test manual: buat beberapa tiket, lakukan search di halaman 2, pastikan hasil sesuai

---

### 🔴 TASK-003 — Sinkronisasi Tipe Pagination (Frontend ↔ Backend ↔ Shared)

**Masalah:** Tipe `PaginatedResult` didefinisikan 3 kali dengan nama field yang berbeda:
- Backend: `{ totalItems, pageSize }`
- Frontend `api.ts`: `{ total, limit }` ← **tidak match**
- Shared `types/api.ts`: `{ totalItems, pageSize }` ← sudah benar, tapi tidak dipakai

**Langkah pengerjaan:**

- [x] **`frontend/src/lib/api.ts`** — hapus definisi `PaginatedResult` lokal yang salah:
  ```ts
  // HAPUS ini:
  export interface PaginatedResult<T> {
    data: T[];
    total: number;    // ← salah, harusnya totalItems
    page: number;
    limit: number;    // ← salah, harusnya pageSize
    totalPages: number;
  }
  ```
- [x] Pastikan `shared` package sudah bisa diimport dari frontend. Cek `frontend/tsconfig.json` untuk path alias, atau gunakan import relatif:
  ```ts
  // Opsi A — jika workspace sudah terkonfigurasi:
  import type { PaginatedResult } from '@poldahelp/shared';

  // Opsi B — import relatif sebagai fallback:
  import type { PaginatedResult } from '../../shared/types/api';
  ```
- [x] Cari semua tempat di frontend yang mengakses `.total` atau `.limit` dari response pagination, ganti dengan `.totalItems` dan `.pageSize`
- [x] Verifikasi halaman tiket, staff, notifikasi, dan audit log masih menampilkan total data dengan benar

---

### 🔴 TASK-004 — Verifikasi Environment Variables di Vercel & Railway

**Masalah:** Jika `NEXT_PUBLIC_SOCKET_URL` atau `NEXT_PUBLIC_API_URL` tidak diset di Vercel, Socket.io tidak akan connect dan `refreshUser()` akan gagal terhubung ke localhost di production.

**Langkah pengerjaan:**

- [x] Login ke Vercel dashboard → project → Settings → Environment Variables
- [x] Pastikan variabel berikut sudah diset untuk environment **Production**:
  - `NEXT_PUBLIC_API_URL` = `https://[nama-backend].railway.app/api`
  - `NEXT_PUBLIC_SOCKET_URL` = `https://[nama-backend].railway.app`
  - `NEXT_PUBLIC_APP_NAME` = `PoldaHelp Kalsel`
- [x] Login ke Railway dashboard → backend service → Variables
- [x] Pastikan variabel berikut sudah diset:
  - `CORS_ORIGIN` = `https://[nama-project].vercel.app` (exact URL, tanpa trailing slash)
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `JWT_SECRET` (panjang, random, bukan placeholder)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - `PASSWORD_RESET_URL` = `https://[nama-project].vercel.app/reset-password`
- [x] Trigger redeploy di kedua platform setelah update env vars
- [x] Test: buka app di Vercel, login, pastikan Socket indicator terhubung

---

## Sprint 2 — Perbaikan Tinggi
> Target: selesai dalam 1–2 hari setelah Sprint 1.

---

### 🟠 TASK-005 — Validasi Status Filter di Backend

**Masalah:** Parameter `status` dari query string tidak divalidasi. Nilai sembarang bisa menyebabkan Prisma error yang tidak tertangani.

**Langkah pengerjaan:**

- [x] **`backend/src/controllers/ticketController.ts`** — tambahkan validasi status:
  ```ts
  const validStatuses = ['PENDING', 'PROSES', 'SELESAI', 'DIBATALKAN', 'ALL'] as const;
  const rawStatus = req.query.status as string | undefined;

  if (rawStatus && rawStatus !== 'ALL' && !validStatuses.includes(rawStatus as any)) {
    throw new AppError(400, 'INVALID_STATUS', 'Nilai status tidak valid');
  }

  const statusFilter = rawStatus && rawStatus !== 'ALL' ? rawStatus : undefined;
  ```
- [x] Teruskan `statusFilter` ke dalam `filters` yang dikirim ke service functions
- [x] Update interface `TicketFilters` di `ticketService.ts` untuk menyertakan field `status?: TicketStatus`
- [x] Di setiap fungsi list, tambahkan filter status jika ada:
  ```ts
  if (filters?.status) {
    where.status = filters.status;
  }
  ```
- [x] Test: kirim request dengan status tidak valid, pastikan dapat response 400

---

### 🟠 TASK-006 — Wajibkan `alasanBatal` untuk Pembatalan oleh Bidtekkom

**Masalah:** Bidtekkom bisa membatalkan tiket tanpa alasan, merusak audit trail. Satker tidak tahu mengapa tiketnya dibatalkan.

**Langkah pengerjaan:**

- [x] **`backend/src/services/ticketService.ts`** — di fungsi `cancel()`, tambahkan validasi sebelum update:
  ```ts
  // Setelah role-based authorization check
  if (actorRole === 'BIDTEKKOM' && (!alasanBatal || !alasanBatal.trim())) {
    throw new AppError(
      400,
      'REASON_REQUIRED',
      'Bidtekkom wajib menyertakan alasan pembatalan tiket'
    );
  }
  ```
- [x] **`backend/src/validators/ticket.ts`** — pertimbangkan membuat schema cancel yang berbeda untuk Satker vs Bidtekkom, atau buat logic di service seperti di atas
- [x] **`frontend/src/components/tickets/CancelTicketModal.tsx`** — tambahkan validasi di sisi frontend juga untuk UX yang lebih baik. Deteksi role user dan wajibkan field jika Bidtekkom:
  - Tambahkan prop `userRole` ke `CancelTicketModalProps`
  - Di fungsi `getValidationError()`, tambahkan:
    ```ts
    if (userRole === 'BIDTEKKOM' && !alasanBatal.trim()) {
      return 'Alasan pembatalan wajib diisi oleh Bidtekkom';
    }
    ```
  - Update label field menjadi: `Alasan Pembatalan <span>(wajib untuk Bidtekkom)</span>`
- [x] Test: login sebagai Bidtekkom, coba batalkan tiket tanpa alasan → harus error
- [x] Test: login sebagai Satker, batalkan tiket tanpa alasan → harus berhasil

---

### 🟠 TASK-007 — Filter Aktor dari Notifikasi Pembatalan

**Masalah:** Saat Bidtekkom membatalkan tiket, sistem mengirim notifikasi ke semua user Bidtekkom — termasuk yang baru saja melakukan pembatalan. Ini noise yang tidak perlu.

**Langkah pengerjaan:**

- [x] **`backend/src/services/ticketService.ts`** — di fungsi `cancel()`, pada bagian notifikasi ke Bidtekkom, tambahkan filter:
  ```ts
  const bidtekkomUsers = await prisma.user.findMany({
    where: {
      role: 'BIDTEKKOM',
      deletedAt: null,
      id: { not: actorId }, // ← filter aktor
    },
    select: { id: true },
  });
  ```
- [x] Juga pertimbangkan: jika yang membatalkan adalah Satker (pemilik tiket), apakah notifikasi ke creator (diri sendiri) perlu dikirim? Tambahkan guard:
  ```ts
  // Notify creator only if they didn't cancel it themselves
  if (ticket.creatorId !== actorId) {
    await notificationService.create({
      userId: ticket.creatorId,
      type: 'TICKET_CANCELLED',
      ticketNumber: ticket.nomorTiket,
      message: `Tiket ${ticket.nomorTiket} telah dibatalkan: ${ticket.judul}`,
    });
  }
  ```
- [x] Test: batalkan tiket sebagai Bidtekkom, pastikan user Bidtekkom yang membatalkan tidak mendapat notifikasi

---

### 🟠 TASK-008 — Hilangkan `any` Type pada Prisma Where Clauses

**Masalah:** Hampir semua service menggunakan `const where: any = {}` yang menghilangkan type safety TypeScript dan menyembunyikan potential bugs.

**File yang perlu diupdate:**
- `backend/src/services/ticketService.ts` (5 fungsi list)
- `backend/src/services/staffService.ts`
- `backend/src/services/reportService.ts`
- `backend/src/services/auditService.ts` (jika ada)

**Langkah pengerjaan:**

- [x] Di `ticketService.ts`, import tipe Prisma:
  ```ts
  import { PrismaClient, TicketCategory, Role, Prisma } from '@prisma/client';
  ```
- [x] Ganti semua `const where: any` dengan tipe yang benar:
  ```ts
  // Untuk ticket queries:
  const where: Prisma.TicketWhereInput = { creatorId: userId };

  // Untuk user queries:
  const where: Prisma.UserWhereInput = { role: 'PADAL' };

  // Untuk audit log queries:
  const where: Prisma.AuditLogWhereInput = {};
  ```
- [x] Lakukan hal yang sama di `staffService.ts` dan `reportService.ts`
- [x] Jalankan TypeScript check: `npm run typecheck` dari root — pastikan tidak ada error baru
- [x] Jika ada type error setelah perubahan, perbaiki sesuai dengan tipe yang benar

---

### 🟠 TASK-009 — Perbaiki `lazy require` di notificationService (Circular Dependency)

**Masalah:** `notificationService.ts` menggunakan `require('../server')` di dalam fungsi (lazy require) untuk mendapatkan instance Socket.io, menghindari circular dependency. Ini adalah anti-pattern yang rapuh.

**Langkah pengerjaan:**

- [x] **`backend/src/services/notificationService.ts`** — hapus fungsi `getIO()` dan `lazy require`
- [x] Refactor: buat file `backend/src/lib/socket.ts` sebagai singleton untuk io instance:
  ```ts
  import { Server } from 'socket.io';

  let _io: Server | null = null;

  export function setIO(io: Server) {
    _io = io;
  }

  export function getIO(): Server | null {
    return _io;
  }
  ```
- [x] **`backend/src/server.ts`** — setelah io dibuat, panggil `setIO(io)` dari lib/socket
- [x] **`backend/src/services/notificationService.ts`** — import `getIO` dari `'../lib/socket'` bukan dari server
- [x] Test: pastikan notifikasi real-time masih terkirim setelah perubahan

---

## Sprint 3 — Code Quality & Cleanup
> Target: selesai dalam 1 hari.

---

### 🟡 TASK-010 — Buat `formatters.ts` dan Konsolidasikan Fungsi Format

**Masalah:** Fungsi `formatDate`, `formatFileSize`, dan helper lainnya didefinisikan ulang di banyak page secara terpisah.

**File yang perlu diupdate:**
- `frontend/src/app/(dashboard)/dashboard/tickets/page.tsx`
- `frontend/src/app/(dashboard)/dashboard/tickets/[id]/page.tsx`
- `frontend/src/app/(dashboard)/dashboard/page.tsx`
- `frontend/src/app/(dashboard)/dashboard/audit-log/page.tsx`
- `frontend/src/app/(dashboard)/dashboard/notifications/page.tsx`

**Langkah pengerjaan:**

- [x] Buat file `frontend/src/lib/formatters.ts`:
  ```ts
  export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  export function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  ```
- [x] Di setiap page yang memiliki definisi lokal, hapus definisi tersebut dan tambahkan import:
  ```ts
  import { formatDate, formatDateTime, formatFileSize } from '@/lib/formatters';
  ```
- [x] Pastikan behavior tidak berubah setelah konsolidasi

---

### 🟡 TASK-011 — Manfaatkan Shared Package di Frontend

**Masalah:** `shared/types/` berisi tipe-tipe yang berguna tapi tidak digunakan oleh frontend — semua didefinisikan ulang secara lokal.

**Langkah pengerjaan:**

- [x] Verifikasi `shared` package sudah tercantum sebagai dependency di `frontend/package.json`. Jika belum:
  ```json
  "dependencies": {
    "@poldahelp/shared": "*"
  }
  ```
- [x] Di `frontend/src/lib/api.ts`:
  - Hapus `PaginatedResult` lokal
  - Hapus `ApiResponse` lokal jika ada
  - Tambahkan: `import type { PaginatedResult, ApiResponse } from '@poldahelp/shared';`
- [x] Cari penggunaan `Role`, `TicketStatus`, `TicketCategory` yang didefinisikan ulang sebagai string literal di frontend, ganti dengan import dari shared
- [x] Jalankan `npm run typecheck` dan pastikan tidak ada error

---

### 🟡 TASK-012 — Hapus atau Implementasikan `next-intl`

**Masalah:** Package `next-intl` terpasang, dikonfigurasi di `next.config.js` dengan `withNextIntl()` wrapper, tapi tidak satu pun komponen menggunakan `useTranslations()` atau `t()`.

**Opsi A — Hapus (direkomendasikan jika tidak ada rencana multi-bahasa):**

- [x] Hapus `next-intl` dari `frontend/package.json` dependencies
- [x] Di `frontend/next.config.js`, hapus `createNextIntlPlugin` dan `withNextIntl` wrapper, kembalikan ke:
  ```js
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
        },
      ];
    },
  };
  module.exports = nextConfig;
  ```
- [x] Hapus `frontend/src/i18n/config.ts` dan `frontend/src/i18n/request.ts`
- [x] Hapus `NEXT_PUBLIC_DEFAULT_LOCALE` dari env files
- [x] Jalankan `npm install` dan `npm run build` untuk memastikan tidak ada error

**Opsi B — Implementasikan minimal (jika multi-bahasa memang direncanakan):**

- [x] Buat `frontend/src/i18n/messages/id.json` dengan minimal satu string
- [x] Setup `next-intl` sesuai dokumentasi resmi dengan `NextIntlClientProvider`
- [x] Dokumentasikan cara menambah terjemahan baru di README

---

### 🟡 TASK-013 — Perbaiki Email Service: Graceful Error Handling

**Masalah:** `sendPasswordResetEmail` dipanggil secara synchronous tanpa fallback. Jika SMTP down, seluruh request password reset gagal tanpa pesan yang helpful bagi user.

**Langkah pengerjaan:**

- [x] **`backend/src/services/emailService.ts`** — tambahkan error type yang lebih spesifik:
  ```ts
  export class EmailServiceError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
      super(message);
      this.name = 'EmailServiceError';
    }
  }
  ```
- [x] Wrap nodemailer call dalam try-catch yang re-throw dengan error yang informatif
- [x] **`backend/src/services/authService.ts`** — di `requestPasswordReset()`, wrap email call:
  ```ts
  try {
    await sendPasswordResetEmail(user.email, resetToken);
  } catch (emailError) {
    // Hapus token yang sudah dibuat jika email gagal terkirim
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: null, passwordResetExpires: null },
    });
    throw new AppError(
      503,
      'EMAIL_SEND_FAILED',
      'Gagal mengirim email reset password. Silakan coba beberapa saat lagi.'
    );
  }
  ```
- [x] Test: matikan SMTP sementara dan coba forgot password — pastikan error message informatif

---

### 🟡 TASK-014 — Tambahkan Cache Sederhana untuk Authenticate Middleware

**Masalah:** Middleware `authenticate` melakukan DB query (`findUnique`) di setiap request untuk memverifikasi user tidak di-soft-delete. Di traffic tinggi ini menambah beban DB signifikan.

**Langkah pengerjaan:**

- [x] Buat `backend/src/lib/authCache.ts` dengan in-memory cache menggunakan Map:
  ```ts
  interface CacheEntry {
    isActive: boolean;
    cachedAt: number;
  }

  const cache = new Map<string, CacheEntry>();
  const TTL_MS = 60 * 1000; // 60 detik

  export function getCachedUserStatus(userId: string): boolean | null {
    const entry = cache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > TTL_MS) {
      cache.delete(userId);
      return null;
    }
    return entry.isActive;
  }

  export function setCachedUserStatus(userId: string, isActive: boolean) {
    cache.set(userId, { isActive, cachedAt: Date.now() });
  }

  export function invalidateCachedUser(userId: string) {
    cache.delete(userId);
  }
  ```
- [x] **`backend/src/middleware/authenticate.ts`** — gunakan cache:
  ```ts
  import { getCachedUserStatus, setCachedUserStatus } from '../lib/authCache';

  // Setelah decode JWT, sebelum DB query:
  const cachedStatus = getCachedUserStatus(decoded.userId);
  if (cachedStatus === false) {
    // User sudah dinonaktifkan (cached)
    return res.status(401).json({ ... });
  }

  if (cachedStatus === null) {
    // Cache miss — query DB
    const user = await prisma.user.findUnique({ ... });
    setCachedUserStatus(decoded.userId, user !== null && user.deletedAt === null);
  }
  ```
- [x] **`backend/src/services/staffService.ts`** — saat soft-delete user, invalidate cache:
  ```ts
  import { invalidateCachedUser } from '../lib/authCache';
  // Setelah update deletedAt:
  invalidateCachedUser(userId);
  ```
- [x] Test: soft-delete user, verifikasi user tidak bisa akses dalam 1 menit berikutnya

---

### 🟡 TASK-015 — Perbaiki Middleware Matcher di Frontend

**Masalah:** `frontend/src/middleware.ts` hanya mencocokkan `/dashboard/:path*` tapi tidak mencakup auth pages untuk redirect-jika-sudah-login behavior.

**Langkah pengerjaan:**

- [x] **`frontend/src/middleware.ts`** — update `config.matcher`:
  ```ts
  export const config = {
    matcher: [
      '/dashboard/:path*',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
    ],
  };
  ```
- [x] Verifikasi behavior: user yang sudah login mengakses `/login` → di-redirect ke `/dashboard`
- [x] Verifikasi behavior: user yang belum login mengakses `/dashboard` → di-redirect ke `/login`

---

### 🟡 TASK-016 — Konsistensi Penggunaan TanStack Query

**Masalah:** Beberapa page menggunakan TanStack Query (via hooks di `hooks/useTickets.ts`) tapi beberapa page lain menggunakan `useState + useEffect + fetch` manual (dashboard/page.tsx, tickets/page.tsx). Ini inkonsisten dan menyulitkan maintenance.

**Langkah pengerjaan:**

- [x] Audit semua page: identifikasi mana yang masih pakai manual fetch vs React Query
- [x] Untuk page yang masih manual, migrasikan ke `useQuery` dari TanStack Query (`tickets/page.tsx`, `staff/page.tsx`, `teams/page.tsx`)
- [x] Gunakan hook yang sudah ada secara konsisten (`useTickets`, `useStaff`, dan hook teams)
- [x] Pastikan `staleTime` yang reasonable dikonfigurasi di semua query hasil migrasi (contoh: `staleTime: 30_000` untuk dashboard-like data)
- [x] Tambahkan penanganan error yang konsisten di semua query hasil migrasi

---

## Sprint 4 — Feature Gaps & Business Logic
> Target: dikerjakan sesuai prioritas bisnis.

---

### 🟢 TASK-017 — Tambahkan Status Tiket DITOLAK

**Masalah:** Tidak ada mekanisme untuk Bidtekkom menolak tiket yang tidak valid. DIBATALKAN memiliki semantik yang berbeda dengan DITOLAK.

**Langkah pengerjaan:**

**Backend:**
- [x] **`backend/src/prisma/schema.prisma`** — tambahkan ke enum `TicketStatus`:
  ```prisma
  enum TicketStatus {
    PENDING
    PROSES
    SELESAI
    DIBATALKAN
    DITOLAK  // ← tambahkan
  }
  ```
- [x] Tambahkan ke `AuditEventType`:
  ```prisma
  TICKET_REJECTION  // ← tambahkan
  ```
- [x] Jalankan migration: `npm run prisma:migrate --workspace=backend`
- [x] Buat fungsi `rejectTicket()` di `ticketService.ts`:
  - Validasi: tiket harus berstatus `PENDING`
  - Hanya Bidtekkom yang bisa menolak
  - `alasanTolak` wajib diisi
  - Update status ke `DITOLAK`, simpan `alasanBatal` (atau tambahkan field `alasanTolak` baru)
  - Log audit `TICKET_REJECTION`
  - Kirim notifikasi ke creator Satker
- [x] Tambahkan route di `backend/src/routes/tickets.ts`:
  ```ts
  router.patch('/:id/reject', authenticate, authorize(Role.BIDTEKKOM), validate(rejectTicketSchema), rejectTicket);
  ```
- [x] Buat validator `rejectTicketSchema` di `validators/ticket.ts` (alasanTolak wajib, 1-500 karakter)

**Frontend:**
- [x] Tambahkan `DITOLAK` ke `StatusBadge` component dengan warna yang tepat (merah gelap / rose)
- [x] Tambahkan `DITOLAK` ke `STATUS_OPTIONS` di filter tickets page
- [x] Tambahkan tombol "Tolak Tiket" di ticket detail page untuk role Bidtekkom (hanya untuk tiket PENDING)
- [x] Buat modal `RejectTicketModal.tsx` dengan field alasan yang wajib diisi
- [x] Tambahkan `rejectTicket` ke `ticketApi` di `api.ts`
- [x] Update `lib/status-config.ts` untuk menyertakan status `DITOLAK`

**Shared:**
- [x] Update enum `TicketStatus` di `shared/types/index.ts`

---

### 🟢 TASK-018 — Prevent Railway Cold Start dengan Health Check Ping

**Masalah:** Railway pada Hobby plan bisa sleep setelah idle, menyebabkan cold start dan Socket.io connection loss.

**Langkah pengerjaan:**

- [x] Buka UptimeRobot (https://uptimerobot.com) — daftar akun gratis
- [x] Tambahkan monitor baru:
  - Monitor Type: HTTP(s)
  - URL: `https://[nama-backend].railway.app/api/health`
  - Monitoring Interval: 5 menit
- [x] Verifikasi endpoint `/api/health` sudah return `{ status: 'ok' }` (sudah ada di `app.ts`)
- [x] Alternatif: upgrade ke Railway Pro plan untuk menghindari sleep sama sekali

---

### 🟢 TASK-019 — Tambahkan `notFound` dan Error Boundary di Ticket Detail

**Masalah:** Jika user mengakses URL tiket yang tidak ada atau tidak authorized, halaman hanya menampilkan loading spinner yang stuck.

**Langkah pengerjaan:**

- [x] **`frontend/src/app/(dashboard)/dashboard/tickets/[id]/page.tsx`** — tambahkan handling untuk 404 dan 403:
  ```tsx
  if (error) {
    const status = (error as any)?.response?.status;
    if (status === 404) {
      return <div>Tiket tidak ditemukan.</div>; // atau gunakan notFound() dari next/navigation
    }
    if (status === 403) {
      return <div>Anda tidak memiliki akses ke tiket ini.</div>;
    }
    return <div>Terjadi kesalahan: {errorMessage}</div>;
  }
  ```
- [x] Buat `EmptyState` variant untuk 403 dan 404 yang konsisten dengan design system
- [x] Import dan gunakan `notFound()` dari `next/navigation` untuk 404 agar memanfaatkan Next.js not-found page

---

### 🟢 TASK-020 — Tambahkan Loading State dan Optimistic Update yang Konsisten

**Masalah:** Beberapa action (assign, complete, cancel) sudah menggunakan optimistic update, tapi tidak konsisten antar halaman dan komponen.

**Langkah pengerjaan:**

- [x] Audit semua action buttons: pastikan semua memiliki `disabled` state saat loading
- [x] Pastikan `isLoading` state di-set saat action sedang berjalan dan di-unset setelah selesai (success atau error)
- [x] Tambahkan `Loader2` spinner pada button yang sedang loading — konsisten menggunakan pattern:
  ```tsx
  <Button disabled={isLoading}>
    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isLoading ? 'Memproses...' : 'Selesaikan Tiket'}
  </Button>
  ```
- [x] Test semua action di koneksi lambat untuk memastikan UX tidak membingungkan

---

### 🟢 TASK-021 — Tambahkan Konfirmasi Logout

**Masalah:** Tombol logout langsung logout tanpa konfirmasi. Ini bisa tidak disengaja, terutama di mobile.

**Langkah pengerjaan:**

- [x] **`frontend/src/components/layout/Header.tsx`** atau `Sidebar.tsx` — wrap logout dengan `ConfirmModal`:
  ```tsx
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Di JSX:
  <ConfirmModal
    open={showLogoutConfirm}
    onConfirm={logout}
    onCancel={() => setShowLogoutConfirm(false)}
    title="Keluar dari Aplikasi?"
    description="Anda akan keluar dari sesi ini."
    confirmLabel="Keluar"
    variant="destructive"
  />
  ```
- [x] Test di mobile viewport untuk memastikan modal tampil dengan benar

---

## Sprint 5 — Polish & Production Hardening
> Dikerjakan sebagai finishing touch sebelum go-live.

---

### 🟢 TASK-022 — Audit dan Bersihkan Console.log di Production

**Masalah:** Beberapa `console.log` debug masih ada di `socket/index.ts` dan `SocketProvider.tsx` yang akan muncul di browser console user di production.

**Langkah pengerjaan:**

- [x] Cari semua `console.log` dan `console.error` di seluruh codebase:
  ```bash
  grep -r "console\.log" backend/src/ frontend/src/ --include="*.ts" --include="*.tsx"
  ```
- [x] **`backend/src/socket/index.ts`** — ganti `console.log` dengan logger yang respects NODE_ENV:
  ```ts
  import { logger } from '../utils/logger';
  logger.info(`[Socket.io] User ${user.nama} connected`);
  ```
- [x] **`frontend/src/providers/SocketProvider.tsx`** — hapus atau wrap `console.log` dalam `if (process.env.NODE_ENV === 'development')`:
  ```ts
  if (process.env.NODE_ENV === 'development') {
    console.log('[Socket.io] Connected');
  }
  ```
- [x] Verifikasi `backend/src/utils/logger.ts` sudah dikonfigurasi untuk tidak output di production

---

### 🟢 TASK-023 — Tambahkan Request ID untuk Tracing

**Masalah:** Saat error terjadi di production, sulit untuk menelusuri request mana yang menyebabkan error karena tidak ada unique identifier per request.

**Langkah pengerjaan:**

- [x] Install package: `npm install uuid --workspace=backend` (sudah ada)
- [x] **`backend/src/app.ts`** — tambahkan middleware request ID sebelum routes:
  ```ts
  import { v4 as uuidv4 } from 'uuid';

  app.use((req, _res, next) => {
    (req as any).requestId = uuidv4();
    next();
  });
  ```
- [x] Update global error handler untuk menyertakan `requestId` di response error
- [x] Update logger untuk menyertakan `requestId` di setiap log line

---

### 🟢 TASK-024 — Rate Limiting untuk API Tiket

**Masalah:** Saat ini rate limiting hanya ada untuk auth endpoints (register, login, password reset). Endpoint tiket tidak memiliki rate limit, berpotensi abuse.

**Langkah pengerjaan:**

- [x] **`backend/src/middleware/rateLimit.ts`** — tambahkan limiter untuk tiket:
  ```ts
  export const ticketCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 jam
    max: 20, // max 20 tiket per jam per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Terlalu banyak tiket dibuat. Silakan coba lagi nanti.'),
  });
  ```
- [x] **`backend/src/routes/tickets.ts`** — apply limiter ke endpoint create:
  ```ts
  router.post('/', authenticate, authorize(Role.SATKER), ticketCreateLimiter, ...);
  ```

---

### 🟢 TASK-025 — Tambahkan Helmet.js untuk HTTP Security Headers

**Masalah:** Backend tidak menggunakan security headers standar (X-Content-Type-Options, X-Frame-Options, dll).

**Langkah pengerjaan:**

- [x] Install: `npm install helmet --workspace=backend`
- [x] Install types: `npm install -D @types/helmet --workspace=backend`
- [x] **`backend/src/app.ts`** — tambahkan setelah import, sebelum CORS:
  ```ts
  import helmet from 'helmet';

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // untuk Cloudinary assets
  }));
  ```
- [x] Test: cek response headers di browser DevTools → Network tab → Response Headers

---

### 🟢 TASK-026 — Validasi UUID di Route Params

**Masalah:** Route params seperti `/:id` di tickets dan staff tidak divalidasi formatnya. Non-UUID string bisa menyebabkan Prisma error yang verbose.

**Langkah pengerjaan:**

- [x] **`backend/src/validators/ticket.ts`** — tambahkan schema untuk params:
  ```ts
  export const ticketIdParamSchema = z.object({
    id: z.string().uuid({ message: 'ID tiket harus berformat UUID yang valid' }),
  });
  ```
- [x] **`backend/src/routes/tickets.ts`** — tambahkan validasi di route yang menggunakan `:id`:
  ```ts
  import { validateMultiple } from '../middleware/validate';

  router.get('/:id', authenticate,
    validate(ticketIdParamSchema, 'params'),
    getTicketById
  );
  ```
- [x] Lakukan hal yang sama untuk staff routes (`/:id` di user management)

---

### 🟢 TASK-027 — Update README dengan Dokumentasi Development

**Masalah:** Tidak ada README yang menjelaskan cara setup, development workflow, dan deployment.

**Langkah pengerjaan:**

- [x] Buat `README.md` di root project dengan seksi:
  - **Overview** — deskripsi singkat sistem dan roles
  - **Tech Stack** — daftar teknologi yang digunakan
  - **Prerequisites** — Node.js versi, MySQL, environment setup
  - **Setup Lokal** — langkah clone, install, migrate, seed, run dev
  - **Environment Variables** — penjelasan setiap env var yang dibutuhkan
  - **Deployment** — Vercel (frontend) + Railway (backend) setup guide
  - **Struktur Folder** — penjelasan struktur monorepo
  - **Development Workflow** — branching strategy, cara membuat fitur baru
- [x] Buat `backend/src/prisma/README.md` dengan dokumentasi schema dan cara menambah migration

---

## Checklist Verifikasi Akhir (Pre-Launch)

Sebelum dinyatakan production-ready, pastikan semua checklist berikut terpenuhi:

### Backend
- [x] `npm run typecheck` di root — tidak ada TypeScript error
- [x] `npm run lint --workspace=backend` — tidak ada ESLint warning/error
- [x] `npm run test --workspace=backend` — semua test pass
- [x] Satu instance PrismaClient (verifikasi dengan grep: `grep -r "new PrismaClient" backend/src/`)
- [x] Tidak ada `console.log` yang tersisa di production code (kecuali yang terwrap dev check)
- [x] Semua environment variables terdokumentasi di `.env.example`
- [x] `railway.json` sudah dikonfigurasi dengan benar

### Frontend
- [x] `npm run build --workspace=frontend` — build sukses tanpa error
- [x] `npm run lint --workspace=frontend` — tidak ada ESLint warning/error
- [ ] Semua `NEXT_PUBLIC_*` vars sudah diset di Vercel
- [x] Tidak ada hardcoded URL `localhost` yang tertinggal di source code production
- [ ] Dark mode berfungsi dengan benar di semua halaman

### Deployment
- [x] Railway backend: health check `/api/health` return 200
- [ ] Vercel frontend: semua route accessible tanpa 404
- [ ] CORS berfungsi: frontend Vercel bisa call backend Railway
- [ ] Socket.io terkoneksi: indikator koneksi muncul di UI
- [ ] Upload file berfungsi: upload foto profil dan attachment tiket berhasil ke Cloudinary
- [ ] Email berfungsi: forgot password flow berhasil mengirim email
- [x] UptimeRobot atau ping service sudah aktif

### Fungsional
- [ ] Register → login → buat tiket → assign → selesaikan → rating → flow lengkap berjalan
- [x] Notifikasi real-time terkirim saat tiket di-assign dan diselesaikan
- [x] Search tiket berfungsi cross-page (tidak hanya filter client-side)
- [x] Soft-delete user: user yang dihapus tidak bisa login
- [x] Export PDF dan Excel laporan bulanan berfungsi
- [x] Audit log mencatat semua event yang seharusnya

---

## Ringkasan Item per Sprint

| Sprint | Judul | Jumlah Task | Estimasi |
|--------|-------|-------------|----------|
| Sprint 1 | Perbaikan Kritis | 4 tasks | 1–2 hari |
| Sprint 2 | Perbaikan Tinggi | 5 tasks | 1–2 hari |
| Sprint 3 | Code Quality | 7 tasks | 1–2 hari |
| Sprint 4 | Feature Gaps | 5 tasks | 2–3 hari |
| Sprint 5 | Production Hardening | 6 tasks | 1 hari |
| **Total** | | **27 tasks** | **~7–10 hari** |

---

*Dokumen ini dibuat berdasarkan analisis menyeluruh terhadap source code project versi `remake kiro pt2` yang di-deploy di Vercel + Railway. Update dokumen ini seiring dengan pengerjaan task.*

