'use client';

import { AccountStatus, type AdminUserDetail } from '@doksabahay/shared';
import { useState } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { useUpdateUserStatus } from './use-admin-users';

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

const REASON_MAX_LENGTH = 500;

const STATUS_LABELS: Record<AccountStatus, string> = {
  [AccountStatus.ACTIVE]: 'Active (reactivate)',
  [AccountStatus.SUSPENDED]: 'Suspended',
  [AccountStatus.DEACTIVATED]: 'Deactivated',
};

/**
 * Sheet-based status-change dialog. Reason is required unless reactivating
 * (status ACTIVE). Shows a cascade warning using `user.upcomingAppointmentCount`
 * when the new status is not ACTIVE — the API cancels those appointments.
 */
export function StatusChangeDialog({
  user,
  onOpenChange,
}: {
  user: AdminUserDetail | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<AccountStatus>(AccountStatus.SUSPENDED);
  const [reason, setReason] = useState('');
  const updateStatus = useUpdateUserStatus();
  const open = user !== null;
  const reasonRequired = status !== AccountStatus.ACTIVE;
  const reasonMissing = reasonRequired && reason.trim().length === 0;
  const statusUnchanged = user !== null && status === user.status;

  const close = (next: boolean): void => {
    if (!next) {
      setStatus(AccountStatus.SUSPENDED);
      setReason('');
      updateStatus.reset();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="gap-4 px-4 py-4">
        <SheetHeader className="p-0">
          <SheetTitle>Change account status</SheetTitle>
          <SheetDescription>
            {user
              ? `${user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : user.email} is currently ${user.status.toLowerCase()}.`
              : null}
          </SheetDescription>
        </SheetHeader>

        {updateStatus.error ? <FormAlert>{updateStatus.error.message}</FormAlert> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status-change-status">New status</Label>
          <select
            id="status-change-status"
            className={cn(selectClassName)}
            value={status}
            onChange={(event) => setStatus(event.target.value as AccountStatus)}
          >
            {Object.values(AccountStatus).map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status-change-reason">Reason{reasonRequired ? '' : ' (optional)'}</Label>
          <Textarea
            id="status-change-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            aria-invalid={reasonMissing}
            placeholder={reasonRequired ? 'e.g. Repeated no-shows reported by patients.' : undefined}
          />
        </div>

        {reasonRequired && user && user.upcomingAppointmentCount > 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This will also cancel {user.upcomingAppointmentCount} upcoming appointment
            {user.upcomingAppointmentCount === 1 ? '' : 's'}.
          </p>
        ) : null}

        {statusUnchanged ? (
          <p className="text-sm text-muted-foreground">
            This is already the account&apos;s current status.
          </p>
        ) : null}

        <SheetFooter className="p-0">
          <Button
            type="button"
            variant={reasonRequired ? 'destructive' : 'default'}
            disabled={!user || updateStatus.isPending || reasonMissing || statusUnchanged}
            onClick={() => {
              if (!user) return;
              const trimmed = reason.trim();
              updateStatus.mutate(
                { id: user.id, input: { status, reason: trimmed || undefined } },
                { onSuccess: () => close(false) },
              );
            }}
          >
            {updateStatus.isPending ? 'Saving…' : 'Save status'}
          </Button>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
