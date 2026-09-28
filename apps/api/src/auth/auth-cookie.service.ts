import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import { Env } from '../config/env';
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_DAYS,
} from './auth.types';

/** Writes and clears the httpOnly, SameSite=Lax auth cookies. */
@Injectable()
export class AuthCookieService {
  private readonly base: CookieOptions;

  constructor(config: ConfigService<Env, true>) {
    this.base = {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
    };
  }

  /** Sets both cookies after sign-in or refresh. */
  set(response: Response, tokens: { accessToken: string; refreshToken: string }): void {
    response.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.base,
      maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    });
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.base,
      maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }

  /** Expires both cookies (logout, or a refresh that failed). */
  clear(response: Response): void {
    response.clearCookie(ACCESS_COOKIE, this.base);
    response.clearCookie(REFRESH_COOKIE, this.base);
  }
}
