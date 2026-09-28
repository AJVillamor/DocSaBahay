import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

/** Accessibility props to spread onto the field's control. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface FormFieldProps {
  id: string;
  label: string;
  /** Validation message; also marks the control `aria-invalid`. */
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label, control, hint and error, wired together with ids for screen readers. */
export function FormField({ id, label, error, hint, optional, children }: FormFieldProps) {
  // A hint that merely repeats the error (e.g. the password policy) is not shown twice.
  const visibleHint = hint && hint !== error ? hint : undefined;
  const hintId = visibleHint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {visibleHint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {visibleHint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
