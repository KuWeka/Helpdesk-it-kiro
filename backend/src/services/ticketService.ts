import { prisma } from '../lib/prisma';
import { TicketCategory, Role, Prisma, TicketStatus } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { generateTicketNumber } from '../utils/ticketNumber';
import { generateUniqueFilename } from '../utils/fileNaming';
import * as auditService from './auditService';
import * as notificationService from './notificationService';


// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CreateTicketData {
  judul: string;
  deskripsi: string;
  kategori: TicketCategory;
  lokasi: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface TicketFilters {
  status?: TicketStatus;
  search?: string;
  unrated?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ─── Create Ticket ───────────────────────────────────────────────────────────

/**
 * Create a new ticket for a Satker user.
 *
 * Validates:
 * 1. User has divisi set (Req 4.9)
 * 2. No unrated SELESAI tickets exist (Req 4.3)
 * 3. Generates ticket number atomically (Req 5.1, 5.2)
 * 4. Sets divisiSatker from user's divisi (Req 4.8)
 * 5. Creates attachment records if files provided
 * 6. Logs audit event TICKET_CREATION (Req 4.5)
 */
export async function create(
  userId: string,
  data: CreateTicketData,
  files?: Express.Multer.File[]
) {
  // 1. Get user and check divisi is set
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  if (!user.divisi) {
    throw new AppError(
      400,
      'DIVISI_REQUIRED',
      'Silakan lengkapi divisi di profil Anda terlebih dahulu'
    );
  }

  // 2. Check for unrated SELESAI tickets
  const unratedCount = await prisma.ticket.count({
    where: {
      creatorId: userId,
      status: 'SELESAI',
      rating: null,
    },
  });

  if (unratedCount > 0) {
    throw new AppError(
      400,
      'UNRATED_TICKETS_EXIST',
      'Anda memiliki tiket selesai yang belum diberi rating'
    );
  }

  // 3. Generate ticket number atomically
  const nomorTiket = await generateTicketNumber(prisma);

  // 4. Create ticket with status PENDING and divisiSatker from user
  const ticket = await prisma.ticket.create({
    data: {
      nomorTiket,
      judul: data.judul,
      deskripsi: data.deskripsi,
      kategori: data.kategori,
      lokasi: data.lokasi,
      status: 'PENDING',
      divisiSatker: user.divisi,
      creatorId: userId,
    },
  });

  // 5. Create attachment records if files provided
  let attachments: Array<{
    id: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
  }> = [];

  if (files && files.length > 0) {
    const attachmentData = files.map((file) => ({
      ticketId: ticket.id,
      originalName: file.originalname,
      storedName: file.path || file.filename || generateUniqueFilename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
    }));

    await prisma.attachment.createMany({
      data: attachmentData,
    });

    // Fetch created attachments
    attachments = await prisma.attachment.findMany({
      where: { ticketId: ticket.id },
      select: {
        id: true,
        originalName: true,
        storedName: true,
        mimeType: true,
        size: true,
      },
    });
  }

  // 6. Log audit event
  await auditService.log({
    eventType: 'TICKET_CREATION',
    actorId: userId,
    actorNama: user.nama,
    targetEntityId: nomorTiket,
    metadata: {
      ticketId: ticket.id,
      judul: data.judul,
      kategori: data.kategori,
    },
  });

  // 7. Notify all Bidtekkom users about new ticket (Req 4.4)
  try {
    const bidtekkomUsers = await prisma.user.findMany({
      where: { role: 'BIDTEKKOM', deletedAt: null },
      select: { id: true },
    });

    await Promise.all(
      bidtekkomUsers.map((btUser) =>
        notificationService.create({
          userId: btUser.id,
          type: 'TICKET_CREATED',
          ticketNumber: nomorTiket,
          message: `Tiket baru ${nomorTiket} telah dibuat: ${data.judul}`,
        })
      )
    );
  } catch {
    // Notification failure should not break ticket creation
  }

  return {
    ...ticket,
    attachments,
  };
}

// ─── List for Satker ─────────────────────────────────────────────────────────

/**
 * List tickets created by a Satker user.
 * Supports `unrated=true` filter to return only SELESAI tickets without rating.
 * Paginated, sorted by tanggalBuat desc.
 */
export async function listForSatker(
  userId: string,
  pagination: PaginationParams = {},
  filters?: TicketFilters
): Promise<PaginatedResult<any>> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 20;
  const skip = (page - 1) * pageSize;

  // Build where clause (TASK-008: Use Prisma type instead of any)
  const where: Prisma.TicketWhereInput = {
    creatorId: userId,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search?.trim()) {
    where.OR = [
      { judul: { contains: filters.search.trim() } },
      { nomorTiket: { contains: filters.search.trim() } },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    where.tanggalBuat = {};
    if (filters.startDate) where.tanggalBuat.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.tanggalBuat.lte = end;
    }
  }


  if (filters?.search?.trim()) {
    where.OR = [
      { judul: { contains: filters.search.trim() } },
      { nomorTiket: { contains: filters.search.trim() } },
    ];
  }
  // Support unrated=true filter (Req 26.1-26.4)
  if (filters?.unrated) {
    where.status = 'SELESAI';
    where.rating = null;
  }

  const [totalItems, data] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { tanggalBuat: 'desc' },
      skip,
      take: pageSize,
      include: {
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
          },
        },
        rating: {
          select: {
            id: true,
            bintang: true,
            feedback: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

// ─── List for Bidtekkom ──────────────────────────────────────────────────────

/**
 * List all tickets for Bidtekkom.
 * Paginated, sorted by tanggalBuat desc.
 * Includes creator relation (nama).
 */
export async function listForBidtekkom(
  pagination: PaginationParams = {},
  filters?: TicketFilters
): Promise<PaginatedResult<any>> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.TicketWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search?.trim()) {
    where.OR = [
      { judul: { contains: filters.search.trim() } },
      { nomorTiket: { contains: filters.search.trim() } },
    ];
  }
  
  if (filters?.startDate || filters?.endDate) {
    where.tanggalBuat = {};
    if (filters.startDate) where.tanggalBuat.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.tanggalBuat.lte = end;
    }
  }

  const [totalItems, data] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { tanggalBuat: 'desc' },
      skip,
      take: pageSize,
      include: {
        creator: {
          select: {
            id: true,
            nama: true,
            divisi: true,
          },
        },
        padal: {
          select: {
            id: true,
            nama: true,
          },
        },
        rating: {
          select: {
            id: true,
            bintang: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

// ─── List for Padal ──────────────────────────────────────────────────────────

/**
 * List tickets assigned to a specific Padal.
 * Paginated, sorted by tanggalBuat desc.
 */
export async function listForPadal(
  padalId: string,
  pagination: PaginationParams = {},
  filters?: TicketFilters
): Promise<PaginatedResult<any>> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.TicketWhereInput = { padalId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search?.trim()) {
    where.OR = [
      { judul: { contains: filters.search.trim() } },
      { nomorTiket: { contains: filters.search.trim() } },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    where.tanggalBuat = {};
    if (filters.startDate) where.tanggalBuat.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.tanggalBuat.lte = end;
    }
  }

  const [totalItems, data] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { tanggalBuat: 'desc' },
      skip,
      take: pageSize,
      include: {
        creator: {
          select: {
            id: true,
            nama: true,
            divisi: true,
          },
        },
        rating: {
          select: {
            id: true,
            bintang: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

// ─── List for Teknisi ────────────────────────────────────────────────────────

/**
 * List tickets visible to a Teknisi (via their assigned Padal).
 * If Teknisi has no padalId, returns empty array with pagination metadata (Req 17.6).
 */
export async function listForTeknisi(
  teknisiId: string,
  pagination: PaginationParams = {},
  filters?: TicketFilters
): Promise<PaginatedResult<any>> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 20;

  // Get teknisi to check padalId
  const teknisi = await prisma.user.findUnique({
    where: { id: teknisiId },
    select: { padalId: true },
  });

  if (!teknisi || !teknisi.padalId) {
    // Req 17.6: return empty array if Teknisi has no padalId
    return {
      data: [],
      pagination: {
        page,
        pageSize,
        totalItems: 0,
        totalPages: 0,
      },
    };
  }

  const skip = (page - 1) * pageSize;
  const where: Prisma.TicketWhereInput = { padalId: teknisi.padalId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search?.trim()) {
    where.OR = [
      { judul: { contains: filters.search.trim() } },
      { nomorTiket: { contains: filters.search.trim() } },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    where.tanggalBuat = {};
    if (filters.startDate) where.tanggalBuat.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.tanggalBuat.lte = end;
    }
  }

  const [totalItems, data] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { tanggalBuat: 'desc' },
      skip,
      take: pageSize,
      include: {
        creator: {
          select: {
            id: true,
            nama: true,
            divisi: true,
          },
        },
        padal: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

// ─── Get By ID ───────────────────────────────────────────────────────────────

/**
 * Get a ticket by ID with authorization check based on role.
 *
 * Authorization rules:
 * - SATKER: must be the creator
 * - BIDTEKKOM: always allowed
 * - PADAL: must be the assigned padal
 * - TEKNISI: must have padalId matching ticket's padalId; if no padalId → 403
 *
 * Returns 404 if ticket not found, 403 if not authorized.
 */
export async function getById(
  ticketId: string,
  userId: string,
  userRole: Role
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      creator: {
        select: {
          id: true,
          nama: true,
          email: true,
          divisi: true,
        },
      },
      padal: {
        select: {
          id: true,
          nama: true,
        },
      },
      attachments: {
        select: {
          id: true,
          originalName: true,
          storedName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
      rating: {
        select: {
          id: true,
          bintang: true,
          feedback: true,
          createdAt: true,
          userId: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Tiket tidak ditemukan');
  }

  // Authorization check based on role
  switch (userRole) {
    case 'SATKER':
      if (ticket.creatorId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke tiket ini');
      }
      break;

    case 'BIDTEKKOM':
      // Always allowed
      break;

    case 'PADAL':
      if (ticket.padalId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke tiket ini');
      }
      break;

    case 'TEKNISI': {
      // Get teknisi's padalId
      const teknisi = await prisma.user.findUnique({
        where: { id: userId },
        select: { padalId: true },
      });

      if (!teknisi || !teknisi.padalId) {
        throw new AppError(403, 'FORBIDDEN', 'Anda belum ditugaskan ke tim Padal manapun');
      }

      if (teknisi.padalId !== ticket.padalId) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke tiket ini');
      }
      break;
    }

    default:
      throw new AppError(403, 'FORBIDDEN', 'Role tidak dikenali');
  }

  return ticket;
}

// ─── Assign to Padal ─────────────────────────────────────────────────────────

/**
 * Assign a PENDING ticket to a Padal user.
 *
 * Validates:
 * 1. Ticket exists and status is PENDING (Req 6.1)
 * 2. Target user exists, has PADAL role, and is not soft-deleted
 * 3. Uses optimistic locking via updateMany with status WHERE clause (Req 27.1)
 * 4. Sets padalId, status PROSES, tanggalAssign
 * 5. Logs audit event TICKET_ASSIGNMENT
 */
export async function assignToPadal(
  ticketId: string,
  padalId: string,
  assignerId: string
) {
  // 1. Get ticket and validate status is PENDING
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Tiket tidak ditemukan');
  }

  if (ticket.status !== 'PENDING') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Tiket harus berstatus PENDING untuk di-assign'
    );
  }

  // 2. Validate target user exists, has PADAL role, and is not soft-deleted
  const targetUser = await prisma.user.findUnique({
    where: { id: padalId },
  });

  if (!targetUser) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User Padal tidak ditemukan');
  }

  if (targetUser.role !== 'PADAL') {
    throw new AppError(
      400,
      'INVALID_ROLE',
      'User yang dituju bukan Padal'
    );
  }

  if (targetUser.deletedAt !== null) {
    throw new AppError(
      400,
      'USER_DELETED',
      'User Padal sudah tidak aktif'
    );
  }

  // 3. Optimistic locking: updateMany with status WHERE clause
  const now = new Date();
  const result = await prisma.ticket.updateMany({
    where: {
      id: ticketId,
      status: 'PENDING',
    },
    data: {
      padalId,
      status: 'PROSES',
      tanggalAssign: now,
    },
  });

  if (result.count === 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Tiket telah diubah oleh pengguna lain'
    );
  }

  // 4. Fetch updated ticket to return
  const updatedTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      creator: {
        select: { id: true, nama: true, divisi: true },
      },
      padal: {
        select: { id: true, nama: true },
      },
    },
  });

  // 5. Get assigner info for audit log
  const assigner = await prisma.user.findUnique({
    where: { id: assignerId },
    select: { nama: true },
  });

  // 6. Log audit event TICKET_ASSIGNMENT
  await auditService.log({
    eventType: 'TICKET_ASSIGNMENT',
    actorId: assignerId,
    actorNama: assigner?.nama ?? 'Unknown',
    targetEntityId: ticket.nomorTiket,
    metadata: {
      ticketId: ticket.id,
      padalId,
      padalNama: targetUser.nama,
    },
  });

  // 7. Notify assigned Padal about ticket assignment (Req 6.2)
  try {
    await notificationService.create({
      userId: padalId,
      type: 'TICKET_ASSIGNED',
      ticketNumber: ticket.nomorTiket,
      message: `Tiket ${ticket.nomorTiket} telah ditugaskan kepada Anda: ${ticket.judul}`,
    });
  } catch {
    // Notification failure should not break assignment
  }

  return updatedTicket;
}

// ─── Mark Complete ───────────────────────────────────────────────────────────

/**
 * Mark a PROSES ticket as SELESAI.
 *
 * Validates:
 * 1. Ticket exists and status is PROSES (Req 7.1)
 * 2. Actor is the assigned Padal (Req 7.2)
 * 3. Uses optimistic locking via updateMany with status WHERE clause (Req 27.2)
 * 4. Sets status SELESAI, tanggalSelesai
 * 5. Logs audit event TICKET_COMPLETION
 */
export async function markComplete(
  ticketId: string,
  padalId: string
) {
  // 1. Get ticket and validate status is PROSES
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Tiket tidak ditemukan');
  }

  if (ticket.status !== 'PROSES') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Tiket harus berstatus PROSES untuk diselesaikan'
    );
  }

  // 2. Validate the actor is the assigned Padal
  if (ticket.padalId !== padalId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Hanya Padal yang ditugaskan yang dapat menyelesaikan tiket ini'
    );
  }

  // 3. Optimistic locking: updateMany with status WHERE clause
  const now = new Date();
  const result = await prisma.ticket.updateMany({
    where: {
      id: ticketId,
      status: 'PROSES',
    },
    data: {
      status: 'SELESAI',
      tanggalSelesai: now,
    },
  });

  if (result.count === 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Tiket telah diubah oleh pengguna lain'
    );
  }

  // 4. Fetch updated ticket to return
  const updatedTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      creator: {
        select: { id: true, nama: true, divisi: true },
      },
      padal: {
        select: { id: true, nama: true },
      },
    },
  });

  // 5. Get padal info for audit log
  const padal = await prisma.user.findUnique({
    where: { id: padalId },
    select: { nama: true },
  });

  // 6. Log audit event TICKET_COMPLETION
  await auditService.log({
    eventType: 'TICKET_COMPLETION',
    actorId: padalId,
    actorNama: padal?.nama ?? 'Unknown',
    targetEntityId: ticket.nomorTiket,
    metadata: {
      ticketId: ticket.id,
    },
  });

  // 7. Notify ticket creator (Satker) about completion (Req 7.5)
  try {
    await notificationService.create({
      userId: ticket.creatorId,
      type: 'TICKET_COMPLETED',
      ticketNumber: ticket.nomorTiket,
      message: `Tiket ${ticket.nomorTiket} telah diselesaikan: ${ticket.judul}`,
    });
  } catch {
    // Notification failure should not break completion
  }

  return updatedTicket;
}

