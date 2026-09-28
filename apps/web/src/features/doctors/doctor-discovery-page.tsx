'use client';

import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSpecializations } from '@/features/specializations/use-specializations';
import { cn } from '@/lib/utils';

import { DoctorSummaryCard } from './doctor-summary-card';
import { useDoctorDiscovery, type DoctorDiscoveryFilters } from './use-doctor-discovery';

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30';

const AVAILABLE_WITHIN_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: 'Within 1 day', value: '1' },
  { label: 'Within 3 days', value: '3' },
  { label: 'Within 7 days', value: '7' },
  { label: 'Within 14 days', value: '14' },
] as const;

interface FormState {
  q: string;
  specializationId: string;
  language: string;
  availableWithinDays: string;
}

const EMPTY_FORM: FormState = {
  q: '',
  specializationId: '',
  language: '',
  availableWithinDays: '',
};

/** `/patient/doctors`: search and filter bookable doctors, with pagination. */
export function DoctorDiscoveryPage() {
  const specializations = useSpecializations();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filters, setFilters] = useState<DoctorDiscoveryFilters>({ page: 1 });

  const discovery = useDoctorDiscovery(filters);

  function applyFilters(overrides: Partial<FormState> = {}): void {
    const next = { ...form, ...overrides };
    setForm(next);
    setFilters({
      q: next.q.trim() || undefined,
      specializationId: next.specializationId || undefined,
      language: next.language.trim() || undefined,
      availableWithinDays: next.availableWithinDays ? Number(next.availableWithinDays) : undefined,
      page: 1,
    });
  }

  function resetFilters(): void {
    setForm(EMPTY_FORM);
    setFilters({ page: 1 });
  }

  const totalPages = discovery.data
    ? Math.max(1, Math.ceil(discovery.data.total / discovery.data.pageSize))
    : 1;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Find a doctor</h1>
        <p className="text-muted-foreground">Search and filter bookable doctors.</p>
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
            Name
          </label>
          <Input
            id="doctor-search-q"
            placeholder="Search by name"
            value={form.q}
            onChange={(event) => setForm((prev) => ({ ...prev, q: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="doctor-search-specialization" className="text-sm font-medium">
            Specialization
          </label>
          <select
            id="doctor-search-specialization"
            className={cn(selectClassName)}
            value={form.specializationId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, specializationId: event.target.value }))
            }
          >
            <option value="">Any specialization</option>
            {specializations.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="doctor-search-language" className="text-sm font-medium">
            Language
          </label>
          <Input
            id="doctor-search-language"
            placeholder="e.g. Filipino"
            value={form.language}
            onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="doctor-search-available" className="text-sm font-medium">
            Availability
          </label>
          <select
            id="doctor-search-available"
            className={cn(selectClassName)}
            value={form.availableWithinDays}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, availableWithinDays: event.target.value }))
            }
          >
            {AVAILABLE_WITHIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {discovery.isPending ? <PageLoading label="Loading doctors…" /> : null}
      {discovery.isError ? (
        <PageError message={discovery.error.message} onRetry={() => void discovery.refetch()} />
      ) : null}
      {discovery.data && discovery.data.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="font-medium">No doctors match your filters</p>
          <p className="text-sm text-muted-foreground">Try widening your search.</p>
        </div>
      ) : null}

      {discovery.data && discovery.data.items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discovery.data.items.map((doctor) => (
              <DoctorSummaryCard key={doctor.id} doctor={doctor} />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {filters.page} of {totalPages} · {discovery.data.total} doctor
              {discovery.data.total === 1 ? '' : 's'}
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
                disabled={!discovery.data.hasMore}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
