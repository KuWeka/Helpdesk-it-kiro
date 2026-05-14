import { Request, Response, NextFunction } from 'express';
import * as ratingService from '../services/ratingService';
import * as ticketService from '../services/ticketService';

/**
 * POST /api/tickets/:id/rating
 * Submit a rating for a completed ticket (Satker, ticket owner only).
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function submitRatingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: ticketId } = req.params;
    const { bintang, feedback } = req.body;

    const rating = await ratingService.submitRating(userId, ticketId, {
      bintang,
      feedback,
    });

    res.status(201).json({
      status: 'success',
      data: rating,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/:id/rating
 * Get the rating for a specific ticket (any authenticated user who can view the ticket).
 *
 * Validates: Requirements 9.6
 */
export async function getRatingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const { id: ticketId } = req.params;

    // Verify user has access to the ticket (throws 403/404 if not authorized)
    await ticketService.getById(ticketId, userId, role);

    const rating = await ratingService.getRatingByTicket(ticketId);

    res.status(200).json({
      status: 'success',
      data: rating,
    });
  } catch (error) {
    next(error);
  }
}
