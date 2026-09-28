'use client';

import './globals.css';

/** Last-resort boundary for errors thrown in the root layout. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <button className="rounded-md border px-4 py-2" onClick={reset}>
          Try again
        </button>
        <p className="text-sm">Fictional prototype — not for real medical use.</p>
      </body>
    </html>
  );
}
