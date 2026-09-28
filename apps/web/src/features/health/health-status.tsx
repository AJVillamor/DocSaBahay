'use client';

import { DbStatus } from '@doksabahay/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useHealth } from './use-health';

/** Shows API and database status from `GET /health`, with loading and error states. */
export function HealthStatus() {
  const { data, isPending, isError, error, refetch, isFetching } = useHealth();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Live check of the DokSaBahay API and database.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending ? (
          <p className="text-muted-foreground" role="status">
            Checking API…
          </p>
        ) : isError ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="font-medium">API: unreachable</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium" data-testid="health-summary">
              API: {data.status}, DB: {data.db}
            </p>
            <Badge variant={data.db === DbStatus.UP ? 'default' : 'destructive'}>
              {data.db === DbStatus.UP ? 'Healthy' : 'Database down'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
