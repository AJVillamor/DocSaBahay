'use client';

import type { CountBucket } from '@doksabahay/shared';
import { Role } from '@doksabahay/shared';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { PageError, PageLoading } from '@/components/page-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { useAdminDashboard } from './use-admin-dashboard';

function sumCounts(buckets: CountBucket[]): number {
  return buckets.reduce((total, bucket) => total + bucket.count, 0);
}

function countFor(buckets: CountBucket[], key: string): number {
  return buckets.find((bucket) => bucket.key === key)?.count ?? 0;
}

function sumByRolePrefix(buckets: CountBucket[], role: Role): number {
  return buckets
    .filter((bucket) => bucket.key.startsWith(`${role}:`))
    .reduce((total, bucket) => total + bucket.count, 0);
}

/** Small tooltip box matching the app's card surface, for both dashboard charts. */
function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: { value?: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-2.5 py-1.5 text-xs shadow-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0]?.value ?? 0} appointment(s)</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: number;
  description: string;
  href?: string;
}) {
  const content = (
    <Card className={cn('h-full', href && 'transition-shadow hover:shadow-md')}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/** `/admin`: operational summary — stat cards, two charts and recent audit activity. Refreshes every 60s. */
export function AdminDashboardPage() {
  const dashboard = useAdminDashboard();

  if (dashboard.isPending) {
    return <PageLoading label="Loading dashboard…" />;
  }
  if (dashboard.isError) {
    return <PageError message={dashboard.error.message} onRetry={() => void dashboard.refetch()} />;
  }

  const data = dashboard.data;
  const totalUsers = sumCounts(data.usersByRoleStatus);
  const pendingDoctors = countFor(data.doctorsByVerificationStatus, 'PENDING');
  const sessionChartData = data.sessionsTodayByState.map((bucket) => ({
    state: bucket.key,
    count: bucket.count,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="text-muted-foreground">Operational overview, refreshed every minute.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void dashboard.refetch()}>
          Refresh now
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total users" value={totalUsers} description="Patients, doctors and admins" />
        <StatCard
          title="Doctors — pending review"
          value={pendingDoctors}
          description="Waiting for approval"
          href="/admin/doctors?verificationStatus=PENDING"
        />
        <StatCard
          title="Open issues"
          value={data.openIssuesCount}
          description="SCHEDULED appointments flagged invalid"
          href="/admin/appointments/issues"
        />
        <StatCard
          title="Appointments today"
          value={sumCounts(data.appointments.today)}
          description="Across every status"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <span>Patients: {sumByRolePrefix(data.usersByRoleStatus, Role.PATIENT)}</span>
            <span>Doctors: {sumByRolePrefix(data.usersByRoleStatus, Role.DOCTOR)}</span>
            <span>Admins: {sumByRolePrefix(data.usersByRoleStatus, Role.ADMIN)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Appointments — next 7 days</CardDescription>
            <CardTitle className="text-2xl font-semibold">{sumCounts(data.appointments.next7Days)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Appointments — last 30 days</CardDescription>
            <CardTitle className="text-2xl font-semibold">{sumCounts(data.appointments.last30Days)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointments per day</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.appointmentsPerDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => value.slice(5)}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions today</CardTitle>
            <CardDescription>By live state</CardDescription>
          </CardHeader>
          <CardContent className="h-64 px-2">
            {sessionChartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sessions scheduled today.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="state"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
                  <Bar dataKey="count" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit activity</CardTitle>
          <CardDescription>
            Newest 10 entries.{' '}
            <Link href="/admin/audit" className="underline hover:no-underline">
              View full log
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentAuditEntries.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="divide-y">
              {data.recentAuditEntries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.entityType} · {entry.entityId.slice(0, 8)}…
                    </span>
                  </div>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/appointments" className={buttonVariants({ variant: 'outline' })}>
          Browse all appointments
        </Link>
      </div>
    </div>
  );
}
