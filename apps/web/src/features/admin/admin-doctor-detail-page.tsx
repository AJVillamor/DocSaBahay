'use client';

import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { AdminDoctorEditForm } from './admin-doctor-edit-form';
import { DoctorReviewPanel } from './doctor-review-panel';
import { useAdminDoctor } from './use-admin-doctors';

/** `/admin/doctors/[id]`: profile details, review decision, and a direct profile edit form. */
export function AdminDoctorDetailPage({ doctorId }: { doctorId: string }) {
  const doctor = useAdminDoctor(doctorId);

  if (doctor.isPending) {
    return <PageLoading label="Loading doctor…" />;
  }
  if (doctor.isError) {
    return <PageError message={doctor.error.message} onRetry={() => void doctor.refetch()} />;
  }

  const data = doctor.data;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dr. {data.firstName} {data.lastName}
        </h1>
        <p className="text-muted-foreground">{data.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">License number</p>
            <p className="font-medium">{data.licenseNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Account status</p>
            <p className="font-medium">{data.accountStatus}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Specializations</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {data.specializations.map((s) => (
                <Badge key={s.specializationId} variant={s.isPrimary ? 'default' : 'secondary'}>
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <DoctorReviewPanel doctor={data} />
      <AdminDoctorEditForm doctor={data} />
    </div>
  );
}
