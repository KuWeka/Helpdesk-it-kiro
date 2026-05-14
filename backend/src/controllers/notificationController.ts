import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';

/**
 * GET /api/notifications
 * List notifications for the authenticated user (paginated, 50 per page).
 * Query params: ?page=1
 */
export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;

    const result = await notificationService.getByUser(userId, page);

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read (owner only).
 */
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await notificationService.markAsRead(id, userId);

    res.status(200).json({
      status: 'success',
      message: 'Notifikasi ditandai sudah dibaca',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      status: 'success',
      message: 'Semua notifikasi ditandai sudah dibaca',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a notification (owner only).
 */
export async function deleteNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await notificationService.deleteNotification(id, userId);

    res.status(200).json({
      status: 'success',
      message: 'Notifikasi berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
}
