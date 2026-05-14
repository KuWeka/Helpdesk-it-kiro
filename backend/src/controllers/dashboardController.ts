import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService';

/**
 * GET /api/dashboard/satker
 * Returns Satker dashboard data: ticket counts by status, 10 recent tickets, unrated SELESAI count.
 * Requires: authenticate + authorize(SATKER)
 */
export async function getSatkerDashboardHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getSatkerDashboard(req.user!.userId);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/bidtekkom
 * Returns Bidtekkom dashboard data: total tickets, per-status counts, user count,
 * monthly trend (12 months), 10 recent tickets, 10 unassigned PENDING.
 * Requires: authenticate + authorize(BIDTEKKOM)
 */
export async function getBidtekkomDashboardHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getBidtekkomDashboard();

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/padal
 * Returns Padal dashboard data: active count, completed count, avg rating, team members.
 * Requires: authenticate + authorize(PADAL)
 */
export async function getPadalDashboardHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getPadalDashboard(req.user!.userId);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/teknisi
 * Returns Teknisi dashboard data: hasPadal flag, active count, completed count.
 * When hasPadal=false, returns zeroed data.
 * Requires: authenticate + authorize(TEKNISI)
 */
export async function getTeknisiDashboardHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getTeknisiDashboard(req.user!.userId);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}
