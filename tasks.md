# Implementation Plan: PoldaHelp Kalsel IT Helpdesk Ticketing System

## Overview

Full-stack monorepo implementation of an IT Helpdesk Ticketing system for Polda Kalimantan Selatan. Built with Next.js 14 (frontend), Express.js + Prisma + MySQL (backend), Socket.io (real-time), and shadcn/ui (design system). Implementation follows 6 phases: project setup, backend APIs, frontend setup, frontend pages, integration, and polish.

## Tasks

- [x] 1. FASE 1: Project Setup, Database Schema, and Seed Data
  - [x] 1.1 Initialize monorepo structure with root package.json workspace config
    - Create root `package.json` with workspaces for `frontend/`, `backend/`, and `shared/`
    - Create root `tsconfig.json` with path aliases
    - Create `.env.example` files for both frontend and backend
    - _Requirements: N/A (infrastructure)_
  - [x] 1.2 Set up backend project with Express.js, TypeScript, and dependencies
    - Initialize `backend/package.json` with express, prisma, @prisma/client, jsonwebtoken, bcryptjs, multer, nodemailer, socket.io, zod, uuid, express-rate-limit, cors, dotenv, exceljs, pdfkit
    - Configure `backend/tsconfig.json` with strict mode
    - Create `backend/src/app.ts` with Express app setup, CORS, JSON parsing, and error handler
    - Create `backend/src/server.ts` entry point with HTTP server and Socket.io attachment
    - _Requirements: N/A (infrastructure)_
  - [x] 1.3 Create shared types and constants package
    - Create `shared/types/index.ts` with Role, TicketStatus, TicketCategory, NotificationType, AuditEventType (including TEAM_ASSIGNMENT and TEAM_REMOVAL values) enums
    - Create `shared/constants/index.ts` with role labels, status labels, category labels
    - Create `shared/types/api.ts` with ApiError, PaginatedResult, ApiResponse interfaces
    - _Requirements: 7.1, 17.1_
  - [x] 1.4 Define Prisma schema with all models and relations
    - Create `backend/src/prisma/schema.prisma` with User, Ticket, TicketSequence, Attachment, Rating, Notification, AuditLog, SystemSettings models
    - Include all enums: Role, TicketStatus, TicketCategory, AuditEventType (include TEAM_ASSIGNMENT, TEAM_REMOVAL), NotificationType
    - Define all indexes and relations as specified in design
    - **NOTE:** AuditEventType enum must include: LOGIN, REGISTRATION, TICKET_CREATION, TICKET_ASSIGNMENT, TICKET_COMPLETION, TICKET_CANCELLATION, TICKET_RATING, USER_SOFT_DELETE, ROLE_CHANGE, PASSWORD_RESET, PASSWORD_CHANGE, SETTINGS_CHANGE, TEAM_ASSIGNMENT, TEAM_REMOVAL
    - _Requirements: 1.1, 5.1, 9.1, 10.7, 11.4, 21.2_
  - [x] 1.5 Create and run initial database migration
    - **⚠️ STOP: Sebelum menjalankan migrasi, konfirmasikan 6 enum TicketCategory (HARDWARE, SOFTWARE, JARINGAN, EMAIL, WEBSITE, LAINNYA) kepada pihak Bidtekkom Polda Kalsel. Jangan jalankan migrate sebelum ada persetujuan.**
    - Run `npx prisma migrate dev --name init` to generate migration
    - Verify all tables, indexes, and constraints are created correctly
    - _Requirements: N/A (infrastructure)_
  - [x] 1.6 Create seed data script with test users for all 4 roles
    - Create `backend/src/prisma/seed.ts` with bcrypt-hashed passwords
    - Seed: 1 Bidtekkom, 2 Padal, 3 Teknisi (assigned to Padal), 3 Satker (with divisi set)
    - Seed: 1 SystemSettings record with default app name
    - Seed: Sample tickets in various statuses for testing
    - _Requirements: 1.1, 11.5_
  - [x] 1.7 Create backend utility modules
    - Create `backend/src/utils/AppError.ts` custom error class with code, statusCode, message, details
    - Create `backend/src/utils/ticketNumber.ts` with atomic sequence generation using Prisma transaction
    - Create `backend/src/utils/fileNaming.ts` with UUID-based filename generator
    - Create `backend/src/utils/logger.ts` with basic console logger
    - _Requirements: 5.1, 5.2, 22.5_

- [x] 2. Checkpoint - Verify database and project structure
  - Ensure Prisma migration runs successfully, seed data populates, and TypeScript compiles without errors. Ask the user if questions arise.


