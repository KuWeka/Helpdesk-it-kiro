import { prisma } from '../lib/prisma';
import * as auditService from './auditService';
import { AppError } from '../utils/AppError';


/**
 * Default system settings returned when no record exists in the database.
 */
const DEFAULT_SETTINGS = {
  appName: 'SIGAP',
  appLogo: null as string | null,
};

/**
 * System settings response shape.
 */
export interface SystemSettingsResponse {
  id?: string;
  appName: string;
  appLogo: string | null;
}

/**
 * Get current system settings.
 * If no record exists in the SystemSettings table, returns default values without error.
 */
export async function getSettings(): Promise<SystemSettingsResponse> {
  const settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    id: settings.id,
    appName: settings.appName,
    appLogo: settings.appLogo,
  };
}

/**
 * Update the application name.
 * Creates a new settings record if none exists, otherwise updates the existing one.
 * Logs a SETTINGS_CHANGE audit event.
 *
 * @param appName - New application name (1-100 characters, non-blank)
 * @param actorId - ID of the user performing the update
 * @param actorNama - Name of the user performing the update
 */
export async function updateAppName(
  appName: string,
  actorId: string,
  actorNama: string
): Promise<SystemSettingsResponse> {
  // Validate appName
  const trimmed = appName.trim();
  if (!trimmed || trimmed.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nama aplikasi tidak boleh kosong');
  }
  if (trimmed.length > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nama aplikasi tidak boleh lebih dari 100 karakter');
  }

  // Find existing settings or create new
  const existing = await prisma.systemSettings.findFirst();

  let settings;
  if (existing) {
    settings = await prisma.systemSettings.update({
      where: { id: existing.id },
      data: { appName: trimmed },
    });
  } else {
    settings = await prisma.systemSettings.create({
      data: { appName: trimmed },
    });
  }

  // Log audit event
  await auditService.log({
    eventType: 'SETTINGS_CHANGE',
    actorId,
    actorNama,
    targetEntityId: settings.id,
    metadata: { field: 'appName', newValue: trimmed },
  });

  return {
    id: settings.id,
    appName: settings.appName,
    appLogo: settings.appLogo,
  };
}

/**
 * Update the system logo.
 * Creates a new settings record if none exists, otherwise updates the existing one.
 * Logs a SETTINGS_CHANGE audit event.
 *
 * @param logoPath - Stored filename/path of the uploaded logo
 * @param actorId - ID of the user performing the update
 * @param actorNama - Name of the user performing the update
 */
export async function updateLogo(
  logoPath: string,
  actorId: string,
  actorNama: string
): Promise<SystemSettingsResponse> {
  // Find existing settings or create new
  const existing = await prisma.systemSettings.findFirst();

  let settings;
  if (existing) {
    settings = await prisma.systemSettings.update({
      where: { id: existing.id },
      data: { appLogo: logoPath },
    });
  } else {
    settings = await prisma.systemSettings.create({
      data: { appLogo: logoPath },
    });
  }

  // Log audit event
  await auditService.log({
    eventType: 'SETTINGS_CHANGE',
    actorId,
    actorNama,
    targetEntityId: settings.id,
    metadata: { field: 'appLogo', newValue: logoPath },
  });

  return {
    id: settings.id,
    appName: settings.appName,
    appLogo: settings.appLogo,
  };
}
