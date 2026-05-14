import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import * as settingsService from '../services/settingsService';
import { AppError } from '../utils/AppError';

/**
 * GET /api/settings
 * Return current system settings. If no record exists, returns defaults.
 * Requires authentication (any role).
 */
export async function getSettingsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.getSettings();

    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/settings
 * Update the application name. Bidtekkom only.
 */
export async function updateSettingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appName } = req.body;

    if (appName === undefined || appName === null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Field appName diperlukan');
    }

    if (typeof appName !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Field appName harus berupa string');
    }

    const settings = await settingsService.updateAppName(
      appName,
      req.user!.userId,
      req.user!.nama
    );

    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/settings/logo
 * Upload a new system logo. Bidtekkom only.
 * Expects multipart/form-data with field name 'logo'.
 */
export async function uploadLogoHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'File logo diperlukan');
    }

    const logoPath = req.file.filename;

    const settings = await settingsService.updateLogo(
      logoPath,
      req.user!.userId,
      req.user!.nama
    );

    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/settings/logo
 * Serve the system logo file. Public/authenticated access.
 */
export async function getLogoHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.getSettings();

    if (!settings.appLogo) {
      throw new AppError(404, 'NOT_FOUND', 'Logo belum diatur');
    }

    const logoPath = path.join(__dirname, '..', '..', 'uploads', 'logos', settings.appLogo);

    if (!fs.existsSync(logoPath)) {
      throw new AppError(404, 'NOT_FOUND', 'File logo tidak ditemukan');
    }

    res.sendFile(logoPath);
  } catch (error) {
    next(error);
  }
}
