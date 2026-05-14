import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { generateUniqueFilename } from '../utils/fileNaming';

// Upload directories
const UPLOAD_BASE = path.join(__dirname, '..', '..', 'uploads');
const UPLOAD_TICKETS = path.join(UPLOAD_BASE, 'tickets');
const UPLOAD_PHOTOS = path.join(UPLOAD_BASE, 'photos');
const UPLOAD_LOGOS = path.join(UPLOAD_BASE, 'logos');

// Ensure upload directories exist
[UPLOAD_TICKETS, UPLOAD_PHOTOS, UPLOAD_LOGOS].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed extensions per upload type
const ALLOWED_TICKET_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const ALLOWED_LOGO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg'];

/**
 * Creates a file filter function that validates file extensions.
 */
function createFileFilter(allowedExtensions: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Format file tidak diizinkan. Format yang diperbolehkan: ${allowedExtensions.join(', ')}`));
    }
  };
}

/**
 * Creates multer disk storage with a specific destination directory and UUID-based filenames.
 */
function createStorage(destination: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const uniqueName = generateUniqueFilename(file.originalname);
      cb(null, uniqueName);
    },
  });
}

/**
 * Multer upload configuration for ticket attachments.
 * - Max 5MB per file
 * - Allowed formats: jpg, jpeg, png, pdf, doc, docx, xls, xlsx
 * - Max 10 files per request
 */
export const ticketAttachment = multer({
  storage: createStorage(UPLOAD_TICKETS),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter: createFileFilter(ALLOWED_TICKET_EXTENSIONS),
});

/**
 * Multer upload configuration for profile photos.
 * - Max 5MB per file
 * - Allowed formats: jpg, jpeg, png
 * - Single file only
 */
export const profilePhoto = multer({
  storage: createStorage(UPLOAD_PHOTOS),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: createFileFilter(ALLOWED_PHOTO_EXTENSIONS),
});

/**
 * Multer upload configuration for system logo.
 * - Max 5MB per file
 * - Allowed formats: jpg, jpeg, png, svg
 * - Single file only
 */
export const systemLogo = multer({
  storage: createStorage(UPLOAD_LOGOS),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: createFileFilter(ALLOWED_LOGO_EXTENSIONS),
});
