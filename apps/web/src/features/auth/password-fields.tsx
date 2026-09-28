'use client';

import { PASSWORD_POLICY_MESSAGE } from '@doksabahay/shared';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';

import { FormField } from '@/components/form/form-field';
import { Input } from '@/components/ui/input';

/**
 * Form-only "confirm password" field (never sent to the API). Use as
 * `schema.extend(confirmPasswordShape).refine(...passwordsMatch)`.
 */
export const confirmPasswordShape = {
  confirmPassword: z.string().min(1, 'Confirm your password.'),
};

export const passwordsMatch: [
  (values: { password: string; confirmPassword: string }) => boolean,
  { path: string[]; message: string },
] = [
  (values) => values.password === values.confirmPassword,
  { path: ['confirmPassword'], message: 'Passwords do not match.' },
];

interface PasswordFieldValues {
  password: string;
  confirmPassword: string;
}

/** New-password and confirmation inputs shared by both registration forms. */
export function PasswordFields<T extends PasswordFieldValues>({
  idPrefix,
  register,
  errors,
}: {
  idPrefix: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<PasswordFieldValues>;
}) {
  // Narrowed so both fields register against the shared shape.
  const registerField = register as unknown as UseFormRegister<PasswordFieldValues>;
  return (
    <>
      <FormField
        id={`${idPrefix}-password`}
        label="Password"
        hint={PASSWORD_POLICY_MESSAGE}
        error={errors.password?.message}
      >
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="new-password"
            {...registerField('password')}
          />
        )}
      </FormField>
      <FormField
        id={`${idPrefix}-confirm-password`}
        label="Confirm password"
        error={errors.confirmPassword?.message}
      >
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="new-password"
            {...registerField('confirmPassword')}
          />
        )}
      </FormField>
    </>
  );
}
