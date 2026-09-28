import type { MeResponse } from '@doksabahay/shared';

import { avatarColor, initialsFor } from '@/lib/avatar';
import { cn } from '@/lib/utils';

/** Initials on a colour derived from the user id. Decorative: show the name next to it. */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<MeResponse, 'id' | 'email' | 'profile'>;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
        avatarColor(user.id),
        className,
      )}
    >
      {initialsFor(user)}
    </span>
  );
}
