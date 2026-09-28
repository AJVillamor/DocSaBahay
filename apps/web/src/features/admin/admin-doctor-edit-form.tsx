'use client';

import {
  CONSULTATION_MINUTES_OPTIONS,
  TIMEZONE_OPTIONS,
  type AdminDoctorDetail,
  type ConsultationMinutes,
} from '@doksabahay/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormAlert } from '@/components/form/form-alert';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSpecializations } from '@/features/specializations/use-specializations';
import { cn } from '@/lib/utils';

import { useUpdateAdminDoctorProfile } from './use-admin-doctors';

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30';

const consultationOptions = CONSULTATION_MINUTES_OPTIONS as readonly number[];

// Number fields are kept as strings in the form and converted on submit, so
// the RHF/zod resolver types line up without `z.coerce` (same trick as the
// doctor-facing `DoctorProfileForm`).
const formSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.').max(100, 'Use at most 100 characters.'),
  bio: z.string().trim().max(2000, 'Use at most 2000 characters.'),
  yearsExperience: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value) && Number(value) <= 70, 'Enter a whole number from 0 to 70.'),
  licenseNumber: z
    .string()
    .trim()
    .min(1, 'Enter a license number.')
    .max(50, 'Use at most 50 characters.'),
  languagesText: z.string(),
  consultationMinutes: z
    .string()
    .refine((value) => consultationOptions.includes(Number(value)), 'Choose a consultation length.'),
  timezone: z.string().trim().min(1, 'Choose a timezone.'),
  primarySpecializationId: z.string().min(1, 'Choose a primary specialization.'),
  secondarySpecializationIds: z.array(z.string()).max(2, 'Choose at most 2 secondary specializations.'),
});

type FormValues = z.infer<typeof formSchema>;

function toFormValues(doctor: AdminDoctorDetail): FormValues {
  const primary = doctor.specializations.find((s) => s.isPrimary);
  const secondary = doctor.specializations.filter((s) => !s.isPrimary);
  return {
    title: doctor.title,
    bio: doctor.bio,
    yearsExperience: String(doctor.yearsExperience),
    licenseNumber: doctor.licenseNumber,
    languagesText: doctor.languages.join(', '),
    consultationMinutes: String(doctor.consultationMinutes),
    timezone: doctor.timezone,
    primarySpecializationId: primary?.specializationId ?? '',
    secondarySpecializationIds: secondary.map((s) => s.specializationId),
  };
}

/**
 * Admin's direct edit of a doctor's profile fields and specializations.
 * Unlike the doctor's own edit form, saving here never resets
 * `verificationStatus` — an admin edit is authoritative.
 */
export function AdminDoctorEditForm({ doctor }: { doctor: AdminDoctorDetail }) {
  const specializations = useSpecializations();
  const updateProfile = useUpdateAdminDoctorProfile();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(doctor),
  });
  const { errors } = form.formState;
  const secondaryIds = form.watch('secondarySpecializationIds');
  const primaryId = form.watch('primarySpecializationId');

  const onSubmit = form.handleSubmit((values) => {
    const languages = values.languagesText
      .split(',')
      .map((language) => language.trim())
      .filter(Boolean);
    updateProfile.mutate({
      id: doctor.id,
      input: {
        title: values.title,
        bio: values.bio,
        yearsExperience: Number(values.yearsExperience),
        licenseNumber: values.licenseNumber,
        languages,
        consultationMinutes: Number(values.consultationMinutes) as ConsultationMinutes,
        timezone: values.timezone,
        specializations: [
          { specializationId: values.primarySpecializationId, isPrimary: true },
          ...values.secondarySpecializationIds.map((id) => ({
            specializationId: id,
            isPrimary: false,
          })),
        ],
      },
    });
  });

  function toggleSecondary(id: string, checked: boolean): void {
    const current = form.getValues('secondarySpecializationIds');
    if (checked) {
      if (current.length >= 2) return;
      form.setValue('secondarySpecializationIds', [...current, id], { shouldValidate: true });
    } else {
      form.setValue(
        'secondarySpecializationIds',
        current.filter((value) => value !== id),
        { shouldValidate: true },
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <h2 className="font-medium">Edit profile</h2>

      {updateProfile.isError ? <FormAlert>{updateProfile.error.message}</FormAlert> : null}
      {updateProfile.isSuccess ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50"
        >
          Profile saved.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="admin-doctor-title" label="Title" error={errors.title?.message}>
          {(control) => <Input {...control} {...form.register('title')} />}
        </FormField>
        <FormField
          id="admin-doctor-years"
          label="Years of experience"
          error={errors.yearsExperience?.message}
        >
          {(control) => (
            <Input {...control} type="number" min={0} max={70} {...form.register('yearsExperience')} />
          )}
        </FormField>
      </div>

      <FormField id="admin-doctor-bio" label="Bio" optional error={errors.bio?.message}>
        {(control) => <Textarea {...control} rows={4} maxLength={2000} {...form.register('bio')} />}
      </FormField>

      <FormField id="admin-doctor-license" label="License number" error={errors.licenseNumber?.message}>
        {(control) => <Input {...control} {...form.register('licenseNumber')} />}
      </FormField>

      <FormField
        id="admin-doctor-languages"
        label="Languages"
        hint="Comma-separated, e.g. English, Filipino."
        error={errors.languagesText?.message}
      >
        {(control) => <Input {...control} {...form.register('languagesText')} />}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="admin-doctor-consultation"
          label="Consultation length"
          error={errors.consultationMinutes?.message}
        >
          {(control) => (
            <select {...control} className={cn(selectClassName)} {...form.register('consultationMinutes')}>
              {CONSULTATION_MINUTES_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField id="admin-doctor-timezone" label="Timezone" error={errors.timezone?.message}>
          {(control) => (
            <select {...control} className={cn(selectClassName)} {...form.register('timezone')}>
              {TIMEZONE_OPTIONS.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>

      <FormField
        id="admin-doctor-primary-specialization"
        label="Primary specialization"
        error={
          errors.primarySpecializationId?.message ??
          (specializations.isError ? 'Could not load specializations.' : undefined)
        }
      >
        {(control) => (
          <select
            {...control}
            className={cn(selectClassName)}
            disabled={!specializations.data}
            {...form.register('primarySpecializationId')}
          >
            <option value="">
              {specializations.isPending ? 'Loading specializations…' : 'Choose a specialization'}
            </option>
            {specializations.data?.map((specialization) => (
              <option
                key={specialization.id}
                value={specialization.id}
                disabled={secondaryIds.includes(specialization.id)}
              >
                {specialization.name}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Secondary specializations (up to 2)</legend>
        {errors.secondarySpecializationIds ? (
          <p className="text-sm text-destructive">{errors.secondarySpecializationIds.message}</p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {specializations.data
            ?.filter((specialization) => specialization.id !== primaryId)
            .map((specialization) => {
              const checked = secondaryIds.includes(specialization.id);
              const disabled = !checked && secondaryIds.length >= 2;
              return (
                <label key={specialization.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => toggleSecondary(specialization.id, event.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  {specialization.name}
                </label>
              );
            })}
        </div>
      </fieldset>

      <div>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  );
}
