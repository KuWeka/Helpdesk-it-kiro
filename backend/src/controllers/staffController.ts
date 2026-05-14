import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import * as staffService from '../services/staffService';
import { AppError } from '../utils/AppError';

/**
 * GET /api/staff/users
 * List all users with pagination and optional filters.
 * Query params: page, role, status, search
 */
export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const role = req.query.role as Role | undefined;
    const status = req.query.status as 'active' | 'inactive' | undefined;
    const search = req.query.search as string | undefined;

    // Validate role if provided
    if (role && !Object.values(Role).includes(role)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Role tidak valid');
    }

    // Validate status if provided
    if (status && !['active', 'inactive'].includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Status harus active atau inactive');
    }

    const result = await staffService.listUsers(
      { page },
      { role, status, search }
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/staff/users/:id/role
 * Change a user's role.
 * Body: { role }
 */
export async function changeRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actorId = req.user!.userId;
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!role || !Object.values(Role).includes(role)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Role tidak valid');
    }

    await staffService.changeRole(id, role as Role, actorId);

    res.status(200).json({
      status: 'success',
      message: 'Role berhasil diubah',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/staff/users/:id/reset-password
 * Reset a user's password and return temporary password.
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actorId = req.user!.userId;
    const { id } = req.params;

    const result = await staffService.resetPassword(id, actorId);

    res.status(200).json({
      status: 'success',
      data: {
        temporaryPassword: result.temporaryPassword,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/staff/users/:id
 * Soft delete a user. Query param: forceDelete=true to force.
 */
export async function softDelete(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actorId = req.user!.userId;
    const { id } = req.params;
    const forceDelete = req.query.forceDelete === 'true';

    await staffService.softDelete(id, actorId, forceDelete);

    res.status(200).json({
      status: 'success',
      message: 'User berhasil dinonaktifkan',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/staff/teams
 * Get all Padal teams with their Teknisi members.
 */
export async function getPadalTeams(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teams = await staffService.getPadalTeams();

    res.status(200).json({
      status: 'success',
      data: teams,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/staff/teams/:padalId/members
 * Add a Teknisi to a Padal team.
 * Body: { teknisiId }
 */
export async function addTeknisiToPadal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actorId = req.user!.userId;
    const { padalId } = req.params;
    const { teknisiId } = req.body;

    if (!teknisiId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'teknisiId wajib diisi');
    }

    await staffService.addTeknisiToPadal(teknisiId, padalId, actorId);

    res.status(201).json({
      status: 'success',
      message: 'Teknisi berhasil ditambahkan ke tim',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/staff/teams/:padalId/members/:teknisiId
 * Remove a Teknisi from a Padal team.
 */
export async function removeTeknisiFromPadal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actorId = req.user!.userId;
    const { padalId, teknisiId } = req.params;

    await staffService.removeTeknisiFromPadal(teknisiId, padalId, actorId);

    res.status(200).json({
      status: 'success',
      message: 'Teknisi berhasil dilepas dari tim',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/staff/available-teknisi
 * Get all Teknisi not assigned to any Padal team.
 */
export async function getAvailableTeknisi(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teknisis = await staffService.getAvailableTeknisi();

    res.status(200).json({
      status: 'success',
      data: teknisis,
    });
  } catch (error) {
    next(error);
  }
}
