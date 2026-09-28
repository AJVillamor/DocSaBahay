import { Role, type MeResponse } from '@doksabahay/shared';

/** Background colours with white text at ≥ 4.5:1 contrast. Listed literally so Tailwind keeps them. */
const AVATAR_COLORS = [
  'bg-sky-700',
  'bg-emerald-700',
  'bg-violet-700',
  'bg-rose-700',
  'bg-amber-700',
  'bg-teal-700',
  'bg-indigo-700',
  'bg-fuchsia-700',
] as const;

/** Deterministic colour class for a seed (e.g. a user id): same seed, same colour. */
export function avatarColor(seed: string): string {
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  return AVATAR_COLORS[(hash >>> 0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

/** Two-letter initials from the profile name, falling back to the email. */
export function initialsFor(user: Pick<MeResponse, 'email' | 'profile'>): string {
  const { profile } = user;
  const letters = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`
    : user.email.replace(/[^a-z0-9]/gi, '').slice(0, 2);
  return letters.toUpperCase() || '?';
}

/** How to address the user in the UI, e.g. "Dr. Maria Santos". */
export function displayNameFor(user: Pick<MeResponse, 'email' | 'profile' | 'role'>): string {
  if (!user.profile) {
    return user.email;
  }
  const name = `${user.profile.firstName} ${user.profile.lastName}`;
  return user.role === Role.DOCTOR ? `Dr. ${name}` : name;
}
