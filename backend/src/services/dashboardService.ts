import { PrismaClient, TicketStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Satker Dashboard Data
 * - Own ticket counts by status
 * - 10 most recent tickets
 * - Count of unrated SELESAI tickets
 */
export async function getSatkerDashboard(userId: string) {
  const [statusCounts, recentTickets, unratedCount] = await Promise.all([
    // Ticket counts grouped by status
    prisma.ticket.groupBy({
      by: ['status'],
      where: { creatorId: userId },
      _count: { id: true },
    }),

    // 10 most recent tickets
    prisma.ticket.findMany({
      where: { creatorId: userId },
      orderBy: { tanggalBuat: 'desc' },
      take: 10,
      select: {
        id: true,
        nomorTiket: true,
        judul: true,
        status: true,
        tanggalBuat: true,
      },
    }),

    // Unrated SELESAI tickets count
    prisma.ticket.count({
      where: {
        creatorId: userId,
        status: TicketStatus.SELESAI,
        rating: null,
      },
    }),
  ]);

  // Build counts object with all statuses defaulting to 0
  const counts = {
    PENDING: 0,
    PROSES: 0,
    SELESAI: 0,
    DIBATALKAN: 0,
  };

  for (const item of statusCounts) {
    counts[item.status] = item._count.id;
  }

  return {
    counts,
    recentTickets,
    unratedCount,
  };
}

/**
 * Bidtekkom Dashboard Data
 * - Total tickets, per-status counts, user count
 * - Monthly trend (12 months)
 * - 10 most recent tickets
 * - 10 unassigned PENDING tickets (oldest first)
 */
export async function getBidtekkomDashboard() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const [statusCounts, userCount, recentTickets, unassignedTickets, yearTickets] =
    await Promise.all([
      // Ticket counts grouped by status
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Total registered user count (active only)
      prisma.user.count({
        where: { deletedAt: null },
      }),

      // 10 most recent tickets across all Satker
      prisma.ticket.findMany({
        orderBy: { tanggalBuat: 'desc' },
        take: 10,
        select: {
          id: true,
          nomorTiket: true,
          judul: true,
          status: true,
          tanggalBuat: true,
          creator: {
            select: { nama: true },
          },
        },
      }),

      // 10 unassigned PENDING tickets (oldest first)
      prisma.ticket.findMany({
        where: { status: TicketStatus.PENDING },
        orderBy: { tanggalBuat: 'asc' },
        take: 10,
        select: {
          id: true,
          nomorTiket: true,
          judul: true,
          status: true,
          tanggalBuat: true,
          creator: {
            select: { nama: true },
          },
        },
      }),

      // All tickets for current year (for monthly trend aggregation)
      prisma.ticket.findMany({
        where: {
          tanggalBuat: {
            gte: new Date(currentYear, 0, 1),
            lt: new Date(currentYear + 1, 0, 1),
          },
        },
        select: { tanggalBuat: true },
      }),
    ]);

  // Build per-status counts
  const counts = {
    PENDING: 0,
    PROSES: 0,
    SELESAI: 0,
    DIBATALKAN: 0,
  };
  let totalTickets = 0;

  for (const item of statusCounts) {
    counts[item.status] = item._count.id;
    totalTickets += item._count.id;
  }

  // Build monthly trend array (12 months)
  const monthlyData: { month: number; count: number }[] = [];
  const monthCounts = new Array(12).fill(0);

  for (const ticket of yearTickets) {
    const month = ticket.tanggalBuat.getMonth();
    monthCounts[month]++;
  }

  for (let i = 0; i < 12; i++) {
    monthlyData.push({ month: i + 1, count: monthCounts[i] });
  }

  return {
    totalTickets,
    counts,
    userCount,
    monthlyTrend: monthlyData,
    recentTickets,
    unassignedTickets,
  };
}

/**
 * Padal Dashboard Data
 * - Active (PROSES) count
 * - Completed (SELESAI) count
 * - Average rating
 * - Team members (Teknisi)
 */
export async function getPadalDashboard(padalId: string) {
  const [activeCount, completedCount, avgRating, teamMembers] = await Promise.all([
    // Active tickets (PROSES)
    prisma.ticket.count({
      where: { padalId, status: TicketStatus.PROSES },
    }),

    // Completed tickets (SELESAI)
    prisma.ticket.count({
      where: { padalId, status: TicketStatus.SELESAI },
    }),

    // Average rating for Padal's tickets
    prisma.rating.aggregate({
      where: {
        ticket: { padalId },
      },
      _avg: { bintang: true },
    }),

    // Team members (Teknisi assigned to this Padal)
    prisma.user.findMany({
      where: {
        padalId,
        role: 'TEKNISI',
        deletedAt: null,
      },
      select: {
        id: true,
        nama: true,
        nomorWhatsApp: true,
      },
    }),
  ]);

  // Round average rating to 1 decimal place
  const averageRating = avgRating._avg.bintang
    ? Math.round(avgRating._avg.bintang * 10) / 10
    : null;

  return {
    activeCount,
    completedCount,
    averageRating,
    teamMembers,
  };
}

/**
 * Teknisi Dashboard Data
 * - hasPadal flag
 * - Active (PROSES) count from Padal's tickets
 * - Completed (SELESAI) count from Padal's tickets
 * When hasPadal=false, return zeroed data
 */
export async function getTeknisiDashboard(teknisiId: string) {
  // First, find the Teknisi's associated Padal
  const teknisi = await prisma.user.findUnique({
    where: { id: teknisiId },
    select: { padalId: true },
  });

  if (!teknisi || !teknisi.padalId) {
    return {
      hasPadal: false,
      activeCount: 0,
      completedCount: 0,
    };
  }

  const [activeCount, completedCount] = await Promise.all([
    prisma.ticket.count({
      where: { padalId: teknisi.padalId, status: TicketStatus.PROSES },
    }),
    prisma.ticket.count({
      where: { padalId: teknisi.padalId, status: TicketStatus.SELESAI },
    }),
  ]);

  return {
    hasPadal: true,
    activeCount,
    completedCount,
  };
}
