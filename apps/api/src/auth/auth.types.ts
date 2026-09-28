import { AUTH_COOKIES } from '@doksabahay/shared';
import { Role } from '@prisma/client';
import type { Request } from 'express';

export const ACCESS_COOKIE = AUTH_COOKIES.access;
export const REFRESH_COOKIE = AUTH_COOKIES.refresh;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 7;

/** Claims inside the access JWT. */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  tokenVersion: number;
}

/** The caller of an authenticated request, attached by `JwtAuthGuard`. */
export interface AuthUser {
  id: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/** Reads a cookie set by cookie-parser, ignoring non-string values. */
export function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
