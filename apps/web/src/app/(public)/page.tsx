import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { HealthStatus } from '@/features/health/health-status';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">DokSaBahay</h1>
        <p className="mt-2 text-muted-foreground">
          See a doctor from home. A fictional telehealth prototype.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/register/patient" className={buttonVariants({ size: 'lg' })}>
          Register as a patient
        </Link>
        <Link
          href="/register/doctor"
          className={buttonVariants({ size: 'lg', variant: 'outline' })}
        >
          Join as a doctor
        </Link>
        <Link href="/login" className={buttonVariants({ size: 'lg', variant: 'ghost' })}>
          Sign in
        </Link>
      </div>
      <HealthStatus />
    </main>
  );
}
