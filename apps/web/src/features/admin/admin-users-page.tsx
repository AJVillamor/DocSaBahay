'use client';

import { AccountStatus, Role } from '@doksabahay/shared';
import { useState } from 'react';
import Link from 'next/link';

import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { useAdminUsers, type AdminUsersFilters } from './use-admin-users';

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors hover:border-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

interface FormState {
  q: string;
  role: string;
  status: string;
}

const EMPTY_FORM: FormState = { q: '', role: '', status: '' };

function statusVariant(status: AccountStatus): 'default' | 'secondary' | 'destructive' {
  if (status === AccountStatus.ACTIVE) return 'secondary';
  if (status === AccountStatus.SUSPENDED) return 'default';
  return 'destructive';
}

/** `/admin/users`: search, filter and browse every account. */
export function AdminUsersPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filters, setFilters] = useState<AdminUsersFilters>({ page: 1 });
  const users = useAdminUsers(filters);

  function applyFilters(overrides: Partial<FormState> = {}): void {
    const next = { ...form, ...overrides };
    setForm(next);
    setFilters({
      q: next.q.trim() || undefined,
      role: next.role || undefined,
      status: next.status || undefined,
      page: 1,
    });
  }

  function resetFilters(): void {
    setForm(EMPTY_FORM);
    setFilters({ page: 1 });
  }

  const totalPages = users.data
    ? Math.max(1, Math.ceil(users.data.totalCount / users.data.pageSize))
    : 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Suspend, deactivate or reactivate any account.</p>
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
          <label htmlFor="user-search-q" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="user-search-q"
            placeholder="Name or email"
            value={form.q}
            onChange={(event) => setForm((prev) => ({ ...prev, q: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-search-role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="user-search-role"
            className={cn(selectClassName)}
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="">Any role</option>
            <option value={Role.PATIENT}>Patient</option>
            <option value={Role.DOCTOR}>Doctor</option>
            <option value={Role.ADMIN}>Admin</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-search-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="user-search-status"
            className={cn(selectClassName)}
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="">Any status</option>
            <option value={AccountStatus.ACTIVE}>Active</option>
            <option value={AccountStatus.SUSPENDED}>Suspended</option>
            <option value={AccountStatus.DEACTIVATED}>Deactivated</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {users.isPending ? <PageLoading label="Loading users…" /> : null}
      {users.isError ? (
        <PageError message={users.error.message} onRetry={() => void users.refetch()} />
      ) : null}
      {users.data && users.data.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="font-medium">No users match your filters</p>
          <p className="text-sm text-muted-foreground">Try widening your search.</p>
        </div>
      ) : null}

      {users.data && users.data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.data.items.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium hover:underline"
                      >
                        {user.firstName || user.lastName
                          ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                          : '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-2">{user.role}</td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {filters.page} of {totalPages} · {users.data.totalCount} user
              {users.data.totalCount === 1 ? '' : 's'}
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
