'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { landingContent } from '@content/landing';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { homePathFor } from '@/features/auth/redirects';
import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

const { brand, nav } = landingContent;

/** Auth-aware CTA buttons: register links when signed out, a dashboard link when signed in. */
function AuthActions({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { status, user } = useAuth();

  if (status === 'authenticated' && user) {
    return (
      <Link
        href={homePathFor(user)}
        onClick={onNavigate}
        className={cn(buttonVariants({ size: 'sm' }), className)}
      >
        {nav.dashboard}
      </Link>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Link
        href="/login"
        onClick={onNavigate}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        {nav.signIn}
      </Link>
      <Link
        href="/register/patient"
        onClick={onNavigate}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        {nav.registerPatient}
      </Link>
      <Link href="/register/doctor" onClick={onNavigate} className={buttonVariants({ size: 'sm' })}>
        {nav.registerDoctor}
      </Link>
    </div>
  );
}

/** Landing page header: brand, anchor nav to the sections below, and auth CTAs. */
export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="rounded-md text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {brand}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:ml-8 lg:flex">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden lg:block">
          <AuthActions />
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="ml-auto lg:hidden" />}
            aria-label={nav.openMenu}
          >
            <Menu aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" className="gap-6 px-4 py-4">
            <SheetTitle>{brand}</SheetTitle>
            <nav aria-label="Main" className="flex flex-col gap-1">
              {nav.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <AuthActions onNavigate={() => setMenuOpen(false)} className="flex-col items-stretch" />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
