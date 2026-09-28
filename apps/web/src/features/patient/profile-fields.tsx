'use client';

import {
  MEDICAL_NOTES_MAX_LENGTH,
  type PatientProfileFormValues,
  type PatientProfileInput,
} from '@doksabahay/shared';
import type { UseFormReturn } from 'react-hook-form';

import { FormField } from '@/components/form/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Field groups shared by the onboarding wizard (one group per step) and the
 * profile edit page (all groups on one page). Each reads/writes the same
 * `patientProfileSchema`-backed form instance. The three generics mirror
 * `useForm`'s: raw string field values in, coerced `PatientProfileInput` out
 * of `handleSubmit` (the schema transforms weight/height to numbers).
 */
export type ProfileForm = UseFormReturn<PatientProfileFormValues, unknown, PatientProfileInput>;

export function PersonalFields({ form }: { form: ProfileForm }) {
  const { errors } = form.formState;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="profile-first-name" label="First name" error={errors.firstName?.message}>
          {(control) => (
            <Input {...control} autoComplete="given-name" {...form.register('firstName')} />
          )}
        </FormField>
        <FormField id="profile-last-name" label="Last name" error={errors.lastName?.message}>
          {(control) => (
            <Input {...control} autoComplete="family-name" {...form.register('lastName')} />
          )}
        </FormField>
      </div>
      <FormField id="profile-birth-date" label="Date of birth" error={errors.birthDate?.message}>
        {(control) => (
          <Input {...control} type="date" autoComplete="bday" {...form.register('birthDate')} />
        )}
      </FormField>
    </div>
  );
}

export function BodyMeasurementFields({ form }: { form: ProfileForm }) {
  const { errors } = form.formState;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="profile-weight" label="Weight (kg)" error={errors.weightKg?.message}>
        {(control) => (
          <Input
            {...control}
            type="number"
            step="0.1"
            inputMode="decimal"
            {...form.register('weightKg')}
          />
        )}
      </FormField>
      <FormField id="profile-height" label="Height (cm)" error={errors.heightCm?.message}>
        {(control) => (
          <Input
            {...control}
            type="number"
            step="0.1"
            inputMode="decimal"
            {...form.register('heightCm')}
          />
        )}
      </FormField>
    </div>
  );
}

export function ContactFields({ form }: { form: ProfileForm }) {
  const { errors } = form.formState;
  return (
    <div className="flex flex-col gap-4">
      <FormField
        id="profile-phone"
        label="Phone number"
        hint="e.g. +63 917 123 4567"
        error={errors.phone?.message}
      >
        {(control) => (
          <Input {...control} type="tel" autoComplete="tel" {...form.register('phone')} />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="profile-city" label="City" error={errors.city?.message}>
          {(control) => (
            <Input {...control} autoComplete="address-level2" {...form.register('city')} />
          )}
        </FormField>
        <FormField id="profile-country" label="Country" error={errors.country?.message}>
          {(control) => (
            <Input {...control} autoComplete="country-name" {...form.register('country')} />
          )}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="profile-emergency-name"
          label="Emergency contact name"
          optional
          error={errors.emergencyContactName?.message}
        >
          {(control) => <Input {...control} {...form.register('emergencyContactName')} />}
        </FormField>
        <FormField
          id="profile-emergency-phone"
          label="Emergency contact phone"
          optional
          error={errors.emergencyContactPhone?.message}
        >
          {(control) => (
            <Input {...control} type="tel" {...form.register('emergencyContactPhone')} />
          )}
        </FormField>
      </div>
    </div>
  );
}

export function MedicalHistoryFields({ form }: { form: ProfileForm }) {
  const { errors } = form.formState;
  return (
    <div className="flex flex-col gap-4">
      <FormField
        id="profile-allergies"
        label="Allergies"
        optional
        error={errors.allergies?.message}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            maxLength={MEDICAL_NOTES_MAX_LENGTH}
            {...form.register('allergies')}
          />
        )}
      </FormField>
      <FormField
        id="profile-chronic-conditions"
        label="Chronic conditions"
        optional
        error={errors.chronicConditions?.message}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            maxLength={MEDICAL_NOTES_MAX_LENGTH}
            {...form.register('chronicConditions')}
          />
        )}
      </FormField>
      <FormField
        id="profile-current-medications"
        label="Current medications"
        optional
        error={errors.currentMedications?.message}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            maxLength={MEDICAL_NOTES_MAX_LENGTH}
            {...form.register('currentMedications')}
          />
        )}
      </FormField>
      <FormField
        id="profile-past-surgeries"
        label="Past surgeries"
        optional
        error={errors.pastSurgeries?.message}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            maxLength={MEDICAL_NOTES_MAX_LENGTH}
            {...form.register('pastSurgeries')}
          />
        )}
      </FormField>
    </div>
  );
}
