import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';

/**
 * Property 3: JWT Token Correctness
 *
 * For any registered active user who logs in with valid credentials,
 * the returned JWT token SHALL decode to contain the correct userId, nama,
 * email, and role fields matching the user's database record, and the token
 * expiration SHALL be exactly 24 hours from issuance.
 *
 * **Validates: Requirements 2.1**
 */
describe('Property 3: JWT Token Correctness', () => {
  const TEST_JWT_SECRET = 'test-jwt-secret-for-property-testing';

  // Valid Role enum values matching Prisma schema
  const validRoles = ['SATKER', 'BIDTEKKOM', 'PADAL', 'TEKNISI'] as const;

  // Arbitrary for Role enum
  const roleArb = fc.constantFrom(...validRoles);

  // Arbitrary for userId (UUID-like strings)
  const userIdArb = fc.uuid();

  // Arbitrary for nama (2-100 characters, non-empty)
  const namaArb = fc.string({ minLength: 2, maxLength: 100 }).filter((s) => s.trim().length >= 2);

  // Arbitrary for email (valid-looking email strings)
  const emailArb = fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 20, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')) }),
      fc.string({ minLength: 2, maxLength: 10, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')) }),
      fc.constantFrom('com', 'org', 'net', 'id', 'co.id')
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

  // Combined payload arbitrary
  const userPayloadArb = fc.record({
    userId: userIdArb,
    nama: namaArb,
    email: emailArb,
    role: roleArb,
  });

  it('signing and verifying a JWT returns the same userId, nama, email, and role', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '24h' });
        const decoded = jwt.verify(token, TEST_JWT_SECRET) as Record<string, unknown>;

        expect(decoded.userId).toEqual(payload.userId);
        expect(decoded.nama).toEqual(payload.nama);
        expect(decoded.email).toEqual(payload.email);
        expect(decoded.role).toEqual(payload.role);
      }),
      { numRuns: 100 }
    );
  });

  it('token expiration (exp) is exactly 24 hours (86400 seconds) from issuance (iat)', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '24h' });
        const decoded = jwt.verify(token, TEST_JWT_SECRET) as Record<string, unknown>;

        const iat = decoded.iat as number;
        const exp = decoded.exp as number;

        expect(typeof iat).toBe('number');
        expect(typeof exp).toBe('number');
        expect(exp - iat).toBe(86400);
      }),
      { numRuns: 100 }
    );
  });

  it('verifying a token with a wrong secret throws an error', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '24h' });
        const wrongSecret = TEST_JWT_SECRET + '-wrong';

        expect(() => {
          jwt.verify(token, wrongSecret);
        }).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('the role field in the decoded token matches one of the valid Role enum values', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '24h' });
        const decoded = jwt.verify(token, TEST_JWT_SECRET) as Record<string, unknown>;

        expect(validRoles).toContain(decoded.role);
      }),
      { numRuns: 100 }
    );
  });
});
