import { PrismaClient, Rating } from '@prisma/client';
import { AppError } from '../utils/AppError';
import * as auditService from './auditService';

const prisma = new PrismaClient();

/**
 * Rating data transfer object for submitting a rating.
 */
export interface RatingDTO {
  bintang: number;   // 1-5 integer
  feedback: string;  // 1-1000 chars, no whitespace-only
}

/**
 * Submit a rating for a completed ticket.
 *
 * Validates:
 * - Ticket exists and has status SELESAI
 * - User is the ticket creator
 * - Ticket does not already have a rating
 * - bintang is an integer between 1 and 5
 * - feedback is 1-1000 characters and not whitespace-only
 *
 * After successful submission, logs a TICKET_RATING audit event.
 *
 * @param userId - The ID of the user submitting the rating
 * @param ticketId - The ID of the ticket being rated
 * @param data - The rating data (bintang and feedback)
 * @returns The created Rating record
 */
export async function submitRating(
  userId: string,
  ticketId: string,
  data: RatingDTO
): Promise<Rating> {
  // Fetch the ticket with its existing rating
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { rating: true },
  });

  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Tiket tidak ditemukan');
  }

  // Validate ticket status is SELESAI
  if (ticket.status !== 'SELESAI') {
    throw new AppError(
      400,
      'BUSINESS_RULE_ERROR',
      'Tiket harus berstatus SELESAI sebelum dapat diberi rating'
    );
  }

  // Validate user is the ticket creator
  if (ticket.creatorId !== userId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Hanya pembuat tiket yang dapat memberikan rating'
    );
  }

  // Validate ticket does not already have a rating
  if (ticket.rating) {
    throw new AppError(
      409,
      'CONFLICT',
      'Tiket ini sudah memiliki rating'
    );
  }

  // Validate bintang is an integer between 1 and 5
  if (
    !Number.isInteger(data.bintang) ||
    data.bintang < 1 ||
    data.bintang > 5
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Bintang harus berupa bilangan bulat antara 1 dan 5',
      { field: 'bintang' }
    );
  }

  // Validate feedback is 1-1000 characters and not whitespace-only
  if (!data.feedback || data.feedback.trim().length === 0) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Feedback tidak boleh kosong atau hanya berisi spasi',
      { field: 'feedback' }
    );
  }

  if (data.feedback.length > 1000) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Feedback tidak boleh lebih dari 1000 karakter',
      { field: 'feedback' }
    );
  }

  // Create the rating
  const rating = await prisma.rating.create({
    data: {
      ticketId,
      userId,
      bintang: data.bintang,
      feedback: data.feedback,
    },
  });

  // Fetch the actor's name for audit logging
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nama: true },
  });

  // Log audit event
  await auditService.log({
    eventType: 'TICKET_RATING',
    actorId: userId,
    actorNama: user?.nama ?? 'Unknown',
    targetEntityId: ticketId,
    metadata: {
      bintang: data.bintang,
      nomorTiket: ticket.nomorTiket,
    },
  });

  return rating;
}

/**
 * Get the rating for a specific ticket.
 *
 * @param ticketId - The ID of the ticket
 * @returns The Rating record or null if no rating exists
 */
export async function getRatingByTicket(ticketId: string): Promise<Rating | null> {
  const rating = await prisma.rating.findUnique({
    where: { ticketId },
  });

  return rating;
}
