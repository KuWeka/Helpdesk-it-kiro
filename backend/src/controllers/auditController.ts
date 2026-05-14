import { Request, Response, NextFunction } from 'express';
import { AuditEventType } from '@prisma/client';
import * as auditService from '../services/auditService';
import { AppError } from '../utils/AppError';

/**
 * Valid AuditEventType values for validation.
 */
const VALID_EVENT_TYPES: string[] = [
  'LOGIN',
  'REGISTRATION',
  'TICKET_CREATION',
  'TICKET_ASSIGNMENT',
  'TICKET_COMPLETION',
  'TICKET_CANCELLATION',
  'TICKET_RATING',
  'USER_SOFT_DELETE',
  'ROLE_CHANGE',
  'PASSWORD_RESET',
  'PASSWORD_CHANGE',
  'SETTINGS_CHANGE',
  'TEAM_ASSIGNMENT',
  'TEAM_REMOVAL',
];

/**
 * GET /api/audit
 * Retrieve paginated audit logs with search, filter by eventType/date range.
 * Sorted by timestamp descending. Bidtekkom-only access.
 *
 * Query params:
 *   - page: number (default 1)
 *   - pageSize: number (default 20)
 *   - search: string (search actorNama or targetEntityId)
 *   - eventType: AuditEventType enum value
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 */
export async function getAuditLogsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, pageSize, search, eventType, startDate, endDate } = req.query;

    // Parse pagination
    const parsedPage = page ? parseInt(page as string, 10) : undefined;
    const parsedPageSize = pageSize ? parseInt(pageSize as string, 10) : undefined;

    // Validate pagination values if provided
    if (page && (isNaN(parsedPage!) || parsedPage! < 1)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Parameter page harus berupa angka positif');
    }
    if (pageSize && (isNaN(parsedPageSize!) || parsedPageSize! < 1)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Parameter pageSize harus berupa angka positif');
    }

    // Validate eventType if provided
    if (eventType && !VALID_EVENT_TYPES.includes(eventType as string)) {
      throw new AppError(400, 'VALIDATION_ERROR', `Parameter eventType tidak valid. Nilai yang diperbolehkan: ${VALID_EVENT_TYPES.join(', ')}`);
    }

    // Parse dates from ISO strings
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate as string);
      if (isNaN(parsedStartDate.getTime())) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Parameter startDate harus berupa format tanggal ISO yang valid');
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate as string);
      if (isNaN(parsedEndDate.getTime())) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Parameter endDate harus berupa format tanggal ISO yang valid');
      }
    }

    // Call service
    const result = await auditService.getAuditLogs(
      {
        page: parsedPage,
        pageSize: parsedPageSize,
      },
      {
        search: search as string | undefined,
        eventType: eventType as AuditEventType | undefined,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      }
    );

    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
