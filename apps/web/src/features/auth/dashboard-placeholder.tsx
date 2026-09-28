'use client';

import { Button } from '@/components/ui/button';

import { useAuth, useLogout } from './use-auth';

/** Temporary dashboard body until the role layouts land: who is signed in, plus sign-out. */
export function DashboardPlaceholder({ title }: { title: string }) {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">
        Signed in as {user?.email} ({user?.role.toLowerCase()}).
      </p>
      <div>
        <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </main>
  );
}
