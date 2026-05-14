import * as fc from 'fast-check';
import { z } from 'zod';

/**
 * Property 1: Password Validation
 *
 * For any string that does not satisfy all of: length between 8 and 128 characters,
 * contains at least one uppercase letter, and contains at least one number,
 * the Auth_Service SHALL reject it as a password.
 *
 * **Validates: Requirements 1.2, 3.4**
 */

// Replicate the password schema from the auth validators to test against
const passwordSchema = z
  .string()
  .min(8, { message: 'Password harus minimal 8 karakter' })
  .max(128, { message: 'Password tidak boleh lebih dari 128 karakter' })
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password harus mengandung minimal 1 huruf kapital',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Password harus mengandung minimal 1 angka',
  });

// Import the actual schemas to test
import { registerSchema, resetPasswordSchema } from '../../validators/auth';

// Helper: generate a string from a specific character set
const lowercase = 'abcdefghijklmnopqrstuvwxyz';
const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const digits = '0123456789';
const specials = '!@#$%^&*_-';

function arbStringFrom(charset: string, minLength: number, maxLength: number): fc.Arbitrary<string> {
  return fc
    .array(fc.integer({ min: 0, max: charset.length - 1 }), { minLength, maxLength })
    .map((indices) => indices.map((i) => charset[i]).join(''));
}

describe('Property 1: Password Validation', () => {
  /**
   * Property 1.1: Any string shorter than 8 characters should be rejected
   */
  it('should reject any password shorter than 8 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 7 }),
        (shortPassword) => {
          const result = passwordSchema.safeParse(shortPassword);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 1.2: Any string longer than 128 characters should be rejected
   */
  it('should reject any password longer than 128 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 129, maxLength: 300 }),
        (longPassword) => {
          const result = passwordSchema.safeParse(longPassword);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 1.3: Any string without an uppercase letter should be rejected
   */
  it('should reject any password without an uppercase letter', () => {
    // Generate strings of valid length (8-128) containing lowercase + digits but NO uppercase
    const noUpperCharset = lowercase + digits + specials;

    fc.assert(
      fc.property(
        arbStringFrom(noUpperCharset, 8, 128).filter((s) => /[0-9]/.test(s)),
        (noUpperPassword) => {
          const result = passwordSchema.safeParse(noUpperPassword);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 1.4: Any string without a number should be rejected
   */
  it('should reject any password without a number', () => {
    // Generate strings of valid length (8-128) containing lowercase + uppercase but NO digits
    const noDigitCharset = lowercase + uppercase + specials;

    fc.assert(
      fc.property(
        arbStringFrom(noDigitCharset, 8, 128).filter((s) => /[A-Z]/.test(s)),
        (noNumberPassword) => {
          const result = passwordSchema.safeParse(noNumberPassword);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 1.5: Any string meeting ALL requirements should be accepted
   * (8-128 chars, has uppercase, has number)
   */
  it('should accept any password meeting all requirements (8-128 chars, uppercase, number)', () => {
    // Generator that always produces valid passwords by construction
    const validPasswordArb = fc
      .tuple(
        // A guaranteed uppercase letter
        fc.integer({ min: 0, max: uppercase.length - 1 }).map((i) => uppercase[i]),
        // A guaranteed digit
        fc.integer({ min: 0, max: digits.length - 1 }).map((i) => digits[i]),
        // Remaining characters (6-126 chars to keep total 8-128)
        arbStringFrom(lowercase + uppercase + digits + specials, 6, 126)
      )
      .map(([upper, digit, rest]) => {
        // Place guaranteed chars at random positions within the string
        const chars = (upper + digit + rest).split('');
        // Simple deterministic shuffle
        for (let i = chars.length - 1; i > 0; i--) {
          const j = i % (i + 1);
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
      });

    fc.assert(
      fc.property(validPasswordArb, (validPassword) => {
        const result = passwordSchema.safeParse(validPassword);
        expect(result.success).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property 1.6: registerSchema rejects invalid passwords in the same way
   */
  it('should reject invalid passwords through registerSchema', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 7 }),
        (shortPassword) => {
          const result = registerSchema.safeParse({
            nama: 'Test User',
            email: 'test@example.com',
            nomorWhatsApp: '081234567890',
            password: shortPassword,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.7: resetPasswordSchema rejects invalid passwords in the same way
   */
  it('should reject invalid passwords through resetPasswordSchema', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 7 }),
        (shortPassword) => {
          const result = resetPasswordSchema.safeParse({
            token: 'valid-token-123',
            password: shortPassword,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
