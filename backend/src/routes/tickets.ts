import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { ticketAttachment } from '../middleware/upload';
import { ticketCreateLimiter } from '../middleware/rateLimit';
import {
  createTicketSchema,
  assignTicketSchema,
  cancelTicketSchema,
  rejectTicketSchema,
  ticketIdParamSchema,
  ticketAttachmentParamSchema,
} from '../validators/ticket';
import {
  createTicket,
  listTickets,
  getTicketById,
  assignTicket,
  completeTicket,
  cancelTicket,
  rejectTicket,
  downloadAttachment,
} from '../controllers/ticketController';
import { submitRatingHandler, getRatingHandler } from '../controllers/ratingController';

const router = Router();

// POST /api/tickets - Create ticket (Satker only)
router.post(
  '/',
  authenticate,
  authorize(Role.SATKER),
  ticketCreateLimiter,
  ticketAttachment.array('attachments', 10),
  validate(createTicketSchema),
  createTicket
);

// GET /api/tickets - List tickets (all authenticated, role-filtered)
router.get('/', authenticate, listTickets);

// GET /api/tickets/:id - Get ticket detail (authorized viewers)
router.get('/:id', authenticate, validate(ticketIdParamSchema, 'params'), getTicketById);

// PATCH /api/tickets/:id/assign - Assign ticket to Padal (Bidtekkom only)
router.patch(
  '/:id/assign',
  authenticate,
  authorize(Role.BIDTEKKOM),
  validate(ticketIdParamSchema, 'params'),
  validate(assignTicketSchema),
  assignTicket
);

// PATCH /api/tickets/:id/complete - Mark ticket complete (Padal only)
router.patch(
  '/:id/complete',
  authenticate,
  authorize(Role.PADAL),
  validate(ticketIdParamSchema, 'params'),
  completeTicket
);

// PATCH /api/tickets/:id/cancel - Cancel ticket (Satker or Bidtekkom)
router.patch(
  '/:id/cancel',
  authenticate,
  authorize(Role.SATKER, Role.BIDTEKKOM),
  validate(ticketIdParamSchema, 'params'),
  validate(cancelTicketSchema),
  cancelTicket
);

// PATCH /api/tickets/:id/reject - Reject ticket (Bidtekkom only)
router.patch(
  '/:id/reject',
  authenticate,
  authorize(Role.BIDTEKKOM),
  validate(ticketIdParamSchema, 'params'),
  validate(rejectTicketSchema),
  rejectTicket
);

// GET /api/tickets/:id/attachments/:fileId - Download attachment (authorized viewers)
router.get('/:id/attachments/:fileId', authenticate, validate(ticketAttachmentParamSchema, 'params'), downloadAttachment);

// POST /api/tickets/:id/rating - Submit rating (Satker, ticket owner)
router.post(
  '/:id/rating',
  authenticate,
  authorize(Role.SATKER),
  validate(ticketIdParamSchema, 'params'),
  submitRatingHandler
);

// GET /api/tickets/:id/rating - Get ticket rating (authorized viewers)
router.get('/:id/rating', authenticate, validate(ticketIdParamSchema, 'params'), getRatingHandler);

export default router;
