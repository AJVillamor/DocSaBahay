'use client';

import { VerificationStatus } from '@doksabahay/shared';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { FormAlert } from '@/components/form/form-alert';
import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { useAdminDoctors, useReviewDoctor, type AdminDoctorsFilters } from './use-admin-doctors';

const REJECT_NOTE_MAX_LENGTH = 1000;

interface RejectTarget {
  id: string;
  name: string;
}

/** Sheet asking for the (required) rejection note, opened from the table's inline dropdown. */
function RejectDoctorDialog({
  target,
  onOpenChange,
}: {
  target: RejectTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState('');
  const review = useReviewDoctor();
  const open = target !== null;
  const noteMissing = note.trim().length === 0;

  const close = (next: boolean): void => {
    if (!next) {
      setNote('');
      review.reset();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="gap-4 px-4 py-4">
        <SheetHeader className="p-0">
          <SheetTitle>Reject doctor profile</SheetTitle>
          <SheetDescription>
            {target ? `Dr. ${target.name} will be notified with your note.` : null}
          </SheetDescription>
        </SheetHeader>

        {review.error ? <FormAlert>{review.error.message}</FormAlert> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reject-doctor-note">Note</Label>
          <Textarea
            id="reject-doctor-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={REJECT_NOTE_MAX_LENGTH}
            rows={3}
            aria-invalid={noteMissing}
            placeholder="e.g. License number could not be verified."
          />
        </div>

        <SheetFooter className="p-0">
          <Button
            type="button"
            variant="destructive"
            disabled={!target || review.isPending || noteMissing}
            onClick={() => {
              if (!target) return;
              review.mutate(
                { id: target.id, input: { decision: 'REJECTED', note: note.trim() } },
                { onSuccess: () => close(false) },
              );
            }}
          >
            {review.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors hover:border-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

interface FormState {
  q: string;
  verificationStatus: string;
}

const EMPTY_FORM: FormState = { q: '', verificationStatus: '' };

function verificationVariant(status: VerificationStatus): 'default' | 'secondary' | 'destructive' {
  if (status === VerificationStatus.APPROVED) return 'secondary';
  if (status === VerificationStatus.PENDING) return 'default';
  return 'destructive';
}

/**
 * `/admin/doctors`: search/filter doctor profiles awaiting or past review.
 * Honors an initial `?verificationStatus=` query param (e.g. the dashboard's
 * "pending doctor reviews" shortcut) — read once, on mount.
 */
export function AdminDoctorsPage() {
  const searchParams = useSearchParams();
  const initialVerificationStatus = searchParams.get('verificationStatus') ?? '';
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    verificationStatus: initialVerificationStatus,
  });
  const [filters, setFilters] = useState<AdminDoctorsFilters>({
    verificationStatus: initialVerificationStatus || undefined,
    page: 1,
  });
  const doctors = useAdminDoctors(filters);
  const approve = useReviewDoctor();
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);

  function applyFilters(overrides: Partial<FormState> = {}): void {
    const next = { ...form, ...overrides };
    setForm(next);
    setFilters({
      q: next.q.trim() || undefined,
      verificationStatus: next.verificationStatus || undefined,
      page: 1,
    });
  }

  function resetFilters(): void {
    setForm(EMPTY_FORM);
    setFilters({ page: 1 });
  }

  const totalPages = doctors.data
    ? Math.max(1, Math.ceil(doctors.data.totalCount / doctors.data.pageSize))
    : 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Doctor reviews</h1>
        <p className="text-muted-foreground">Approve or reject doctor profiles.</p>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label htmlFor="doctor-search-q" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="doctor-search-q"
            placeholder="Name"
            value={form.q}
            onChange={(event) => setForm((prev) => ({ ...prev, q: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="doctor-search-verification" className="text-sm font-medium">
            Verification
          </label>
          <select
            id="doctor-search-verification"
            className={cn(selectClassName)}
            value={form.verificationStatus}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, verificationStatus: event.target.value }))
            }
          >
            <option value="">Any status</option>
            <option value={VerificationStatus.PENDING}>Pending</option>
            <option value={VerificationStatus.APPROVED}>Approved</option>
            <option value={VerificationStatus.REJECTED}>Rejected</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {doctors.isPending ? <PageLoading label="Loading doctors…" /> : null}
      {doctors.isError ? (
        <PageError message={doctors.error.message} onRetry={() => void doctors.refetch()} />
      ) : null}
      {approve.isError ? <FormAlert>{approve.error.message}</FormAlert> : null}
      {doctors.data && doctors.data.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="font-medium">No doctors match your filters</p>
          <p className="text-sm text-muted-foreground">Try widening your search.</p>
        </div>
      ) : null}

      {doctors.data && doctors.data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Verification</th>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {doctors.data.items.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/doctors/${doctor.id}`}
                        className="font-medium hover:underline"
                      >
                        Dr. {doctor.firstName} {doctor.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{doctor.email}</td>
                    <td className="px-4 py-2">
                      {doctor.verificationStatus === VerificationStatus.PENDING ? (
                        <select
                          className={cn(selectClassName, 'h-8 w-23')}
                          value=""
                          disabled={approve.isPending}
                          onChange={(event) => {
                            const decision = event.target.value;
                            if (decision === 'APPROVED') {
                              approve.mutate({ id: doctor.id, input: { decision: 'APPROVED' } });
                            } else if (decision === 'REJECTED') {
                              setRejectTarget({
                                id: doctor.id,
                                name: `${doctor.firstName} ${doctor.lastName}`,
                              });
                            }
                          }}
                        >
                          <option value="" disabled>
                            Pending
                          </option>
                          <option value="APPROVED">Approve</option>
                          <option value="REJECTED">Reject</option>
                        </select>
                      ) : (
                        <Badge variant={verificationVariant(doctor.verificationStatus)}>
                          {doctor.verificationStatus}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{doctor.accountStatus}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(doctor.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {filters.page} of {totalPages} · {doctors.data.totalCount} doctor
              {doctors.data.totalCount === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <RejectDoctorDialog
        target={rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      />
    </div>
  );
}