- [x] 3. FASE 2: Backend Middleware and Auth Service
  - [x] 3.1 Implement JWT authentication middleware
    - Create `backend/src/middleware/authenticate.ts` that extracts Bearer token, verifies with jwt.verify, checks user is not soft-deleted, attaches payload to req.user
    - Return 401 for missing/invalid/expired tokens
    - _Requirements: 2.1, 17.1, 17.2_
  - [x] 3.2 Implement role-based authorization middleware
    - Create `backend/src/middleware/authorize.ts` factory function accepting allowed roles array
    - Return 403 Forbidden if user role not in allowed list
    - _Requirements: 17.3, 17.4, 17.5, 17.7, 17.8, 17.9_
  - [x] 3.3 Implement rate limiting middleware
    - Create `backend/src/middleware/rateLimit.ts` with configurable limits per endpoint
    - Registration: 5 requests/hour/IP, Login: 10 requests/15min/IP, Password reset: 5 requests/hour/IP
    - Return 429 with retryAfter field when exceeded
    - _Requirements: 1.3, 1.4, 2.3, 2.4, 3.6_
  - [x] 3.4 Implement Zod validation middleware
    - Create `backend/src/middleware/validate.ts` that validates req.body/params/query against Zod schemas
    - Return 400 VALIDATION_ERROR with field-specific details on failure
    - _Requirements: 1.2, 1.9, 4.2_
  - [x] 3.5 Implement Multer file upload middleware
    - Create `backend/src/middleware/upload.ts` with disk storage, UUID filenames, size limit (5MB), and format filter
    - Allowed ticket formats: jpg, jpeg, png, pdf, doc, docx, xls, xlsx
    - Allowed photo formats: jpg, jpeg, png
    - Allowed logo formats: jpg, jpeg, png, svg
    - _Requirements: 4.6, 4.7, 18.5, 18.6, 20.3, 20.4, 22.1, 22.2, 22.3_
  - [x] 3.6 Implement Auth Service (register, login)
    - Create `backend/src/services/authService.ts` with register (bcrypt hash, create user with SATKER role) and login (verify credentials, generate JWT with 24h expiry)
    - Reject soft-deleted accounts on login
    - Do not accept divisi during registration
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 2.1, 2.2, 2.5, 25.1_
  - [x] 3.7 Implement Auth Service (password reset flow)
    - Add requestPasswordReset (generate crypto token, hash and store, send email via Nodemailer, same response for non-existent emails)
    - Add resetPassword (verify token not expired, validate new password, update hash, invalidate token)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.8 Implement Email Service with Nodemailer
    - Create `backend/src/services/emailService.ts` with SMTP transporter configuration
    - Implement sendPasswordResetEmail with reset URL and 15-minute expiry message
    - _Requirements: 3.1_
  - [x] 3.9 Create Auth validators (Zod schemas)
    - Create `backend/src/validators/auth.ts` with registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema
    - Password: 8-128 chars, 1 uppercase, 1 number; Email: valid format; Nama: 2-100 chars; WhatsApp: 9-15 digits
    - _Requirements: 1.2, 1.9, 3.4_
  - [x] 3.10 Create Auth routes and controller
    - Create `backend/src/controllers/authController.ts` and `backend/src/routes/auth.ts`
    - POST /api/auth/register, POST /api/auth/login, POST /api/auth/forgot-password, POST /api/auth/reset-password
    - Wire rate limiting per endpoint
    - _Requirements: 1.1, 2.1, 3.1, 3.2_
  - [x] 3.11 Write property tests for password validation (Property 1)
    - **Property 1: Password Validation**
    - Test that any string not meeting all requirements (8-128 chars, 1 uppercase, 1 number) is rejected
    - **Validates: Requirements 1.2, 3.4**
  - [x] 3.12 Write property tests for password hashing (Property 2)
    - **Property 2: Password Hashing Invariant**
    - Test that stored hash differs from plaintext and bcrypt.compare returns true
    - **Validates: Requirements 1.6**
  - [x] 3.13 Write property tests for JWT token correctness (Property 3)
    - **Property 3: JWT Token Correctness**
    - Test that JWT decodes to correct userId, nama, email, role and expires in 24h
    - **Validates: Requirements 2.1**
  - [x] 3.14 Write property tests for password reset round-trip (Property 4)
    - **Property 4: Password Reset Round-Trip**
    - Test old password fails, new password works, token is invalidated after use
    - **Validates: Requirements 3.2**

