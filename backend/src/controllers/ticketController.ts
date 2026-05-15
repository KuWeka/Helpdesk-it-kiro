import { prisma } from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
import { TicketStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import * as ticketService from '../services/ticketService';
import { AppError } from '../utils/AppError';


/**
 * POST /api/tickets
 * Create a new ticket (Satker only).
 */
export async function createTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { judul, deskripsi, kategori, lokasi } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const ticket = await ticketService.create(
      userId,
      { judul, deskripsi, kategori, lokasi },
      files
    );

    res.status(201).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets
 * List tickets based on user role.
 * - SATKER: own tickets (supports ?unrated=true filter)
 * - BIDTEKKOM: all tickets
 * - PADAL: assigned tickets
 * - TEKNISI: tickets via their Padal
 */
export async function listTickets(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const pagination = { page, pageSize };

    // Validate status parameter if provided
    const validStatuses: TicketStatus[] = ['PENDING', 'PROSES', 'SELESAI', 'DIBATALKAN', 'DITOLAK'];
    const rawStatus = req.query.status as string | undefined;
    if (rawStatus && rawStatus !== 'ALL' && !validStatuses.includes(rawStatus as TicketStatus)) {
      throw new AppError(400, 'INVALID_STATUS', 'Nilai status tidak valid');
    }
    const statusFilter = (rawStatus && rawStatus !== 'ALL' ? rawStatus as TicketStatus : undefined);

    const filters = {
      status: statusFilter,
      unrated: req.query.unrated === 'true',
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      search: req.query.search as string | undefined,
    };

    let result;

    switch (role) {
      case 'SATKER': {
        result = await ticketService.listForSatker(userId, pagination, filters);
        break;
      }
      case 'BIDTEKKOM':
        result = await ticketService.listForBidtekkom(pagination, filters);
        break;
      case 'PADAL':
        result = await ticketService.listForPadal(userId, pagination, filters);
        break;
      case 'TEKNISI':
        result = await ticketService.listForTeknisi(userId, pagination, filters);
        break;
      default:
        throw new AppError(403, 'FORBIDDEN', 'Role tidak dikenali');
    }

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/:id
 * Get ticket detail with role-based authorization.
 */
export async function getTicketById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const { id } = req.params;

    const ticket = await ticketService.getById(id, userId, role);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tickets/:id/assign
 * Assign a ticket to a Padal (Bidtekkom only).
 */
export async function assignTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const assignerId = req.user!.userId;
    const { id } = req.params;
    const { padalId } = req.body;

    const ticket = await ticketService.assignToPadal(id, padalId, assignerId);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tickets/:id/complete
 * Mark a ticket as complete (assigned Padal only).
 */
export async function completeTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const padalId = req.user!.userId;
    const { id } = req.params;

    const ticket = await ticketService.markComplete(id, padalId);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tickets/:id/cancel
 * Cancel a ticket (Satker owner or Bidtekkom).
 */
export async function cancelTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const { id } = req.params;
    const { alasanBatal } = req.body;

    const ticket = await ticketService.cancel(id, userId, role, alasanBatal);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tickets/:id/reject
 * Reject a ticket (Bidtekkom only).
 */
export async function rejectTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actorId = req.user!.userId;
    const { id } = req.params;
    const { alasanTolak } = req.body;

    const ticket = await ticketService.reject(id, actorId, alasanTolak);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/:id/attachments/:fileId
 * Download a ticket attachment (authorized viewers only).
 */
export async function downloadAttachment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const { id: ticketId, fileId } = req.params;

    // Verify user has access to the ticket
    await ticketService.getById(ticketId, userId, role);

    // Find the attachment
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: fileId,
        ticketId,
      },
    });

    if (!attachment) {
      throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Lampiran tidak ditemukan');
    }

    if (attachment.storedName.startsWith('http')) {
      res.redirect(attachment.storedName);
      return;
    }

    // Construct file path
    const filePath = path.join(
      __dirname,
      '..',
      '..',
      'uploads',
      'tickets',
      attachment.storedName
    );

    // Check file exists on disk
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File tidak ditemukan di server');
    }

    // Set headers and send file
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.originalName)}"`
    );
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}
