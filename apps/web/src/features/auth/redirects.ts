import { Role, type MeResponse } from '@doksabahay/shared';

/** URL prefix of each role's area. Everything under it is guarded for that role. */
export const ROLE_AREA: Record<Role, string> = {
  [Role.PATIENT]: '/patient',
  [Role.DOCTOR]: '/doctor',
  [Role.ADMIN]: '/admin',
};

/** Where a signed-in user belongs by default. */
export function homePathFor(user: MeResponse): string {
  if (user.role === Role.PATIENT && user.profileCompleted === false) {
    return '/patient/onboarding';
  }
  return ROLE_AREA[user.role];
}

/**
 * Where to send a user right after sign-in: `next` if it is a path inside
 * their own area, otherwise their home. Patients with an incomplete profile
 * always go to onboarding first.
 */
export function postSignInPath(user: MeResponse, next: string | null | undefined): string {
  const home = homePathFor(user);
  if (home === '/patient/onboarding' || !next) {
    return home;
  }
  const area = ROLE_AREA[user.role];
  const isOwnArea = next === area || next.startsWith(`${area}/`) || next.startsWith(`${area}?`);
  // Only same-origin paths; "//evil.example" would be protocol-relative.
  return isOwnArea && !next.startsWith('//') ? next : home;
}
