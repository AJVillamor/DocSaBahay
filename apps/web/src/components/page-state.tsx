import { Button } from '@/components/ui/button';

/** Full-area loading indicator. */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12" role="status">
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

/** Full-area error with an optional retry. */
export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center"
      role="alert"
    >
      <p className="font-medium">Something went wrong</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
