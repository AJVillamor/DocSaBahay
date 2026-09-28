import Link from 'next/link';
import type { ReactNode } from 'react';

/** Chrome for signed-out pages: brand and sign-in / register links. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b">
        <nav
          aria-label="Main"
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"
        >
          <Link
            href="/"
            className="rounded-md font-semibold tracking-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            DokSaBahay
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="rounded-md underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Sign in
            </Link>
            <Link
              href="/register/patient"
              className="rounded-md underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
