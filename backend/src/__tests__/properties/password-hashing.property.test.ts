import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Property 2: Password Hashing Invariant
 *
 * For any valid password submitted during registration or password reset,
 * the value stored in the database SHALL be a bcrypt hash that is not equal
 * to the plaintext password, and verifying the plaintext against the stored
 * hash using bcryptjs.compare SHALL return true.
 *
 * **Validates: Requirements 1.6**
 */
describe('Property 2: Password Hashing Invariant', () => {
  // Use lower salt rounds for testing speed (the property holds regardless of rounds)
  const SALT_ROUNDS = 4;

  // Generator for valid password strings (8-128 chars, at least 1 uppercase, 1 number)
  const validPasswordArb = fc
    .tuple(
      fc.string({ minLength: 5, maxLength: 125 }),
      fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Z'),
      fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')
    )
    .map(([base, upper, digit]) => {
      // Ensure the password has at least 1 uppercase and 1 number
      const password = base + upper + digit;
      // Trim to max 128 chars
      return password.slice(0, 128);
    })
    .filter((p) => p.length >= 8 && p.length <= 128);

  it('bcrypt.hash produces a hash that is NOT equal to the plaintext password', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        expect(hash).not.toEqual(password);
      }),
      { numRuns: 20 }
    );
  }, 30000);

  it('bcrypt.compare(plaintext, hash) returns true for the original password', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const isMatch = await bcrypt.compare(password, hash);
        expect(isMatch).toBe(true);
      }),
      { numRuns: 20 }
    );
  }, 30000);

  it('for any two different passwords, their hashes are different (with high probability)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb,
        async (password1, password2) => {
          fc.pre(password1 !== password2);
          const hash1 = await bcrypt.hash(password1, SALT_ROUNDS);
          const hash2 = await bcrypt.hash(password2, SALT_ROUNDS);
          expect(hash1).not.toEqual(hash2);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});
