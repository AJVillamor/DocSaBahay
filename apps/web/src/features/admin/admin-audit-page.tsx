'use client';

import type { AuditLogEntry } from '@doksabahay/shared';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAuditLogs, type AuditLogFilters } from './use-audit-logs';

interface FormState {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}

const EMPTY_FORM: FormState = { actorId: '', action: '', entityType: '', entityId: '', from: '', to: '' };

function toIsoOrUndefined(dateInputValue: string, endOfDay: boolean): string | undefined {
  if (!dateInputValue) return undefined;
  return endOfDay ? `${dateInputValue}T23:59:59.999Z` : `${dateInputValue}T00:00:00.000Z`;
}

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b hover:bg-muted/30">
        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
          {new Date(entry.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-2 font-medium">{entry.action}</td>
        <td className="px-4 py-2 text-muted-foreground">
          {entry.entityType} · {entry.entityId.slice(0, 8)}…
        </td>
        <td className="px-4 py-2 text-muted-foreground">{entry.actorId.slice(0, 8)}…</td>
        <td className="px-4 py-2 text-muted-foreground">{entry.reason ?? '—'}</td>
        <td className="px-4 py-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide' : 'Details'}
          </Button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b bg-muted/20">
          <td className="px-4 py-3" colSpan={6}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">Before</p>
                <pre className="overflow-x-auto rounded-lg border bg-background p-2 text-xs">
                  {JSON.stringify(entry.before, null, 2) ?? 'null'}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">After</p>
                <pre className="overflow-x-auto rounded-lg border bg-background p-2 text-xs">
                  {JSON.stringify(entry.after, null, 2) ?? 'null'}
                </pre>
              </div>
            </div>
            {entry.ipAddress ? (
              <p className="mt-2 text-xs text-muted-foreground">IP: {entry.ipAddress}</p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

/** `/admin/audit`: filterable, read-only view of every administrative change. */
export function AdminAuditPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1 });
  const logs = useAuditLogs(filters);

  function applyFilters(): void {
    setFilters({
      actorId: form.actorId.trim() || undefined,
      action: form.action.trim() || undefined,
      entityType: form.entityType.trim() || undefined,
      entityId: form.entityId.trim() || undefined,
      from: toIsoOrUndefined(form.from, false),
      to: toIsoOrUndefined(form.to, true),
      page: 1,
    });
  }

  function resetFilters(): void {
    setForm(EMPTY_FORM);
    setFilters({ page: 1 });
  }

  const totalPages = logs.data ? Math.max(1, Math.ceil(logs.data.totalCount / logs.data.pageSize)) : 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground">
          Every administrative change, append-only. Expand a row for the before/after snapshot.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-action" className="text-sm font-medium">
            Action
          </label>
          <Input
            id="audit-action"
            placeholder="e.g. user.status_changed"
            value={form.action}
            onChange={(event) => setForm((prev) => ({ ...prev, action: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-entity-type" className="text-sm font-medium">
            Entity type
          </label>
          <Input
            id="audit-entity-type"
            placeholder="e.g. USER"
            value={form.entityType}
            onChange={(event) => setForm((prev) => ({ ...prev, entityType: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-entity-id" className="text-sm font-medium">
            Entity id
          </label>
          <Input
            id="audit-entity-id"
            value={form.entityId}
            onChange={(event) => setForm((prev) => ({ ...prev, entityId: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-actor-id" className="text-sm font-medium">
            Actor id
          </label>
          <Input
            id="audit-actor-id"
            value={form.actorId}
            onChange={(event) => setForm((prev) => ({ ...prev, actorId: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-from" className="text-sm font-medium">
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            value={form.from}
            onChange={(event) => setForm((prev) => ({ ...prev, from: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-to" className="text-sm font-medium">
            To
          </label>
          <Input
            id="audit-to"
            type="date"
            value={form.to}
            onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Filter</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {logs.isPending ? <PageLoading label="Loading audit log…" /> : null}
      {logs.isError ? (
        <PageError message={logs.error.message} onRetry={() => void logs.refetch()} />
      ) : null}
      {logs.data && logs.data.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="font-medium">No entries match your filters</p>
          <p className="text-sm text-muted-foreground">Try widening your search.</p>
        </div>
      ) : null}

      {logs.data && logs.data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Entity</th>
                  <th className="px-4 py-2 font-medium">Actor</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {logs.data.items.map((entry) => (
                  <AuditLogRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {filters.page} of {totalPages} · {logs.data.totalCount} entr
              {logs.data.totalCount === 1 ? 'y' : 'ies'}
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
    </div>
  );
}
