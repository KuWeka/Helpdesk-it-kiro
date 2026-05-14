import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { ticketAttachment } from '../middleware/upload';
import { createTicketSchema, assignTicketSchema, cancelTicketSchema } from '../validators/ticket';
import {
  createTicket,
  listTickets,
  getTicketById,
  assignTicket,
  completeTicket,
  cancelTicket,
  downloadAttachment,
} from '../controllers/ticketController';
import { submitRatingHandler, getRatingHandler } from '../controllers/ratingController';

const router = Router();

// POST /api/tickets - Create ticket (Satker only)
router.post(
  '/',
  authenticate,
  authorize(Role.SATKER),
  ticketAttachment.array('attachments', 10),
  validate(createTicketSchema),
  createTicket
);

// GET /api/tickets - List tickets (all authenticated, role-filtered)
router.get('/', authenticate, listTickets);

// GET /api/tickets/:id - Get ticket detail (authorized viewers)
router.get('/:id', authenticate, getTicketById);

// PATCH /api/tickets/:id/assign - Assign ticket to Padal (Bidtekkom only)
router.patch(
  '/:id/assign',
  authenticate,
  authorize(Role.BIDTEKKOM),
  validate(assignTicketSchema),
  assignTicket
);

// PATCH /api/tickets/:id/complete - Mark ticket complete (Padal only)
router.patch(
  '/:id/complete',
  authenticate,
  authorize(Role.PADAL),
  completeTicket
);

// PATCH /api/tickets/:id/cancel - Cancel ticket (Satker or Bidtekkom)
router.patch(
  '/:id/cancel',
  authenticate,
  authorize(Role.SATKER, Role.BIDTEKKOM),
  validate(cancelTicketSchema),
  cancelTicket
);

// GET /api/tickets/:id/attachments/:fileId - Download attachment (authorized viewers)
router.get('/:id/attachments/:fileId', authenticate, downloadAttachment);

// POST /api/tickets/:id/rating - Submit rating (Satker, ticket owner)
router.post(
  '/:id/rating',
  authenticate,
  authorize(Role.SATKER),
  submitRatingHandler
);

// GET /api/tickets/:id/rating - Get ticket rating (authorized viewers)
router.get('/:id/rating', authenticate, getRatingHandler);

export default router;
