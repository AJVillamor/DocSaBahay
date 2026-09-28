'use client';

import {
  patientProfileSchema,
  type PatientProfileFormValues,
  type PatientProfileInput,
} from '@doksabahay/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, type Path } from 'react-hook-form';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  BodyMeasurementFields,
  ContactFields,
  MedicalHistoryFields,
  PersonalFields,
} from './profile-fields';
import { useUpdatePatientProfile } from './use-update-patient-profile';

const STEPS = [
  { title: 'Personal', fields: ['firstName', 'lastName', 'birthDate'] },
  { title: 'Body measurements', fields: ['weightKg', 'heightCm'] },
  {
    title: 'Contact',
    fields: ['phone', 'city', 'country', 'emergencyContactName', 'emergencyContactPhone'],
  },
  {
    title: 'Medical history',
    fields: ['allergies', 'chronicConditions', 'currentMedications', 'pastSurgeries'],
  },
] as const satisfies { title: string; fields: Path<PatientProfileFormValues>[] }[];

const DEFAULT_VALUES: PatientProfileFormValues = {
  firstName: '',
  lastName: '',
  birthDate: '',
  weightKg: '',
  heightCm: '',
  phone: '',
  city: '',
  country: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  allergies: '',
  chronicConditions: '',
  currentMedications: '',
  pastSurgeries: '',
};

/** Numbered-pill progress indicator for the wizard. */
function StepIndicator({ step }: { step: number }) {
  return (
    <div>
      <ol className="flex items-center" aria-hidden="true">
        {STEPS.map((s, index) => (
          <li key={s.title} className="flex flex-1 items-center last:flex-none">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                index <= step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {index + 1}
            </span>
            {index < STEPS.length - 1 ? (
              <span className={cn('mx-2 h-px flex-1', index < step ? 'bg-primary' : 'bg-border')} />
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-muted-foreground">
        Step {step + 1} of {STEPS.length}: {(STEPS[step] ?? STEPS[0]).title}
      </p>
    </div>
  );
}

/**
 * Four-step onboarding wizard: personal details, body measurements, contact
 * info, then optional medical history. One React Hook Form instance holds
 * every field across steps; a single `PUT /patients/me/profile` call is made
 * on the final "Finish".
 */
export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const updateProfile = useUpdatePatientProfile();
  const form = useForm({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const current = STEPS[step] ?? STEPS[0];
  const isLastStep = step === STEPS.length - 1;

  const goNext = async (): Promise<void> => {
    const valid = await form.trigger(current.fields);
    if (valid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };
  const goBack = (): void => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = form.handleSubmit((values: PatientProfileInput) => {
    updateProfile.mutate(values, { onSuccess: () => router.replace('/patient') });
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
        <p className="text-muted-foreground">
          Before your first consultation, your doctor needs a few details: date of birth, height,
          weight, contact information and your medical history.
        </p>
      </div>

      <StepIndicator step={step} />

      <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        {updateProfile.error ? <FormAlert>{updateProfile.error.message}</FormAlert> : null}

        {step === 0 ? <PersonalFields form={form} /> : null}
        {step === 1 ? <BodyMeasurementFields form={form} /> : null}
        {step === 2 ? <ContactFields form={form} /> : null}
        {step === 3 ? <MedicalHistoryFields form={form} /> : null}

        <div className="flex justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            Back
          </Button>
          {isLastStep ? (
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Finish'}
            </Button>
          ) : (
            <Button type="button" onClick={() => void goNext()}>
              Next
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
