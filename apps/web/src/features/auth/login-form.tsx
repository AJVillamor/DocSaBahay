'use client';

import { loginSchema } from '@doksabahay/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: (user) => completeSignIn(user, next) }),
  );

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
      {login.error ? <FormAlert>{authErrorMessage(login.error)}</FormAlert> : null}

      <FormField id="login-email" label="Email" error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            className="h-11"
            {...form.register('email')}
          />
        )}
      </FormField>

      <FormField id="login-password" label="Password" error={errors.password?.message}>
        {(control) => (
          <div className="relative">
            <Input
              {...control}
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              className="h-11 pr-10"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              className="absolute inset-y-1.5 right-1.5 flex w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {passwordVisible ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </FormField>

      <Button type="submit" size="lg" className="h-11" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
