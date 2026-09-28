'use client';

import Link from 'next/link';

import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';

import { useDoctorPublicProfile } from './use-doctor-discovery';

/**
 * `/patient/doctors/:id`: a doctor's public profile. The "Book" button is
 * disabled ("Coming soon") since the booking flow is a separate, not-yet-
 * built feature — see the task's open questions for why this isn't a link.
 */
export function DoctorPublicProfilePage({ doctorId }: { doctorId: string }) {
  const profile = useDoctorPublicProfile(doctorId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-8">
      <Link href="/patient/doctors" className="text-sm text-muted-foreground hover:underline">
        ← Back to doctors
      </Link>

      {profile.isPending ? <PageLoading label="Loading profile…" /> : null}
      {profile.isError ? (
        <PageError message={profile.error.message} onRetry={() => void profile.refetch()} />
      ) : null}

      {profile.data ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              user={{
                id: profile.data.id,
                email: '',
                profile: { firstName: profile.data.firstName, lastName: profile.data.lastName },
              }}
              className="size-16 text-lg"
            />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Dr. {profile.data.firstName} {profile.data.lastName}
              </h1>
              <p className="text-muted-foreground">{profile.data.title}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {profile.data.specializations.map((s) => (
              <Badge key={s.specializationId} variant={s.isPrimary ? 'default' : 'secondary'}>
                {s.name}
              </Badge>
            ))}
          </div>

          {profile.data.bio ? <p className="text-sm leading-relaxed">{profile.data.bio}</p> : null}

          <dl className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Years of experience</dt>
              <dd className="font-medium">{profile.data.yearsExperience}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Consultation length</dt>
              <dd className="font-medium">{profile.data.consultationMinutes} minutes</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Languages</dt>
              <dd className="font-medium">
                {profile.data.languages.length > 0 ? profile.data.languages.join(', ') : '—'}
              </dd>
            </div>
          </dl>

          <div>
            <Button type="button" size="lg" disabled title="Booking is not available yet">
              Book (coming soon)
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
