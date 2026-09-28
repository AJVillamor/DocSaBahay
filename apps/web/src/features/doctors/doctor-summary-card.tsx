import type { DoctorListItem } from '@doksabahay/shared';
import { DateTime } from 'luxon';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/user-avatar';

/**
 * One doctor summary card: used by the doctor discovery list
 * (`/patient/doctors`) and the symptom-matching results
 * (`/patient/find-care`) so both features render doctors identically.
 */
export function DoctorSummaryCard({ doctor }: { doctor: DoctorListItem }) {
  const primary = doctor.specializations.find((s) => s.isPrimary);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <UserAvatar
            user={{
              id: doctor.id,
              email: '',
              profile: { firstName: doctor.firstName, lastName: doctor.lastName },
            }}
            className="size-10 text-sm"
          />
          <div className="min-w-0">
            <CardTitle className="truncate">
              Dr. {doctor.firstName} {doctor.lastName}
            </CardTitle>
            <CardDescription className="truncate">
              {doctor.title}
              {primary ? ` · ${primary.name}` : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {doctor.specializations.map((s) => (
            <Badge key={s.specializationId} variant={s.isPrimary ? 'default' : 'secondary'}>
              {s.name}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {doctor.yearsExperience} {doctor.yearsExperience === 1 ? 'year' : 'years'} of experience
          {doctor.languages.length > 0 ? ` · Speaks ${doctor.languages.join(', ')}` : ''}
        </p>
        <p className="text-sm font-medium">
          {doctor.nextAvailableSlot ? (
            <>
              Next available{' '}
              {DateTime.fromISO(doctor.nextAvailableSlot).toFormat("cccc, LLL d 'at' h:mm a")}
            </>
          ) : (
            <span className="text-muted-foreground">No availability in the next 14 days</span>
          )}
        </p>
        <div>
          <Link
            href={`/patient/doctors/${doctor.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            View profile
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
