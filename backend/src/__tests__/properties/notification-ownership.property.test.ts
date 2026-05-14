import * as fc from 'fast-check';
import { AppError } from '../../utils/AppError';
import * as notificationService from '../../services/notificationService';

/**
 * Property 10: Notification Ownership Enforcement
 *
 * For any notification operation (mark as read, delete), the operation SHALL succeed
 * if and only if the notification belongs to the requesting user. Operations on
 * notifications belonging to other users SHALL be rejected with a 403 Forbidden response.
 *
 * **Validates: Requirements 10.4, 10.6, 10.8**
 */

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    notification: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
    NotificationType: {
      TICKET_CREATED: 'TICKET_CREATED',
      TICKET_ASSIGNED: 'TICKET_ASSIGNED',
      TICKET_COMPLETED: 'TICKET_COMPLETED',
      TICKET_CANCELLED: 'TICKET_CANCELLED',
    },
  };
});

// Mock the server module to avoid Socket.io dependency
jest.mock('../../server', () => ({
  io: null,
}));

// Get the mocked prisma instance
const { PrismaClient } = require('@prisma/client');
const mockPrisma = new PrismaClient();

// Generator for UUID-like user IDs
const userIdArb = fc.uuid();

// Generator for UUID-like notification IDs
const notificationIdArb = fc.uuid();

// Generator for a pair of distinct user IDs (owner and non-owner)
const distinctUserPairArb = fc
  .tuple(userIdArb, userIdArb)
  .filter(([a, b]) => a !== b);

describe('Property 10: Notification Ownership Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markAsRead', () => {
    it('succeeds when the requesting user is the notification owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          notificationIdArb,
          userIdArb,
          async (notificationId, ownerId) => {
            // Setup: notification belongs to ownerId
            mockPrisma.notification.findUnique.mockResolvedValue({
              id: notificationId,
              userId: ownerId,
              isRead: false,
              type: 'TICKET_CREATED',
              ticketNumber: 'TKT-2025-00001',
              message: 'Test notification',
              createdAt: new Date(),
            });
            mockPrisma.notification.update.mockResolvedValue({
              id: notificationId,
              userId: ownerId,
              isRead: true,
            });

            // Act: owner marks their own notification as read
            await expect(
              notificationService.markAsRead(notificationId, ownerId)
            ).resolves.toBeUndefined();

            // Verify update was called
            expect(mockPrisma.notification.update).toHaveBeenCalledWith({
              where: { id: notificationId },
              data: { isRead: true },
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('rejects with 403 when the requesting user is NOT the notification owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          notificationIdArb,
          distinctUserPairArb,
          async (notificationId, [ownerId, nonOwnerId]) => {
            // Setup: notification belongs to ownerId
            mockPrisma.notification.findUnique.mockResolvedValue({
              id: notificationId,
              userId: ownerId,
              isRead: false,
              type: 'TICKET_ASSIGNED',
              ticketNumber: 'TKT-2025-00002',
              message: 'Test notification',
              createdAt: new Date(),
            });

            // Act: non-owner tries to mark as read
            try {
              await notificationService.markAsRead(notificationId, nonOwnerId);
              // Should not reach here
              fail('Expected AppError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(AppError);
              expect((error as AppError).statusCode).toBe(403);
              expect((error as AppError).code).toBe('FORBIDDEN');
            }

            // Verify update was NOT called
            expect(mockPrisma.notification.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('deleteNotification', () => {
    it('succeeds when the requesting user is the notification owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          notificationIdArb,
          userIdArb,
          async (notificationId, ownerId) => {
            // Setup: notification belongs to ownerId
            mockPrisma.notification.findUnique.mockResolvedValue({
              id: notificationId,
              userId: ownerId,
              isRead: true,
              type: 'TICKET_COMPLETED',
              ticketNumber: 'TKT-2025-00003',
              message: 'Test notification',
              createdAt: new Date(),
            });
            mockPrisma.notification.delete.mockResolvedValue({
              id: notificationId,
              userId: ownerId,
            });

            // Act: owner deletes their own notification
            await expect(
              notificationService.deleteNotification(notificationId, ownerId)
            ).resolves.toBeUndefined();

            // Verify delete was called
            expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
              where: { id: notificationId },
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('rejects with 403 when the requesting user is NOT the notification owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          notificationIdArb,
          distinctUserPairArb,
          async (notificationId, [ownerId, nonOwnerId]) => {
            // Setup: notification belongs to ownerId
            mockPrisma.notification.findUnique.mockResolvedValue({
              id: notificationId,
              userId: ownerId,
              isRead: false,
              type: 'TICKET_CANCELLED',
              ticketNumber: 'TKT-2025-00004',
              message: 'Test notification',
              createdAt: new Date(),
            });

            // Act: non-owner tries to delete
            try {
              await notificationService.deleteNotification(notificationId, nonOwnerId);
              // Should not reach here
              fail('Expected AppError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(AppError);
              expect((error as AppError).statusCode).toBe(403);
              expect((error as AppError).code).toBe('FORBIDDEN');
            }

            // Verify delete was NOT called
            expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('ownership check correctness', () => {
    it('for any pair of distinct user IDs, ownership check always correctly identifies the owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          notificationIdArb,
          distinctUserPairArb,
          async (notificationId, [ownerId, otherId]) => {
            // Setup: notification belongs to ownerId
            const notificationData = {
              id: notificationId,
              userId: ownerId,
              isRead: false,
              type: 'TICKET_CREATED',
              ticketNumber: 'TKT-2025-00005',
              message: 'Test notification',
              createdAt: new Date(),
            };

            mockPrisma.notification.findUnique.mockResolvedValue(notificationData);
            mockPrisma.notification.update.mockResolvedValue({ ...notificationData, isRead: true });
            mockPrisma.notification.delete.mockResolvedValue(notificationData);

            // Owner can markAsRead
            await expect(
              notificationService.markAsRead(notificationId, ownerId)
            ).resolves.toBeUndefined();

            // Reset mocks for next call
            jest.clearAllMocks();
            mockPrisma.notification.findUnique.mockResolvedValue(notificationData);

            // Non-owner cannot markAsRead
            try {
              await notificationService.markAsRead(notificationId, otherId);
              fail('Expected AppError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(AppError);
              expect((error as AppError).statusCode).toBe(403);
            }

            // Reset mocks for delete test
            jest.clearAllMocks();
            mockPrisma.notification.findUnique.mockResolvedValue(notificationData);
            mockPrisma.notification.delete.mockResolvedValue(notificationData);

            // Owner can delete
            await expect(
              notificationService.deleteNotification(notificationId, ownerId)
            ).resolves.toBeUndefined();

            // Reset mocks for next call
            jest.clearAllMocks();
            mockPrisma.notification.findUnique.mockResolvedValue(notificationData);

            // Non-owner cannot delete
            try {
              await notificationService.deleteNotification(notificationId, otherId);
              fail('Expected AppError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(AppError);
              expect((error as AppError).statusCode).toBe(403);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
