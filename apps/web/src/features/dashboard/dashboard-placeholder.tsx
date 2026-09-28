'use client';

import { Role } from '@doksabahay/shared';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/use-auth';
import { displayNameFor } from '@/lib/avatar';

export interface DashboardCard {
  title: string;
  description: string;
}

/** Placeholder dashboard: a greeting plus "coming soon" cards for the role's future features. */
export function DashboardPlaceholder({ cards }: { cards: DashboardCard[] }) {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  const needsProfile = user.role === Role.PATIENT && user.profileCompleted === false;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {displayNameFor(user)}</h1>
        <p className="mt-1 text-muted-foreground">Here is what will live on your dashboard.</p>
      </div>

      {needsProfile ? (
        <Card>
          <CardHeader>
            <CardTitle>Complete your profile</CardTitle>
            <CardDescription>
              Doctors need your basic health details before your first consultation.
            </CardDescription>
            <div className="pt-2">
              <Link href="/patient/onboarding" className={buttonVariants()}>
                Complete profile
              </Link>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <li key={card.title}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
                <p className="pt-1 text-xs font-medium text-muted-foreground">Coming soon</p>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