- [x] 4. FASE 2: Audit Service and Ticket Service
  - [x] 4.1 Implement Audit Service
    - Create `backend/src/services/auditService.ts` with log() and getAuditLogs() methods
    - Store eventType, actorId, actorNama, targetEntityId, metadata, timestamp
    - Support pagination, search by actorNama/targetEntityId, filter by eventType/date range
    - _Requirements: 21.1, 21.2, 21.3, 21.5_
  - [x] 4.2 Implement Ticket Service (create, list, getById)
    - Create `backend/src/services/ticketService.ts`
    - create(): validate divisi set, check unrated SELESAI tickets, generate ticket number atomically, store attachments, set divisiSatker from user
    - list methods: role-scoped queries (Satker own, Bidtekkom all, Padal assigned, Teknisi via padal)
    - listForSatker(): support query filter `unrated=true` to return only SELESAI tickets without rating
    - listForTeknisi(): return empty array `[]` if Teknisi has no padalId (Req 17.6)
    - getById(): with authorization check based on role; return 403 for Teknisi without Padal
    - _Requirements: 4.1, 4.2, 4.3, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 17.3, 17.4, 17.5, 17.6, 17.7, 25.4, 26.1, 26.2, 26.3, 26.4_
  - [x] 4.3 Implement Ticket Service (assign, complete, cancel)
    - assignToPadal(): validate PENDING status, validate target is active Padal, set padalId + status PROSES + tanggalAssign
    - markComplete(): validate PROSES status, validate assigned Padal is actor, set SELESAI + tanggalSelesai
    - cancel():
      - **Satker**: hanya bisa cancel tiket miliknya sendiri (creatorId === actorId), reject 403 jika bukan miliknya
      - **Bidtekkom**: bisa cancel tiket siapapun selama status PENDING/PROSES
      - Validate PENDING/PROSES status, set DIBATALKAN + alasanBatal
    - Use optimistic locking pattern (updateMany with status WHERE clause) for concurrency
    - _Requirements: 6.1, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.8, 8.1, 8.3, 8.4, 27.1, 27.2, 27.3, 27.6_
  - [x] 4.4 Implement Ticket Number generation utility
    - Use Prisma transaction to atomically increment TicketSequence for current year
    - Format: TKT-{YYYY}-{00001-99999}
    - Start at 00001 for new year, reject if 99999 reached
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 4.5 Create Ticket validators (Zod schemas)
    - Create `backend/src/validators/ticket.ts` with createTicketSchema, assignTicketSchema, cancelTicketSchema
    - judul: 1-150 chars, deskripsi: 1-2000 chars, kategori: enum, lokasi: 1-200 chars
    - _Requirements: 4.1, 4.2_
  - [x] 4.6 Create Ticket routes and controller
    - Create `backend/src/controllers/ticketController.ts` and `backend/src/routes/tickets.ts`
    - POST /api/tickets (Satker), GET /api/tickets (all auth), GET /api/tickets/:id (authorized)
    - PATCH /api/tickets/:id/assign (Bidtekkom), PATCH /api/tickets/:id/complete (Padal), PATCH /api/tickets/:id/cancel (Satker/Bidtekkom)
    - GET /api/tickets/:id/attachments/:fileId (authorized)
    - _Requirements: 4.1, 6.1, 7.1, 8.1, 22.5, 27.1_
  - [x] 4.7 Write property tests for ticket number format and uniqueness (Property 5)
    - **Property 5: Ticket Number Format and Uniqueness**
    - Test format TKT-{YYYY}-{5-digit}, uniqueness across all tickets
    - **Validates: Requirements 5.1, 5.2, 5.5**
  - [x] 4.8 Write property tests for ticket status transitions (Property 6)
    - **Property 6: Ticket Status Transition State Machine**
    - Test only valid transitions succeed, invalid transitions rejected, ticket unchanged on rejection
    - **Validates: Requirements 7.1, 7.2, 7.3, 6.4, 8.3**
  - [x] 4.9 Write property tests for ticket creation preconditions (Property 7)
    - **Property 7: Ticket Creation Preconditions**
    - Test rejection when unrated SELESAI tickets exist or divisi is null, divisiSatker matches user divisi on success
    - **Validates: Requirements 4.3, 4.8, 4.9**
  - [x] 4.10 Write property tests for file upload validation (Property 8)
    - **Property 8: File Upload Validation**
    - Test acceptance only when size <= 5MB AND extension allowed, max 10 per ticket
    - **Validates: Requirements 4.6, 4.7, 22.2, 22.3, 22.6, 22.7**

- [x] 5. Checkpoint - Verify Auth and Ticket APIs
  - Ensure all auth endpoints work (register, login, forgot/reset password), ticket CRUD with status transitions, and audit logging. Ask the user if questions arise.

