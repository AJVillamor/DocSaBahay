'use client';

import type { Role } from '@doksabahay/shared';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth, useLogout } from '@/features/auth/use-auth';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { NotificationsRealtimeProvider } from '@/features/notifications/realtime-provider';
import { displayNameFor } from '@/lib/avatar';

import { NAV_ITEMS } from './nav-items';
import { SidebarNav } from './sidebar-nav';

const ROLE_LABEL: Record<Role, string> = {
  PATIENT: 'Patient',
  DOCTOR: 'Doctor',
  ADMIN: 'Admin',
};

function Brand({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      DokSaBahay
    </Link>
  );
}

/**
 * Signed-in layout: persistent sidebar at 1024px+, a drawer below that,
 * and a header with notifications, the user's avatar and sign-out.
 * Render inside `RoleGuard`, which guarantees a signed-in user.
 */
export function AppShell({
  role,
  banner,
  children,
}: {
  role: Role;
  /** Shown under the header on every page, e.g. the doctor review notice. */
  banner?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const logout = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  if (!user) {
    return null;
  }

  const items = NAV_ITEMS[role];
  const home = items[0]?.href ?? '/';
  const name = displayNameFor(user);

  return (
    <NotificationsRealtimeProvider>
      <div className="flex flex-1">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-3 focus:ring-ring/50"
        >
          Skip to main content
        </a>

        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r px-4 py-4 lg:flex">
          <Brand href={home} />
          <nav aria-label={`${ROLE_LABEL[role]} navigation`}>
            <SidebarNav items={items} />
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon" className="lg:hidden" />}
                aria-label="Open navigation"
              >
                <Menu aria-hidden="true" />
              </SheetTrigger>
              <SheetContent side="left" className="gap-6 px-4 py-4">
                <SheetTitle>DokSaBahay</SheetTitle>
                <nav aria-label={`${ROLE_LABEL[role]} navigation`}>
                  <SidebarNav items={items} onNavigate={() => setDrawerOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>
            <span className="lg:hidden">
              <Brand href={home} />
            </span>

            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <div className="flex items-center gap-2">
                <UserAvatar user={user} />
                <span className="sr-only max-w-48 truncate text-sm sm:not-sr-only">
                  {name}
                  <span className="sr-only"> ({ROLE_LABEL[user.role]})</span>
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                {logout.isPending ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </header>

          {banner}

          <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
        </div>
      </div>
    </NotificationsRealtimeProvider>
  );
}
