'use client';

import { ErrorCode, registerDoctorSchema } from '@doksabahay/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/form/form-alert';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSpecializations } from '@/features/specializations/use-specializations';
import { cn } from '@/lib/utils';

import { confirmPasswordShape, PasswordFields, passwordsMatch } from './password-fields';
import { useCompleteSignIn } from './use-auth';
import { authErrorMessage, useRedirectIfSignedIn, useRegisterDoctor } from './use-auth-forms';

const schema = registerDoctorSchema.extend(confirmPasswordShape).refine(...passwordsMatch);

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30';

export function RegisterDoctorForm() {
  useRedirectIfSignedIn();
  const completeSignIn = useCompleteSignIn();
  const registerDoctor = useRegisterDoctor();
  const specializations = useSpecializations();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      primarySpecializationId: '',
      licenseNumber: '',
      bio: '',
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(({ confirmPassword: _confirm, bio, ...input }) =>
    registerDoctor.mutate(
      { ...input, ...(bio ? { bio } : {}) },
      {
        onSuccess: (user) => completeSignIn(user),
        onError: (error) => {
          if (error.code === ErrorCode.EMAIL_TAKEN) {
            form.setError('email', { message: error.message }, { shouldFocus: true });
          }
        },
      },
    ),
  );

  const formError =
    registerDoctor.error && registerDoctor.error.code !== ErrorCode.EMAIL_TAKEN
      ? authErrorMessage(registerDoctor.error)
      : null;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {formError ? <FormAlert>{formError}</FormAlert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="doctor-first-name" label="First name" error={errors.firstName?.message}>
          {(control) => (
            <Input {...control} autoComplete="given-name" {...form.register('firstName')} />
          )}
        </FormField>
        <FormField id="doctor-last-name" label="Last name" error={errors.lastName?.message}>
          {(control) => (
            <Input {...control} autoComplete="family-name" {...form.register('lastName')} />
          )}
        </FormField>
      </div>

      <FormField id="doctor-email" label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </FormField>

      <FormField
        id="doctor-specialization"
        label="Primary specialization"
        error={
          errors.primarySpecializationId?.message ??
          (specializations.isError ? 'Could not load specializations.' : undefined)
        }
      >
        {(control) => (
          <div className="flex gap-2">
            <select
              {...control}
              className={cn(selectClassName, 'flex-1')}
              disabled={!specializations.data}
              {...form.register('primarySpecializationId')}
            >
              <option value="">
                {specializations.isPending
                  ? 'Loading specializations…'
                  : specializations.data?.length === 0
                    ? 'No specializations available'
                    : 'Choose a specialization'}
              </option>
              {specializations.data?.map((specialization) => (
                <option key={specialization.id} value={specialization.id}>
                  {specialization.name}
                </option>
              ))}
            </select>
            {specializations.isError ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void specializations.refetch()}
              >
                Retry
              </Button>
            ) : null}
          </div>
        )}
      </FormField>

      <FormField
        id="doctor-license"
        label="License number"
        hint="Use a fictional number, e.g. FAKE-PRC-0100231."
        error={errors.licenseNumber?.message}
      >
        {(control) => <Input {...control} {...form.register('licenseNumber')} />}
      </FormField>

      <FormField id="doctor-bio" label="Short bio" optional error={errors.bio?.message}>
        {(control) => <Textarea {...control} rows={3} maxLength={2000} {...form.register('bio')} />}
      </FormField>

      <PasswordFields idPrefix="doctor" register={form.register} errors={errors} />

      <p className="text-sm text-muted-foreground">
        An administrator reviews every doctor profile before patients can book you.
      </p>

      <Button type="submit" size="lg" disabled={registerDoctor.isPending}>
        {registerDoctor.isPending ? 'Creating account…' : 'Create doctor account'}
      </Button>
    </form>
  );
}
