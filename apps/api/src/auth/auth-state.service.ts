import { Injectable } from '@nestjs/common';
import { AccountStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/** The parts of a user that decide whether an access token is still honoured. */
export interface AuthState {
  role: Role;
  status: AccountStatus;
  tokenVersion: number;
}

/**
 * Short-lived in-memory cache of each user's `AuthState`, so every
 * authenticated request can check `tokenVersion` and `status` without a
 * database round-trip. Code that suspends a user or bumps `tokenVersion`
 * must call {@link AuthStateService.invalidate} for the change to apply at once.
 */
@Injectable()
export class AuthStateService {
  static readonly TTL_MS = 30_000;

  private readonly cache = new Map<string, { state: AuthState | null; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the user's current auth state, or `null` if the user no longer exists.
   *
   * @param options.fresh Skip the cache and reload from the database.
   */
  async get(userId: string, options: { fresh?: boolean } = {}): Promise<AuthState | null> {
    const now = Date.now();
    const cached = this.cache.get(userId);
    if (!options.fresh && cached && cached.expiresAt > now) {
      return cached.state;
    }

    const state = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true, tokenVersion: true },
    });
    this.evictExpired(now);
    this.cache.set(userId, { state, expiresAt: now + AuthStateService.TTL_MS });
    return state;
  }

  /** Drops the cached state so the next request reads the database. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  private evictExpired(now: number): void {
    for (const [userId, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(userId);
    }
  }
}
