import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = 'SATKER' | 'BIDTEKKOM' | 'PADAL' | 'TEKNISI';

interface JwtPayload {
  userId: string;
  nama: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// ─── Role-Based Route Guards ────────────────────────────────────────────────

const ROLE_GUARDS: Record<string, Role[]> = {
  '/dashboard/staff': ['BIDTEKKOM'],
  '/dashboard/teams': ['BIDTEKKOM'],
  '/dashboard/audit-log': ['BIDTEKKOM'],
  '/dashboard/system-settings': ['BIDTEKKOM'],
  '/dashboard/reports': ['BIDTEKKOM', 'PADAL'],
  '/dashboard/my-team': ['PADAL'],
  '/dashboard/create-ticket': ['SATKER'],
};

// ─── Auth Pages (redirect to dashboard if authenticated) ────────────────────

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

// ─── Helper: Decode JWT payload without verification ────────────────────────

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Base64url decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const decoded = JSON.parse(jsonStr) as JwtPayload;

    // Basic validation: check required fields exist
    if (!decoded.userId || !decoded.role) return null;

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;

    return decoded;
  } catch {
    return null;
  }
}

// ─── Middleware ─────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Decode JWT payload (null if missing, invalid, or expired)
  const user = token ? decodeJwtPayload(token) : null;
  const isAuthenticated = user !== null;

  // ── Auth pages: redirect authenticated users to /dashboard ──
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Dashboard routes: require authentication ──
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── Role-based guards ──
    for (const [route, allowedRoles] of Object.entries(ROLE_GUARDS)) {
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        if (!allowedRoles.includes(user!.role)) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        break;
      }
    }
  }

  return NextResponse.next();
}

// ─── Matcher Config ─────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
};
