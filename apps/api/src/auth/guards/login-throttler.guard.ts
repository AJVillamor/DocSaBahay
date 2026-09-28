import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const LOGIN_THROTTLE = { name: 'login', ttl: 60_000, limit: 5 };

/**
 * Limits login attempts to 5 per minute per client IP + email, so one
 * attacker cannot brute-force an account and one IP cannot lock out others.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: Record<string, unknown>): Promise<string> {
    const body = request.body as { email?: unknown } | undefined;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const ip = typeof request.ip === 'string' ? request.ip : 'unknown';
    return Promise.resolve(`${ip}|${email}`);
  }
}
