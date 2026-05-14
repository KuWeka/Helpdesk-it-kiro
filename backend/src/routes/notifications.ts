import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController';

const router = Router();

// GET /api/notifications - List user notifications (paginated, ?page=1)
router.get('/', authenticate, listNotifications);

// PATCH /api/notifications/read-all - Mark all notifications as read
// NOTE: This route must be defined BEFORE /:id/read to avoid "read-all" being captured as :id
router.patch('/read-all', authenticate, markAllAsRead);

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authenticate, markAsRead);

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, deleteNotification);

export default router;
