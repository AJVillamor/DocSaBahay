'use client';

import { loginSchema } from '@doksabahay/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/form/form-alert';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useCompleteSignIn } from './use-auth';
import { authErrorMessage, useLogin, useRedirectIfSignedIn } from './use-auth-forms';

export function LoginForm() {
  const next = useSearchParams().get('next');
  useRedirectIfSignedIn(next);
  const completeSignIn = useCompleteSignIn();
  const login = useLogin();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: (user) => completeSignIn(user, next) }),
  );

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {login.error ? <FormAlert>{authErrorMessage(login.error)}</FormAlert> : null}

      <FormField id="login-email" label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </FormField>

      <FormField id="login-password" label="Password" error={errors.password?.message}>
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
        )}
      </FormField>

      <Button type="submit" size="lg" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
