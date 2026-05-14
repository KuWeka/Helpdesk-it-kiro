import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/reportService';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

/**
 * Parse and validate month/year query params.
 * Returns { month, year } or throws AppError.
 */
function parseMonthYear(query: Request['query']): { month: number; year: number } {
  const monthRaw = query.month;
  const yearRaw = query.year;

  if (!monthRaw || !yearRaw) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Parameter month dan year diperlukan');
  }

  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Parameter month harus antara 1-12');
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Parameter year harus antara 2000-2100');
  }

  return { month, year };
}

/**
 * GET /api/reports/monthly
 * Returns monthly report data (JSON).
 * - PADAL: scoped to their own tickets (padalId = req.user.userId)
 * - BIDTEKKOM: all tickets
 *
 * _Requirements: 12.1, 12.8_
 */
export async function getMonthlyReportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = parseMonthYear(req.query);

    const params: reportService.ReportParams = { month, year };

    // Scope by padalId for PADAL role
    if (req.user!.role === Role.PADAL) {
      params.padalId = req.user!.userId;
    }

    const reportData = await reportService.getMonthlyReport(params);

    res.status(200).json({
      status: 'success',
      data: reportData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/monthly/pdf
 * Returns monthly report as a downloadable PDF file.
 * - PADAL: scoped to their own tickets
 * - BIDTEKKOM: all tickets
 *
 * _Requirements: 12.1, 12.8_
 */
export async function getMonthlyReportPDFHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = parseMonthYear(req.query);

    const params: reportService.ReportParams = { month, year };

    // Scope by padalId for PADAL role
    if (req.user!.role === Role.PADAL) {
      params.padalId = req.user!.userId;
    }

    const pdfBuffer = await reportService.exportPDF(params);

    const filename = `laporan-bulanan-${year}-${String(month).padStart(2, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/monthly/excel
 * Returns monthly report as a downloadable Excel (.xlsx) file.
 * - PADAL: scoped to their own tickets
 * - BIDTEKKOM: all tickets
 *
 * _Requirements: 12.1, 12.8_
 */
export async function getMonthlyReportExcelHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = parseMonthYear(req.query);

    const params: reportService.ReportParams = { month, year };

    // Scope by padalId for PADAL role
    if (req.user!.role === Role.PADAL) {
      params.padalId = req.user!.userId;
    }

    const excelBuffer = await reportService.exportExcel(params);

    const filename = `laporan-bulanan-${year}-${String(month).padStart(2, '0')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
}
