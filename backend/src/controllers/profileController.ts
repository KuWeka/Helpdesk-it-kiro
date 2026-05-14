import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import * as profileService from '../services/profileService';
import { AppError } from '../utils/AppError';

/**
 * GET /api/profile
 * Return the authenticated user's profile.
 */
export async function getProfileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await profileService.getProfile(req.user!.userId);

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/profile
 * Update the authenticated user's profile (nama, nomorWhatsApp, divisi).
 */
export async function updateProfileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nama, nomorWhatsApp, divisi } = req.body;

    const profile = await profileService.updateProfile(
      req.user!.userId,
      { nama, nomorWhatsApp, divisi }
    );

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/profile/password
 * Change the authenticated user's password.
 */
export async function changePasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Field currentPassword dan newPassword diperlukan');
    }

    await profileService.changePassword(req.user!.userId, { currentPassword, newPassword });

    res.status(200).json({
      status: 'success',
      message: 'Password berhasil diubah',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/photo
 * Upload a new profile photo for the authenticated user.
 */
export async function uploadPhotoHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'File foto diperlukan');
    }

    const profile = await profileService.updateProfile(
      req.user!.userId,
      {},
      req.file
    );

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profile/photo/:userId
 * Serve the profile photo file for a given user (authenticated access).
 */
export async function getPhotoHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params;

    const profile = await profileService.getProfile(userId);

    if (!profile.foto) {
      throw new AppError(404, 'NOT_FOUND', 'Foto profil belum diatur');
    }

    const photoPath = path.join(__dirname, '..', '..', 'uploads', 'photos', profile.foto);

    if (!fs.existsSync(photoPath)) {
      throw new AppError(404, 'NOT_FOUND', 'File foto tidak ditemukan');
    }

    res.sendFile(photoPath);
  } catch (error) {
    next(error);
  }
}
