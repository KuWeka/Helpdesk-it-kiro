import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Generates a unique filename using UUID while preserving the original file extension.
 *
 * @param originalName - The original filename (e.g., "document.pdf")
 * @returns A UUID-based filename with the original extension (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf")
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const uniqueId = uuidv4();
  return `${uniqueId}${ext}`;
}
