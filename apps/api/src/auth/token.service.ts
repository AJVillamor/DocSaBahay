import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, User } from '@prisma/client';

import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AccountInactiveException, InvalidRefreshTokenException } from './auth.exceptions';
import { AccessTokenPayload, REFRESH_TOKEN_TTL_DAYS } from './auth.types';

/**
 * Issues and validates access JWTs and opaque, rotating refresh tokens.
 * Refresh tokens are stored only as an HMAC-SHA256 digest (keyed with
 * `JWT_REFRESH_SECRET`), so a database leak does not expose usable tokens.
 */
@Injectable()
export class TokenService {
  private readonly refreshSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  /** Signs a 15-minute access token carrying `{ sub, role, tokenVersion }`. */
  signAccessToken(user: Pick<User, 'id' | 'role' | 'tokenVersion'>): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    return this.jwt.signAsync(payload);
  }

  /** Returns the verified payload, or `null` for a missing, malformed or expired token. */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      return typeof payload.sub === 'string' && typeof payload.tokenVersion === 'number'
        ? payload
        : null;
    } catch {
      // Invalid signature, expiry or malformed token: treated as unauthenticated.
      return null;
    }
  }

  /**
   * Creates a refresh token. Omit `familyId` to start a new rotation chain (a new sign-in).
   *
   * @returns The raw token for the cookie. Only its digest is stored.
   */
  async issueRefreshToken(userId: string, familyId: string = randomUUID()): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.digest(token),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return token;
  }

  /**
   * Exchanges a refresh token for a new one in the same family.
   * Presenting an already-revoked token is treated as theft: the whole
   * family is revoked so neither the attacker nor the victim can continue.
   *
   * @throws InvalidRefreshTokenException for unknown, expired, revoked or reused tokens.
   * @throws AccountInactiveException when the user is suspended or deactivated.
   */
  async rotateRefreshToken(token: string): Promise<{ user: User; refreshToken: string }> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.digest(token) },
      include: { user: true },
    });
    if (!existing) {
      throw new InvalidRefreshTokenException();
    }
    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new InvalidRefreshTokenException();
    }
    if (existing.expiresAt <= new Date()) {
      throw new InvalidRefreshTokenException();
    }
    if (existing.user.status !== AccountStatus.ACTIVE) {
      throw new AccountInactiveException(existing.user.status);
    }

    // Claim atomically: a concurrent request presenting the same token loses the race.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.revokeFamily(existing.familyId);
      throw new InvalidRefreshTokenException();
    }

    const refreshToken = await this.issueRefreshToken(existing.userId, existing.familyId);
    return { user: existing.user, refreshToken };
  }

  /** Revokes one refresh token (logout). Unknown or already-revoked tokens are ignored. */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.digest(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes every active refresh token for a user, regardless of family —
   * used when an admin changes a user's account status, so every signed-in
   * session (all devices/tabs) is signed out at once. Pair with bumping
   * `User.tokenVersion` (see `AuthStateService`) to also invalidate any
   * still-valid access token immediately rather than after it expires.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private digest(token: string): string {
    return createHmac('sha256', this.refreshSecret).update(token).digest('hex');
  }
}
