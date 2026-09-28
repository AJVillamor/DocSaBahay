'use client';

import { AccountStatus } from '@doksabahay/shared';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { StatusChangeDialog } from './status-change-dialog';
import { useAdminUser } from './use-admin-users';

function statusVariant(status: AccountStatus): 'default' | 'secondary' | 'destructive' {
  if (status === AccountStatus.ACTIVE) return 'secondary';
  if (status === AccountStatus.SUSPENDED) return 'default';
  return 'destructive';
}

/** `/admin/users/[id]`: one user's detail plus a status-change dialog. */
export function AdminUserDetailPage({ userId }: { userId: string }) {
  const user = useAdminUser(userId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (user.isPending) {
    return <PageLoading label="Loading user…" />;
  }
  if (user.isError) {
    return <PageError message={user.error.message} onRetry={() => void user.refetch()} />;
  }

  const data = user.data;
  const name =
    data.firstName || data.lastName ? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{name ?? data.email}</h1>
          <p className="text-muted-foreground">{data.email}</p>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          Change status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium">{data.role}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p>
              <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
            </p>
          </div>
          {data.statusReason ? (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Status reason</p>
              <p className="font-medium">{data.statusReason}</p>
            </div>
          ) : null}
          <div>
            <p className="text-muted-foreground">Joined</p>
            <p className="font-medium">{new Date(data.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last signed in</p>
            <p className="font-medium">
              {data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Upcoming appointments</p>
            <p className="font-medium">{data.upcomingAppointmentCount}</p>
          </div>
        </CardContent>
      </Card>

      <StatusChangeDialog user={dialogOpen ? data : null} onOpenChange={setDialogOpen} />
    </div>
  );
}
