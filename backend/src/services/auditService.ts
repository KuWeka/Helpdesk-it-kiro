import { PrismaClient, AuditEventType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Paginated result format matching shared/types/api.ts PaginatedResult interface.
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Audit event input for logging.
 */
export interface AuditEvent {
  eventType: AuditEventType;
  actorId: string;
  actorNama: string;
  targetEntityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Filters for querying audit logs.
 */
export interface AuditFilters {
  search?: string;           // Search by actorNama or targetEntityId (contains, case-insensitive)
  eventType?: AuditEventType; // Filter by exact event type
  startDate?: Date;          // Filter createdAt >= startDate
  endDate?: Date;            // Filter createdAt <= endDate
}

/**
 * Pagination parameters for audit log queries.
 */
export interface AuditPaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Audit log entry as returned from the database.
 */
export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  actorId: string;
  actorNama: string;
  targetEntityId: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}

/**
 * Record an audit log entry.
 * Stores eventType, actorId, actorNama, targetEntityId (optional), metadata (optional), and timestamp.
 */
export async function log(event: AuditEvent): Promise<void> {
  await prisma.auditLog.create({
    data: {
      eventType: event.eventType,
      actorId: event.actorId,
      actorNama: event.actorNama,
      targetEntityId: event.targetEntityId ?? null,
      metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

/**
 * Retrieve paginated audit logs with search, filter, and sort support.
 *
 * - Pagination: page (default 1), pageSize (default 20)
 * - Search: by actorNama (contains, case-insensitive) or targetEntityId (contains, case-insensitive)
 * - Filter: by eventType (exact match), date range (startDate/endDate on createdAt)
 * - Sort: by createdAt descending (most recent first)
 *
 * Returns PaginatedResult format with data array and pagination metadata.
 */
export async function getAuditLogs(
  pagination: AuditPaginationParams = {},
  filters: AuditFilters = {}
): Promise<PaginatedResult<AuditLogEntry>> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 20;
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: Prisma.AuditLogWhereInput = {};

  // Filter by eventType (exact match)
  if (filters.eventType) {
    where.eventType = filters.eventType;
  }

  // Filter by date range on createdAt
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  // Search by actorNama or targetEntityId (contains, case-insensitive)
  if (filters.search) {
    where.OR = [
      {
        actorNama: {
          contains: filters.search,
        },
      },
      {
        targetEntityId: {
          contains: filters.search,
        },
      },
    ];
  }

  // Execute count and findMany in parallel for efficiency
  const [totalItems, data] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        eventType: true,
        actorId: true,
        actorNama: true,
        targetEntityId: true,
        metadata: true,
        createdAt: true,
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
