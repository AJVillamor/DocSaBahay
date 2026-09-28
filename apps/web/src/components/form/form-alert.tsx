import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';

/** Form-level error (e.g. from the API), announced to screen readers when it appears. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
