'use client';

import { Button } from '@/components/ui/button';

/** Route-level error boundary. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4" role="alert">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">{error.digest ? `Reference: ${error.digest}` : null}</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
