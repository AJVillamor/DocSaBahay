'use client';

import {
  calculateAge,
  patientProfileSchema,
  type PatientProfile,
  type PatientProfileInput,
} from '@doksabahay/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';

import {
  BodyMeasurementFields,
  ContactFields,
  MedicalHistoryFields,
  PersonalFields,
} from './profile-fields';
import { useUpdatePatientProfile } from './use-update-patient-profile';

function toFormValues(profile: PatientProfile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    birthDate: profile.birthDate,
    weightKg: String(profile.weightKg),
    heightCm: String(profile.heightCm),
    phone: profile.phone,
    city: profile.city,
    country: profile.country,
    emergencyContactName: profile.emergencyContactName ?? '',
    emergencyContactPhone: profile.emergencyContactPhone ?? '',
    allergies: profile.allergies ?? '',
    chronicConditions: profile.chronicConditions ?? '',
    currentMedications: profile.currentMedications ?? '',
    pastSurgeries: profile.pastSurgeries ?? '',
  };
}

/** Body mass index from kg and cm, rounded to one decimal place. Display-only. */
function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * View/edit form for the patient's own profile, all on one page (not
 * stepped). Age and BMI are computed client-side from the current form
 * values and shown as read-only, "informational" figures — never sent to
 * the API.
 */
export function PatientProfileForm({ profile }: { profile: PatientProfile }) {
  const updateProfile = useUpdatePatientProfile();
  const form = useForm({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: toFormValues(profile),
  });

  const birthDate = useWatch({ control: form.control, name: 'birthDate' });
  const weightKg = useWatch({ control: form.control, name: 'weightKg' });
  const heightCm = useWatch({ control: form.control, name: 'heightCm' });
  const age = birthDate ? calculateAge(birthDate) : NaN;
  const bmi = calculateBmi(Number(weightKg), Number(heightCm));

  const onSubmit = form.handleSubmit((values: PatientProfileInput) => {
    updateProfile.mutate(values);
  });

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-6">
      {updateProfile.error ? <FormAlert>{updateProfile.error.message}</FormAlert> : null}
      {updateProfile.isSuccess ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Profile updated.
        </p>
      ) : null}

      <section
        className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
        aria-label="Computed values"
      >
        <div>
          <p className="text-sm text-muted-foreground">Age (informational)</p>
          <p className="text-lg font-medium">
            {Number.isFinite(age) ? `${age} years` : 'Enter a date of birth'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">BMI (informational)</p>
          <p className="text-lg font-medium">{bmi !== null ? bmi : 'Enter weight and height'}</p>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <PersonalFields form={form} />
        <BodyMeasurementFields form={form} />
        <ContactFields form={form} />
        <MedicalHistoryFields form={form} />
      </div>

      <div>
        <Button type="submit" size="lg" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
