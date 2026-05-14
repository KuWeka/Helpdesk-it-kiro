import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from './AppError';

const MAX_SEQUENCE = 99999;

/**
 * Generates the next ticket number atomically using a Prisma transaction.
 * Format: TKT-{YYYY}-{00001-99999}
 *
 * Uses the TicketSequence table to maintain a per-year counter.
 * Starts at 00001 for each new calendar year.
 * Rejects if the sequence reaches 99999 for the current year.
 */
export async function generateTicketNumber(prisma: PrismaClient): Promise<string> {
  const currentYear = new Date().getFullYear();

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Upsert the sequence record for the current year
    const sequence = await tx.ticketSequence.upsert({
      where: { year: currentYear },
      create: { year: currentYear, seq: 1 },
      update: { seq: { increment: 1 } },
    });

    const nextSeq = sequence.seq;

    if (nextSeq > MAX_SEQUENCE) {
      throw new AppError(
        503,
        'TICKET_CAPACITY_EXCEEDED',
        `Kapasitas nomor tiket tahunan telah tercapai (${MAX_SEQUENCE} tiket untuk tahun ${currentYear})`
      );
    }

    return nextSeq;
  });

  const paddedSeq = result.toString().padStart(5, '0');
  return `TKT-${currentYear}-${paddedSeq}`;
}
