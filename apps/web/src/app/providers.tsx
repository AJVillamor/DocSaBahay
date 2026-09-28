'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/** Client-side providers shared by every page. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
