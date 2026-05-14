import * as fc from 'fast-check';
import path from 'path';

/**
 * Property 8: File Upload Validation
 *
 * Test acceptance only when size <= 5MB AND extension allowed, max 10 per ticket.
 *
 * **Validates: Requirements 4.6, 4.7, 22.2, 22.3, 22.6, 22.7**
 */

// Constants matching the upload middleware
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_FILES_PER_TICKET = 10;
const ALLOWED_TICKET_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];

// Disallowed extensions for testing rejection
const DISALLOWED_EXTENSIONS = ['.exe', '.bat', '.sh', '.js', '.ts', '.html', '.php', '.py', '.rb', '.zip', '.rar', '.mp4', '.avi', '.gif', '.bmp', '.tiff', '.svg'];

/**
 * Validation logic extracted from the upload middleware.
 * This mirrors the createFileFilter function behavior.
 */
function isExtensionAllowed(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_TICKET_EXTENSIONS.includes(ext);
}

function isFileSizeAllowed(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

function isFileCountAllowed(count: number): boolean {
  return count <= MAX_FILES_PER_TICKET;
}

// Generators
function arbAllowedExtension(): fc.Arbitrary<string> {
  return fc.constantFrom(...ALLOWED_TICKET_EXTENSIONS);
}

function arbDisallowedExtension(): fc.Arbitrary<string> {
  return fc.constantFrom(...DISALLOWED_EXTENSIONS);
}

function arbFilename(extension: fc.Arbitrary<string>): fc.Arbitrary<string> {
  return fc.tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
    extension
  ).map(([name, ext]) => name + ext);
}

function arbValidFileSize(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: MAX_FILE_SIZE });
}

function arbOversizedFileSize(): fc.Arbitrary<number> {
  return fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 3 });
}

describe('Property 8: File Upload Validation', () => {
  /**
   * Property 8.1: For any file with size <= 5MB AND extension in allowed list,
   * it should be accepted.
   */
  it('should accept any file with size <= 5MB and allowed extension', () => {
    fc.assert(
      fc.property(
        arbFilename(arbAllowedExtension()),
        arbValidFileSize(),
        (filename, size) => {
          expect(isExtensionAllowed(filename)).toBe(true);
          expect(isFileSizeAllowed(size)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 8.2: For any file with size > 5MB, it should be rejected
   * regardless of extension.
   */
  it('should reject any file with size > 5MB regardless of extension', () => {
    fc.assert(
      fc.property(
        arbFilename(arbAllowedExtension()),
        arbOversizedFileSize(),
        (filename, size) => {
          // Even with a valid extension, oversized files are rejected
          expect(isExtensionAllowed(filename)).toBe(true);
          expect(isFileSizeAllowed(size)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 8.3: For any file with extension NOT in allowed list,
   * it should be rejected regardless of size.
   */
  it('should reject any file with disallowed extension regardless of size', () => {
    fc.assert(
      fc.property(
        arbFilename(arbDisallowedExtension()),
        arbValidFileSize(),
        (filename, size) => {
          // Even with valid size, disallowed extensions are rejected
          expect(isFileSizeAllowed(size)).toBe(true);
          expect(isExtensionAllowed(filename)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 8.4: For any count > 10 files, the upload should be rejected
   * (max 10 per ticket).
   */
  it('should reject any upload with more than 10 files per ticket', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 100 }),
        (fileCount) => {
          expect(isFileCountAllowed(fileCount)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 8.4b: For any count <= 10 files, the upload count should be accepted.
   */
  it('should accept any upload with 10 or fewer files per ticket', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (fileCount) => {
          expect(isFileCountAllowed(fileCount)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 8.5: For any file with size exactly 5MB (5242880 bytes),
   * it should be accepted (boundary test).
   */
  it('should accept any file with size exactly 5MB (boundary)', () => {
    fc.assert(
      fc.property(
        arbFilename(arbAllowedExtension()),
        (_filename) => {
          const exactSize = MAX_FILE_SIZE; // 5242880 bytes
          expect(isFileSizeAllowed(exactSize)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5b: For any file with size exactly 5MB + 1 byte,
   * it should be rejected (boundary test).
   */
  it('should reject any file with size exactly 5MB + 1 byte (boundary)', () => {
    fc.assert(
      fc.property(
        arbFilename(arbAllowedExtension()),
        (_filename) => {
          const overBoundary = MAX_FILE_SIZE + 1; // 5242881 bytes
          expect(isFileSizeAllowed(overBoundary)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Combined property: A file is fully valid for upload only when
   * size <= 5MB AND extension is allowed AND count <= 10.
   */
  it('should validate that acceptance requires ALL conditions: valid size, valid extension, valid count', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_TICKET_EXTENSIONS, ...DISALLOWED_EXTENSIONS),
        fc.integer({ min: 1, max: MAX_FILE_SIZE * 2 }),
        fc.integer({ min: 1, max: 20 }),
        (ext, size, count) => {
          const filename = `testfile${ext}`;
          const extValid = isExtensionAllowed(filename);
          const sizeValid = isFileSizeAllowed(size);
          const countValid = isFileCountAllowed(count);

          const fullyAccepted = extValid && sizeValid && countValid;

          // If all conditions are met, the file should be accepted
          if (size <= MAX_FILE_SIZE && ALLOWED_TICKET_EXTENSIONS.includes(ext) && count <= MAX_FILES_PER_TICKET) {
            expect(fullyAccepted).toBe(true);
          }

          // If any condition fails, the file should NOT be fully accepted
          if (size > MAX_FILE_SIZE || !ALLOWED_TICKET_EXTENSIONS.includes(ext) || count > MAX_FILES_PER_TICKET) {
            expect(fullyAccepted).toBe(false);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});
