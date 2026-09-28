import { AUTH_COOKIES } from '@doksabahay/shared';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Sends visitors without a session to `/login?next=…` before a protected page
 * renders. UX only: the API is the real authority, and each role layout
 * still checks the user's role on the client.
 *
 * The refresh cookie counts as a session too: the access cookie expires
 * after 15 minutes, and the API client renews it on the first request.
 */
export function proxy(request: NextRequest) {
  const { cookies, nextUrl } = request;
  if (cookies.has(AUTH_COOKIES.access) || cookies.has(AUTH_COOKIES.refresh)) {
    return NextResponse.next();
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${nextUrl.pathname}${nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/patient/:path*', '/doctor/:path*', '/admin/:path*'],
};
