'use client';

import { ErrorCode, registerPatientSchema } from '@doksabahay/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/form/form-alert';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { confirmPasswordShape, PasswordFields, passwordsMatch } from './password-fields';
import { useCompleteSignIn } from './use-auth';
import { authErrorMessage, useRedirectIfSignedIn, useRegisterPatient } from './use-auth-forms';

const schema = registerPatientSchema.extend(confirmPasswordShape).refine(...passwordsMatch);

export function RegisterPatientForm() {
  useRedirectIfSignedIn();
  const completeSignIn = useCompleteSignIn();
  const registerPatient = useRegisterPatient();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(({ confirmPassword: _confirm, ...input }) =>
    registerPatient.mutate(input, {
      onSuccess: (user) => completeSignIn(user),
      onError: (error) => {
        if (error.code === ErrorCode.EMAIL_TAKEN) {
          form.setError('email', { message: error.message }, { shouldFocus: true });
        }
      },
    }),
  );

  const formError =
    registerPatient.error && registerPatient.error.code !== ErrorCode.EMAIL_TAKEN
      ? authErrorMessage(registerPatient.error)
      : null;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {formError ? <FormAlert>{formError}</FormAlert> : null}

      <FormField id="patient-email" label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </FormField>

      <PasswordFields idPrefix="patient" register={form.register} errors={errors} />

      <Button type="submit" size="lg" disabled={registerPatient.isPending}>
        {registerPatient.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
