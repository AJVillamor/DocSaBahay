'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ApiError } from '@/lib/api';

/** Client errors (4xx) will not succeed on retry; network and server errors might. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const isClientError =
    error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
  return !isClientError && failureCount < 2;
}

/** Client-side providers shared by every page. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, retry: shouldRetry },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
