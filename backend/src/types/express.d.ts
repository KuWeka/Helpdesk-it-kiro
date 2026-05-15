import { Role } from '@prisma/client';

/**
 * JWT payload structure attached to req.user after authentication.
 */
export interface JwtUserPayload {
  userId: string;
  nama: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      requestId?: string;
    }
  }
}
