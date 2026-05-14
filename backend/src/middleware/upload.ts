import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
 * Creates Cloudinary storage with a specific destination folder.
 */
function createCloudinaryStorage(folderName: string) {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (_req: Request, _file: Express.Multer.File) => {
      // Use raw resource_type for tickets so we can upload pdf, docx, etc.
      // Use auto or image for photos/logos
      const resourceType = folderName === 'tickets' ? 'auto' : 'image';
      
      return {
        folder: `poldahelp/${folderName}`,
        resource_type: resourceType,
      };
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
  storage: createCloudinaryStorage('tickets'),
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
  storage: createCloudinaryStorage('photos'),
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
  storage: createCloudinaryStorage('logos'),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: createFileFilter(ALLOWED_LOGO_EXTENSIONS),
});
