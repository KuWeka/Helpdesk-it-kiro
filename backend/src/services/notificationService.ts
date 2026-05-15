import { prisma } from '../lib/prisma';
import { NotificationType, Notification } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { getIO } from '../lib/socket';


/**
 * Paginated notifications result including unread count.
 */
export interface PaginatedNotifications {
  data: Notification[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  unreadCount: number;
}

/**
 * Input data for creating a notification.
 */
export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  ticketNumber: string;
  message: string;
}

/**
 * Create a notification, persist it to the database, and emit it via Socket.io
 * to the target user's room (user_{userId}).
 *
 * Requirements: 10.3, 10.7
 */
export async function create(data: CreateNotificationDTO): Promise<Notification> {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      ticketNumber: data.ticketNumber,
      message: data.message,
    },
  });

  // Emit real-time notification to user room
  try {
    const io = getIO();
    if (io) {
      io.to(`user_${data.userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        ticketNumber: notification.ticketNumber,
        message: notification.message,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    }
  } catch {
    // Socket.io emission failure should not break notification creation
    // The notification is already persisted in the database
  }

  return notification;
}

/**
 * Get notifications for a user, paginated (50 per page), ordered by createdAt desc.
 * Also returns the total unread count for the user.
 *
 * Requirements: 10.9
 */
export async function getByUser(
  userId: string,
  page: number = 1
): Promise<PaginatedNotifications> {
  const pageSize = 50;
  const currentPage = page > 0 ? page : 1;
  const skip = (currentPage - 1) * pageSize;

  const [data, totalItems, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({
      where: { userId },
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data,
    pagination: {
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
    },
    unreadCount,
  };
}

/**
 * Mark a single notification as read.
 * Validates ownership — returns 403 if the notification does not belong to the requesting user.
 *
 * Requirements: 10.4, 10.8
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new AppError(404, 'NOT_FOUND', 'Notifikasi tidak ditemukan');
  }

  if (notification.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke notifikasi ini');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Mark all unread notifications as read for a user.
 *
 * Requirements: 10.5
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Delete a notification.
 * Validates ownership — returns 403 if the notification does not belong to the requesting user.
 *
 * Requirements: 10.6, 10.8
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new AppError(404, 'NOT_FOUND', 'Notifikasi tidak ditemukan');
  }

  if (notification.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke notifikasi ini');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Get the unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