- [x] 6. FASE 2: Rating, Notification, Staff, Report, Profile, and Dashboard Services
  - [x] 6.1 Implement Rating Service
    - Create `backend/src/services/ratingService.ts`
    - submitRating(): validate ticket SELESAI, user is creator, no existing rating, bintang 1-5, feedback 1-1000 chars non-whitespace-only
    - After successful rating submit, call `auditService.log({ eventType: 'TICKET_RATING', actorId: userId, targetEntityId: ticketId, metadata: { bintang, nomorTiket } })`
    - getRatingByTicket(): return rating or null
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [x] 6.2 Create Rating routes and controller
    - POST /api/tickets/:id/rating (Satker, ticket owner)
    - GET /api/tickets/:id/rating (authorized viewers)
    - _Requirements: 9.1, 9.6_
  - [x] 6.3 Implement Notification Service
    - Create `backend/src/services/notificationService.ts`
    - create(): persist notification + emit via Socket.io to user room
    - getByUser(): paginated (50/page), ordered by createdAt desc, include unread count
    - markAsRead(), markAllAsRead(), deleteNotification(): ownership validation (403 if not owner)
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_
  - [x] 6.4 Create Notification routes and controller
    - GET /api/notifications, PATCH /api/notifications/:id/read, PATCH /api/notifications/read-all, DELETE /api/notifications/:id
    - _Requirements: 10.4, 10.5, 10.6_
  - [x] 6.5 Implement Socket.io server setup with JWT authentication
    - Create `backend/src/socket/index.ts` with io.use() JWT middleware
    - On connection: join user to room `user_{userId}`
    - On disconnect: leave room
    - Reject invalid/expired tokens with error event
    - _Requirements: 10.1, 10.2_
  - [x] 6.6 Wire notification triggers into Ticket Service
    - Ticket created → notify all Bidtekkom
    - Ticket assigned → notify assigned Padal
    - Ticket completed → notify creator Satker
    - Ticket cancelled → notify creator Satker + assigned Padal (if exists)
    - _Requirements: 4.4, 6.2, 7.5, 7.6_
  - [x] 6.7 Implement Staff Service
    - Create `backend/src/services/staffService.ts`
    - listUsers(): paginated (20/page), with role/status filters
    - changeRole(): update role, audit log with old/new role
    - resetPassword(): generate 12+ char temp password (upper+lower+number), hash, return plaintext once
    - softDelete(): check active tickets, return HAS_ACTIVE_TICKETS if exists without forceDelete, else set deletedAt
    - addTeknisiToPadal(): validate Teknisi not already in a team (409 CONFLICT if padalId not null) + `auditService.log({ eventType: 'TEAM_ASSIGNMENT', actorId, targetEntityId: teknisiId, metadata: { padalId } })`
    - removeTeknisiFromPadal(): clear padalId + `auditService.log({ eventType: 'TEAM_REMOVAL', actorId, targetEntityId: teknisiId, metadata: { padalId } })`
    - getPadalTeams(), getAvailableTeknisi()
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_
  - [x] 6.8 Create Staff routes and controller
    - GET /api/staff/users, PATCH /api/staff/users/:id/role, POST /api/staff/users/:id/reset-password, DELETE /api/staff/users/:id
    - GET /api/staff/teams, POST /api/staff/teams/:padalId/members, DELETE /api/staff/teams/:padalId/members/:teknisiId
    - All Bidtekkom-only access
    - _Requirements: 11.1, 11.5, 11.7_
  - [x] 6.9 Implement Report Service
    - Create `backend/src/services/reportService.ts`
    - getMonthlyReport(): filter by month/year, scope by role (Bidtekkom=all, Padal=own)
    - Include semua kolom Req 12.3: nomorTiket, judul, namaSatker, divisiSatker, lokasi, tanggalBuat, tanggalAssign, tanggalSelesai, status, rating.bintang, rating.feedback
    - Query harus include relasi: creator (for namaSatker), padal, rating
    - Summary: total, per-status counts, average rating (1 decimal, null if no ratings)
    - exportPDF(): generate PDF using **pdfkit** with tabular layout + summary
    - exportExcel(): generate .xlsx using **exceljs** with data sheet + summary section
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  - [x] 6.10 Create Report routes and controller
    - GET /api/reports/monthly, GET /api/reports/monthly/pdf, GET /api/reports/monthly/excel
    - Bidtekkom and Padal access only
    - _Requirements: 12.1, 12.8_
  - [x] 6.11 Implement Profile Service
    - Create `backend/src/services/profileService.ts`
    - getProfile(), updateProfile() (nama, nomorWhatsApp, divisi for Satker only), changePassword() (verify current, validate new)
    - Photo upload: replace existing, 5MB max, jpg/jpeg/png only
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 25.3_
  - [x] 6.12 Create Profile routes and controller
    - GET /api/profile, PATCH /api/profile, PATCH /api/profile/password, POST /api/profile/photo
    - GET /api/profile/photo/:userId → serve profile photo file (authenticated access)
    - _Requirements: 18.1, 18.3, 18.5_
  - [x] 6.12b Create static file serving endpoints
    - GET /api/settings/logo → serve system logo file (public, used in login page and sidebar)
    - Verify GET /api/tickets/:id/attachments/:fileId (already in task 4.6) has proper auth check per role
    - _Requirements: 20.3, 22.5_
  - [x] 6.13 Implement Dashboard endpoints (4 role-specific)
    - GET /api/dashboard/satker: own ticket counts by status, 10 recent tickets, unrated SELESAI count
    - GET /api/dashboard/bidtekkom: total tickets, per-status counts, user count, monthly trend (12 months), 10 recent, 10 unassigned PENDING
    - GET /api/dashboard/padal: active (PROSES) count, completed count, avg rating, team members
    - GET /api/dashboard/teknisi: **hasPadal: boolean** flag, active count, completed count (from Padal's tickets). When hasPadal=false, return `{ hasPadal: false, activeCount: 0, completedCount: 0 }` (not 404 or empty object)
    - _Requirements: 13.1, 13.2, 13.3, 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 16.1, 16.2, 16.4, 16.5_
  - [x] 6.14 Implement System Settings Service and routes
    - GET /api/settings: return current settings. **If SystemSettings table is empty (no record), return default values `{ appName: 'PoldaHelp Kalsel', appLogo: null }` without error.** Use findFirst with fallback to defaults.
    - PATCH /api/settings (appName), POST /api/settings/logo
    - Bidtekkom-only for mutations, authenticated for read
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_
  - [x] 6.15 Create Audit Log routes and controller
    - GET /api/audit with pagination (20/page), search, filter by eventType/date range, sort by timestamp desc
    - Bidtekkom-only access
    - _Requirements: 21.3, 21.4_
  - [x] 6.16 Write property tests for rating validation (Property 9)
    - **Property 9: Rating Validation and Preconditions**
    - Test all preconditions: SELESAI status, creator only, no existing rating, bintang 1-5, feedback non-whitespace 1-1000
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
  - [x] 6.17 Write property tests for notification ownership (Property 10)
    - **Property 10: Notification Ownership Enforcement**
    - Test operations succeed only for notification owner, 403 for others
    - **Validates: Requirements 10.4, 10.6, 10.8**
  - [x] 6.18 Write property tests for notification ordering (Property 11)
    - **Property 11: Notification Ordering and Pagination**
    - Test descending order by createdAt, max 50/page, unread count accuracy
    - **Validates: Requirements 10.9**
  - [x] 6.19 Write property tests for role-based data scoping (Property 12)
    - **Property 12: Role-Based Data Scoping**
    - Test each role sees only their scoped tickets, 403 for out-of-scope access
    - **Validates: Requirements 17.3, 17.4, 17.5, 17.7, 17.10**
  - [x] 6.20 Write property tests for report date filtering (Property 13)
    - **Property 13: Monthly Report Date Filtering**
    - Test exact month/year filtering, Padal scoping
    - **Validates: Requirements 12.1, 12.2**
  - [x] 6.21 Write property tests for report summary aggregation (Property 14)
    - **Property 14: Report Summary Aggregation**
    - Test total equals ticket count, per-status sums to total, avg rating calculation
    - **Validates: Requirements 12.6**

- [x] 7. Checkpoint - Verify all backend APIs complete
  - Ensure all 40+ API endpoints respond correctly, Socket.io connects with JWT, notifications emit in real-time, and all audit events are logged. Ask the user if questions arise.


- [x] 8. FASE 3: Frontend Project Setup and Core Infrastructure
  - [x] 8.1 Initialize Next.js 14 project with App Router and TypeScript
    - Create `frontend/` with Next.js 14, TypeScript, Tailwind CSS, next-themes
    - Configure `next.config.js` with API proxy to backend
    - Configure `tailwind.config.ts` with design tokens (colors, spacing, typography)
    - _Requirements: 23.1, 23.6_
  - [x] 8.2 Install and configure shadcn/ui component library
    - Run shadcn/ui init, install all needed components: Button, Input, Select, Card, Table, Dialog, Sheet, Badge, Alert, Tabs, Skeleton, Toast, DropdownMenu, Avatar, Form, Label, Textarea
    - _Requirements: 23.1_
  - [x] 8.3 Set up next-intl for internationalization
    - Create `frontend/src/i18n/config.ts` with locales ['id', 'en'] and defaultLocale 'id'
    - Create `frontend/src/i18n/messages/id.json` with all Indonesian translations
    - Create `frontend/src/i18n/messages/en.json` with English structure (content for future)
    - Configure next-intl middleware and provider
    - _Requirements: 19.2, 19.3, 19.4_
  - [x] 8.4 Create API client with Axios interceptors
    - Create `frontend/src/lib/api.ts` with base URL, Bearer token injection, 401 redirect to login
    - Create typed API functions for each endpoint group (auth, tickets, staff, etc.)
    - _Requirements: 17.2_
  - [x] 8.5 Create Auth context provider and store
    - Create `frontend/src/providers/AuthProvider.tsx` with login/logout/token state
    - Store JWT in localStorage, decode user payload, provide useAuth() hook
    - Handle token expiry detection and redirect to login
    - **NOTE: localStorage digunakan untuk simplisitas MVP. Untuk production yang lebih aman, pertimbangkan HttpOnly cookie. Pastikan semua input di-sanitize untuk mencegah XSS.**
    - _Requirements: 2.1_
  - [x] 8.6 Create Theme provider with next-themes
    - Create `frontend/src/providers/ThemeProvider.tsx` wrapping next-themes
    - Support light/dark modes, persist preference
    - _Requirements: 19.1, 19.3, 19.4_
  - [x] 8.7 Create Socket.io client provider
    - Create `frontend/src/providers/SocketProvider.tsx` with connection lifecycle
    - Connect on auth, disconnect on logout, listen for 'notification' events
    - Provide useSocket() hook with socket instance, isConnected, unreadCount
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 8.8 Create Toast notification provider
    - Create `frontend/src/providers/ToastProvider.tsx` using shadcn/ui Toast
    - Show toast on Socket.io notification events and API success/error responses
    - _Requirements: 23.9_
  - [x] 8.9 Set up Next.js middleware for route protection
    - Create `frontend/src/middleware.ts` to check JWT presence on dashboard routes
    - Redirect unauthenticated users to /login
    - Redirect authenticated users from /login to /dashboard
    - **Add role-guard per route group:**
      - `/dashboard/staff`, `/dashboard/teams`, `/dashboard/audit-log`, `/dashboard/system-settings` → BIDTEKKOM only
      - `/dashboard/reports` → BIDTEKKOM, PADAL
      - `/dashboard/my-team` → PADAL only
      - `/dashboard/create-ticket` → SATKER only
      - Redirect ke `/unauthorized` jika role tidak sesuai (Req 17.9)
    - _Requirements: 17.1, 17.2, 17.9_
  - [x] 8.10 Create shared Zod validation schemas for frontend
    - Create `frontend/src/schemas/auth.ts`: registerSchema (nama 2-100, email valid, nomorWhatsApp 9-15 digits numeric `/^\d{9,15}$/`, password 8-128 with uppercase+number)
    - Create `frontend/src/schemas/profile.ts`: profileSchema (nomorWhatsApp **10-15 digits numeric `/^\d{10,15}$/`** per Req 18.7 — different from register's 9-15)
    - Create `frontend/src/schemas/ticket.ts`, `frontend/src/schemas/rating.ts`
    - Mirror backend validation rules for client-side validation
    - _Requirements: 1.9, 18.7, 23.7_

- [x] 9. FASE 3: Layout Components
  - [x] 9.1 Create Sidebar component with role-based menu items
    - Create `frontend/src/components/layout/Sidebar.tsx`
    - Render menu items in exact order per role (Req 28.1-28.4)
    - Highlight active menu item with distinct background/accent
    - Display user nama, role badge, and photo/initials avatar in footer
    - Show notification badge with unread count on Notifikasi item
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6_
  - [x] 9.2 Create MobileDrawer component for viewport < 1024px
    - Create `frontend/src/components/layout/MobileDrawer.tsx` using shadcn/ui Sheet
    - Open from left side via hamburger icon, close on outside tap/Escape/menu selection
    - _Requirements: 24.1, 24.2_
  - [x] 9.3 Create Header component with mobile hamburger and user menu
    - Create `frontend/src/components/layout/Header.tsx`
    - Show hamburger on mobile, notification bell with badge, user dropdown
    - _Requirements: 24.2_
  - [x] 9.4 Create DashboardLayout wrapper component
    - Create `frontend/src/app/(dashboard)/layout.tsx`
    - Compose Sidebar (desktop) + MobileDrawer (mobile) + Header + main content area
    - Wrap with SocketProvider and fetch system settings for app name/logo
    - _Requirements: 24.1, 24.2, 28.7_
  - [x] 9.5 Create AuthLayout for login/register/reset pages
    - Create `frontend/src/app/(auth)/layout.tsx`
    - Centered card layout with app logo and name
    - _Requirements: 20.3_
  - [x] 9.6 Create error pages (403 Unauthorized, 404 Not Found)
    - Create `frontend/src/app/(dashboard)/unauthorized/page.tsx` for role mismatch (shown when user accesses route not permitted for their role)
    - Create `frontend/src/app/not-found.tsx` for 404 routes
    - Middleware route guard: redirect to /unauthorized if role does not match required role for route
    - _Requirements: 17.9_

- [x] 10. Checkpoint - Verify frontend infrastructure
  - Ensure Next.js compiles, shadcn/ui components render, auth flow works (login stores token, logout clears), sidebar renders correct menu per role, and Socket.io connects. Ask the user if questions arise.


- [x] 11. FASE 4: Auth Pages (Login, Register, Password Reset)
  - [x] 11.1 Create Login page
    - Create `frontend/src/app/(auth)/login/page.tsx`
    - React Hook Form + Zod validation, email + password fields
    - On success: store token, redirect to /dashboard
    - Show inline field errors, toast on server error
    - _Requirements: 2.1, 2.2, 23.3, 23.7, 23.9_
  - [x] 11.2 Create Register page
    - Create `frontend/src/app/(auth)/register/page.tsx`
    - Fields: nama, email, nomorWhatsApp, password, confirm password
    - Inline validation errors, no divisi field
    - On success: redirect to login with success message
    - _Requirements: 1.1, 1.2, 1.7, 1.9, 23.3, 25.1_
  - [x] 11.3 Create Forgot Password page
    - Create `frontend/src/app/(auth)/forgot-password/page.tsx`
    - Email input, submit sends reset request, show success message regardless of email existence
    - _Requirements: 3.1, 3.5_
  - [x] 11.4 Create Reset Password page
    - Create `frontend/src/app/(auth)/reset-password/page.tsx`
    - Read token from URL query param, new password + confirm fields
    - Validate password requirements, show success and redirect to login
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 12. FASE 4: Dashboard Pages (All 4 Roles)
  - [x] 12.1 Create shared dashboard components
    - Create `frontend/src/components/dashboard/StatCard.tsx` for summary cards
    - Create `frontend/src/components/shared/EmptyState.tsx` for empty states
    - Create `frontend/src/components/shared/LoadingSkeleton.tsx` for loading states
    - _Requirements: 23.5_
  - [x] 12.2 Create Satker Dashboard page
    - Create `frontend/src/app/(dashboard)/dashboard/page.tsx` (role-conditional rendering)
    - Stat cards: PENDING, PROSES, SELESAI, DIBATALKAN counts
    - UnratedTicketsBanner: amber alert when unrated SELESAI tickets exist
    - Recent tickets table (10 rows, sorted by tanggalBuat desc)
    - Empty state when no tickets
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 12.3 Create Bidtekkom Dashboard page
    - Stat cards: total tickets, PENDING, PROSES, SELESAI, total users
    - Bar chart: distribusi tiket per status (PENDING, PROSES, SELESAI, DIBATALKAN) using Recharts
    - Line chart (monthly ticket creation trend, 12 months) using Recharts
    - Recent tickets table (10 rows, all Satker)
    - Unassigned tickets section (10 oldest PENDING) with quick-assign button
    - **Create QuickAssignModal component** (`components/dashboard/QuickAssignModal.tsx`): dropdown of active Padal users, validate Padal is active, call PATCH /api/tickets/:id/assign, update table optimistically, follow standard assignment flow (status→PROSES, notification, audit)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 23.2_
  - [x] 12.4 Create Padal Dashboard page
    - Stat cards: active (PROSES) count, completed count, avg rating
    - Active tickets table with "Selesai" button, sorted by tanggalAssign asc
    - Confirmation modal for "Selesai" action
    - Team section listing Teknisi (nama + WhatsApp), empty state if no members
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  - [x] 12.5 Create Teknisi Dashboard page
    - TeknisiNoPadalState: show only unassigned message when hasPadal=false (hide cards + table)
    - Stat cards: active count, completed count (when assigned)
    - Read-only ticket table (PROSES from Padal), no action buttons
    - Empty state when no PROSES tickets
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 13. FASE 4: Ticket Pages (List, Detail, Create)
  - [x] 13.1 Create Ticket List page with TanStack Table
    - Create `frontend/src/app/(dashboard)/tickets/page.tsx`
    - Role-specific columns and actions per Req 26.1-26.4
    - Pagination (10/25/50 rows), sorting, status filter
    - **Handle query param `unrated=true` to pre-filter table showing only SELESAI tickets without rating (for Satker, linked from UnratedTicketsBanner)**
    - "Lihat Detail" button, "Batalkan" button (Satker PENDING/PROSES), "Assign" button (Bidtekkom PENDING), "Selesai" button (Padal PROSES)
    - Empty state when no tickets
    - _Requirements: 23.8, 26.1, 26.2, 26.3, 26.4, 26.7_
  - [x] 13.2 Create Ticket Detail page
    - Create `frontend/src/app/(dashboard)/tickets/[id]/page.tsx`
    - Display all ticket info: nomorTiket, judul, deskripsi, kategori, lokasi, namaSatker, divisiSatker, status, timestamps, attachments (downloadable), assigned Padal, rating
    - Show dash/empty for unset fields (tanggalAssign, tanggalSelesai, padal)
    - Teknisi: read-only view without action buttons
    - _Requirements: 26.5_
  - [x] 13.3 Create InlineRatingForm component (NOT modal)
    - Create `frontend/src/components/tickets/InlineRatingForm.tsx`
    - Render within ticket detail page when: status=SELESAI, user is Satker creator, no existing rating
    - Star selection (1-5), feedback textarea (1-500 chars di UI / max 1000 di backend)
    - NOTE: Frontend form limit 500 chars (Req 26.6); backend validator accepts up to 1000 (Req 9.1)
    - _Requirements: 9.1, 26.6_
  - [x] 13.4 Create RatingDisplay component
    - Create `frontend/src/components/tickets/RatingDisplay.tsx`
    - Show stars, feedback text, and submission date when rating exists
    - _Requirements: 26.5_
  - [x] 13.5 Create Ticket Creation page
    - Create `frontend/src/app/(dashboard)/create-ticket/page.tsx`
    - DivisiRequiredBanner: redirect to settings if divisi not set
    - Form: judul, deskripsi, kategori (dropdown), lokasi, file attachments (max 10, 5MB each)
    - File upload preview with remove button, format/size validation client-side
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 4.9, 22.6, 25.4_
  - [x] 13.6 Create Ticket Cancellation modal
    - Create `frontend/src/components/shared/ConfirmModal.tsx` (reusable)
    - Cancellation-specific: show ticket identifier, optional reason textarea (max 500 chars), confirm/cancel buttons
    - _Requirements: 23.4, 27.4, 27.5_
  - [x] 13.7 Create StatusBadge component
    - Create `frontend/src/components/tickets/StatusBadge.tsx`
    - Color-coded badges for PENDING, PROSES, SELESAI, DIBATALKAN
    - _Requirements: 23.6_

- [x] 14. FASE 4: Staff Management Pages
  - [x] 14.1 Create Staff Management (User List) page
    - Create `frontend/src/app/(dashboard)/staff/page.tsx`
    - TanStack Table with columns: nama, email, nomorWhatsApp, divisi, role, status (active/inactive)
    - Pagination (20/page), role filter, search
    - Actions: Change Role dropdown, Reset Password button, Delete button
    - _Requirements: 11.1, 23.8_
  - [x] 14.2 Create Role Change functionality
    - Dropdown with valid roles, confirmation modal, audit logged
    - _Requirements: 11.2_
  - [x] 14.3 Create TempPasswordModal component
    - Create `frontend/src/components/staff/TempPasswordModal.tsx`
    - Confirmation modal first, then one-time display modal with copyable password
    - LOCAL state only, clear on close, warning "hanya ditampilkan sekali"
    - _Requirements: 11.3_
  - [x] 14.4 Create ActiveTicketWarningModal for soft-delete
    - Create `frontend/src/components/staff/ActiveTicketWarningModal.tsx`
    - Show when API returns HAS_ACTIVE_TICKETS with activeTicketCount
    - Confirm to force-delete, cancel to abort
    - _Requirements: 11.9_
  - [x] 14.5 Create Team Management page
    - Create `frontend/src/app/(dashboard)/teams/page.tsx`
    - List all Padal with their Teknisi members
    - Add Teknisi dropdown (filter: padalId === null only)
    - Remove Teknisi button with confirmation
    - _Requirements: 11.5, 11.6, 11.7, 11.8_

- [x] 15. FASE 4: Reports, Audit Log, Notifications, and Settings Pages
  - [x] 15.1 Create Monthly Report page
    - Create `frontend/src/app/(dashboard)/reports/page.tsx`
    - Month/year selector, data table with report columns (Req 12.3)
    - Summary section: total, per-status counts, avg rating
    - Export buttons: PDF and Excel download
    - Padal sees only own tickets, Bidtekkom sees all
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  - [x] 15.2 Create Audit Log page
    - Create `frontend/src/app/(dashboard)/audit-log/page.tsx`
    - TanStack Table (20 rows/page), search by actorNama/targetEntityId
    - Filter by eventType dropdown and date range picker
    - Sorted by timestamp desc by default
    - _Requirements: 21.3, 21.4_
  - [x] 15.3 Create Notifications page
    - Create `frontend/src/app/(dashboard)/notifications/page.tsx`
    - List notifications ordered by timestamp desc, 50/page
    - Mark as read (individual + all), delete individual
    - Read/unread visual distinction, unread count in header
    - _Requirements: 10.4, 10.5, 10.6, 10.9_
  - [x] 15.4 Create Settings page (Profile, Security, Preferences tabs)
    - Create `frontend/src/app/(dashboard)/settings/page.tsx` with tab navigation
    - Profile tab: nama, nomorWhatsApp, divisi (Satker only with highlight when empty), photo upload
    - Security tab: change password form (current + new + confirm)
    - Preferences tab: theme toggle (light/dark), language selector (id/en)
    - DivisiRequiredBanner + field highlight when divisi empty for Satker
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.7, 19.1, 19.2, 25.2, 25.3_
  - [x] 15.5 Create System Settings page (Bidtekkom only)
    - Create `frontend/src/app/(dashboard)/system-settings/page.tsx`
    - App name input (1-100 chars), logo upload (5MB, jpg/jpeg/png/svg)
    - Preview current logo, save button
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  - [x] 15.6 Create Padal "Tim Saya" read-only page
    - Create `frontend/src/app/(dashboard)/my-team/page.tsx` (separate route from Bidtekkom /teams)
    - Read-only list of assigned Teknisi with nama and nomorWhatsApp
    - Sidebar route for Padal: "Tim Saya" → `/dashboard/my-team`
    - _Requirements: 15.3, 28.3_

- [x] 16. Checkpoint - Verify all frontend pages render correctly
  - Ensure all pages render with correct data, forms validate, tables paginate, and role-based visibility works. Ask the user if questions arise.


- [x] 17. FASE 5: Real-Time Integration and Error Handling
  - [x] 17.1 Integrate Socket.io client with notification UI
    - Connect SocketProvider to notification bell badge (unread count)
    - Show toast on incoming notification event
    - Update notification list in real-time without page refresh
    - _Requirements: 10.3, 10.7_
  - [x] 17.2 Implement global error handling with toast notifications
    - API errors (non-validation) show toast with error message
    - Success operations show success toast
    - 401 responses trigger logout and redirect
    - _Requirements: 23.9_
  - [x] 17.3 Implement loading states with skeleton placeholders
    - Add Skeleton components to all data-fetching pages (dashboard, tickets, staff, reports, audit)
    - Match skeleton dimensions to expected content structure
    - _Requirements: 23.5_
  - [x] 17.4 Implement optimistic UI updates for ticket actions
    - Assign ticket: update table immediately, revert on error
    - Complete ticket: update status badge immediately
    - Cancel ticket: update status immediately
    - _Requirements: 6.1, 8.1, 27.1_
  - [x] 17.5 Implement sidebar menu update on role change
    - When user navigates after role change, re-fetch user profile
    - Update sidebar menu items to reflect new role without manual logout
    - _Requirements: 28.7_

- [x] 18. FASE 6: Design System Polish, Responsive, and Dark Mode
  - [x] 18.1 Implement responsive table behavior for mobile
    - Enable horizontal scroll within table containers on viewport < 1024px
    - Ensure no page-level horizontal overflow from 320px to 1919px
    - Minimum touch target 44x44px for all interactive elements on mobile
    - _Requirements: 24.3, 24.4, 24.5_
  - [x] 18.2 Implement dark mode support across all components
    - Ensure all shadcn/ui components respect dark mode via next-themes
    - Charts (Recharts) adapt colors for dark mode
    - Custom components use design token CSS variables for both modes
    - _Requirements: 19.1, 23.6_
  - [x] 18.3 Polish confirmation modals for all destructive actions
    - Verify all destructive actions (delete account, cancel ticket, remove team member) show confirmation modal
    - Modal states action type, affected entity, confirm + cancel buttons
    - _Requirements: 23.4_
  - [x] 18.4 Verify form validation UX across all forms
    - Inline error messages below fields within 200ms
    - No alert boxes or toast for validation errors
    - React Hook Form + Zod on all forms
    - _Requirements: 23.3, 23.7_
  - [x] 18.5 Final accessibility and design token audit
    - Verify color contrast ratios meet WCAG AA
    - Verify focus indicators on all interactive elements
    - Verify keyboard navigation works for modals and dropdowns
    - _Requirements: 23.6_

- [x] 19. Final Checkpoint - Full system verification
  - Ensure all tests pass, all pages render correctly in both light and dark mode, responsive layout works from 320px to 1919px, Socket.io notifications work end-to-end, and all role-based access controls are enforced. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout (Express.js backend + Next.js frontend)
- fast-check library is used for all property-based tests
- All 14 correctness properties from the design are covered in optional test tasks

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["1.5", "1.7"] },
    { "id": 4, "tasks": ["1.6"] },
    { "id": 5, "tasks": ["3.1", "3.3", "3.4", "3.5", "3.9"] },
    { "id": 6, "tasks": ["3.2", "3.6", "3.8"] },
    { "id": 7, "tasks": ["3.7", "3.10"] },
    { "id": 8, "tasks": ["3.11", "3.12", "3.13", "3.14"] },
    { "id": 9, "tasks": ["4.1", "4.4", "4.5"] },
    { "id": 10, "tasks": ["4.2"] },
    { "id": 11, "tasks": ["4.3", "4.6"] },
    { "id": 12, "tasks": ["4.7", "4.8", "4.9", "4.10"] },
    { "id": 13, "tasks": ["6.1", "6.3", "6.5", "6.7", "6.9", "6.11", "6.14"] },
    { "id": 14, "tasks": ["6.2", "6.4", "6.6", "6.8", "6.10", "6.12", "6.12b", "6.13", "6.15"] },
    { "id": 15, "tasks": ["6.16", "6.17", "6.18", "6.19", "6.20", "6.21"] },
    { "id": 16, "tasks": ["8.1"] },
    { "id": 17, "tasks": ["8.2", "8.3", "8.4", "8.10"] },
    { "id": 18, "tasks": ["8.5", "8.6", "8.7", "8.8", "8.9"] },
    { "id": 19, "tasks": ["9.1", "9.2", "9.3", "9.5", "9.6"] },
    { "id": 20, "tasks": ["9.4"] },
    { "id": 21, "tasks": ["11.1", "11.2", "11.3", "11.4"] },
    { "id": 22, "tasks": ["12.1"] },
    { "id": 23, "tasks": ["12.2", "12.3", "12.4", "12.5"] },
    { "id": 24, "tasks": ["13.1", "13.5", "13.6", "13.7"] },
    { "id": 25, "tasks": ["13.2", "13.3", "13.4"] },
    { "id": 26, "tasks": ["14.1", "14.5"] },
    { "id": 27, "tasks": ["14.2", "14.3", "14.4"] },
    { "id": 28, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5", "15.6"] },
    { "id": 29, "tasks": ["17.1", "17.2", "17.3"] },
    { "id": 30, "tasks": ["17.4", "17.5"] },
    { "id": 31, "tasks": ["18.1", "18.2", "18.3", "18.4", "18.5"] }
  ]
}
```