// ─── Cancel Ticket ───────────────────────────────────────────────────────────

/**
 * Cancel a ticket (set status DIBATALKAN).
 *
 * Authorization:
 * - SATKER: can only cancel their own tickets (creatorId === actorId) (Req 8.1)
 * - BIDTEKKOM: can cancel any ticket as long as status is PENDING/PROSES (Req 8.3)
 *
 * Validates:
 * 1. Ticket exists and status is PENDING or PROSES (Req 8.4)
 * 2. Role-based authorization
 * 3. Uses optimistic locking via updateMany with status WHERE clause (Req 27.3)
 * 4. Sets status DIBATALKAN, alasanBatal
 * 5. Logs audit event TICKET_CANCELLATION
 */
export async function cancel(
  ticketId: string,
  actorId: string,
  actorRole: Role,
  alasanBatal?: string
) {
  // 1. Get ticket and validate status is PENDING or PROSES
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Tiket tidak ditemukan');
  }

  if (ticket.status !== 'PENDING' && ticket.status !== 'PROSES') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Tiket hanya bisa dibatalkan jika berstatus PENDING atau PROSES'
    );
  }

  // 2. Role-based authorization
  if (actorRole === 'SATKER') {
    if (ticket.creatorId !== actorId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Anda hanya bisa membatalkan tiket milik Anda sendiri'
      );
    }
  }
  // BIDTEKKOM: always allowed for PENDING/PROSES tickets

  // 2.5. Validasi alasanBatal untuk Bidtekkom (TASK-006)
  if (actorRole === 'BIDTEKKOM' && (!alasanBatal || !alasanBatal.trim())) {
    throw new AppError(
      400,
      'REASON_REQUIRED',
      'Bidtekkom wajib menyertakan alasan pembatalan tiket'
    );
  }

  // 3. Optimistic locking: updateMany with status WHERE clause
  const result = await prisma.ticket.updateMany({
    where: {
      id: ticketId,
      status: { in: ['PENDING', 'PROSES'] },
    },
    data: {
      status: 'DIBATALKAN',
      alasanBatal: alasanBatal ?? null,
    },
  });

  if (result.count === 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Tiket telah diubah oleh pengguna lain'
    );
  }

  // 4. Fetch updated ticket to return
  const updatedTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      creator: {
        select: { id: true, nama: true, divisi: true },
      },
      padal: {
        select: { id: true, nama: true },
      },
    },
  });

  // 5. Get actor info for audit log
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { nama: true },
  });

  // 6. Log audit event TICKET_CANCELLATION
  await auditService.log({
    eventType: 'TICKET_CANCELLATION',
    actorId,
    actorNama: actor?.nama ?? 'Unknown',
    targetEntityId: ticket.nomorTiket,
    metadata: {
      ticketId: ticket.id,
      alasanBatal: alasanBatal ?? null,
      cancelledBy: actorRole,
    },
  });

  // 7. Notify creator Satker and assigned Padal (if exists) about cancellation (Req 7.6) (TASK-007)
  try {
    // Notify the ticket creator only if they didn't cancel it themselves
    if (ticket.creatorId !== actorId) {
      await notificationService.create({
        userId: ticket.creatorId,
        type: 'TICKET_CANCELLED',
        ticketNumber: ticket.nomorTiket,
        message: `Tiket ${ticket.nomorTiket} telah dibatalkan: ${ticket.judul}`,
      });
    }

    // Notify the assigned Padal if one exists and didn't cancel it
    if (ticket.padalId && ticket.padalId !== actorId) {
      await notificationService.create({
        userId: ticket.padalId,
        type: 'TICKET_CANCELLED',
        ticketNumber: ticket.nomorTiket,
        message: `Tiket ${ticket.nomorTiket} telah dibatalkan: ${ticket.judul}`,
      });
    }

    // Notify all Bidtekkom users EXCEPT the actor who cancelled (TASK-007)
    const bidtekkomUsers = await prisma.user.findMany({
      where: { role: 'BIDTEKKOM', deletedAt: null, id: { not: actorId } },
      select: { id: true },
    });

    await Promise.all(
      bidtekkomUsers.map((btUser) =>
        notificationService.create({
          userId: btUser.id,
          type: 'TICKET_CANCELLED',
          ticketNumber: ticket.nomorTiket,
          message: `Tiket ${ticket.nomorTiket} telah dibatalkan: ${ticket.judul}`,
        })
      )
    );
  } catch {
    // Notification failure should not break cancellation
  }

  return updatedTicket;
}

// ─── Reject Ticket ───────────────────────────────────────────────────────────

/**
 * Reject a ticket (set status DITOLAK).
 *
 * Authorization:
 * - BIDTEKKOM only (enforced at route level)
 *
 * Validates:
 * 1. Ticket exists and status is PENDING
 * 2. Reason is required
 * 3. Uses optimistic locking via updateMany with status WHERE clause
 * 4. Sets status DITOLAK and stores reason in alasanBatal
 * 5. Logs audit event TICKET_REJECTION
 */
export async function reject(
  ticketId: string,
  actorId: string,
  alasanTolak: string
) {
  const reason = alasanTolak.trim();
  if (!reason) {
    throw new AppError(400, 'REASON_REQUIRED', 'Alasan penolakan wajib diisi');
  }

  // 1. Get ticket and validate status is PENDING
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Tiket tidak ditemukan');
  }

  if (ticket.status !== 'PENDING') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Tiket hanya bisa ditolak jika berstatus PENDING'
    );
  }

  // 2. Optimistic locking: updateMany with status WHERE clause
  const result = await prisma.ticket.updateMany({
    where: {
      id: ticketId,
      status: 'PENDING',
    },
    data: {
      status: 'DITOLAK',
      alasanBatal: reason,
    },
  });

  if (result.count === 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Tiket telah diubah oleh pengguna lain'
    );
  }

  // 3. Fetch updated ticket to return
  const updatedTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      creator: {
        select: { id: true, nama: true, divisi: true },
      },
      padal: {
        select: { id: true, nama: true },
      },
    },
  });

  // 4. Get actor info for audit log
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { nama: true },
  });

  // 5. Log audit event TICKET_REJECTION
  await auditService.log({
    eventType: 'TICKET_REJECTION',
    actorId,
    actorNama: actor?.nama ?? 'Unknown',
    targetEntityId: ticket.nomorTiket,
    metadata: {
      ticketId: ticket.id,
      alasanTolak: reason,
    },
  });

  // 6. Notify creator about rejection
  try {
    await notificationService.create({
      userId: ticket.creatorId,
      type: 'TICKET_CANCELLED',
      ticketNumber: ticket.nomorTiket,
      message: `Tiket ${ticket.nomorTiket} ditolak oleh Bidtekkom: ${ticket.judul}`,
    });
  } catch {
    // Notification failure should not break rejection
  }

  return updatedTicket;
}
