import { HealthStatus } from '@/features/health/health-status';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">DokSaBahay</h1>
        <p className="mt-2 text-muted-foreground">Telehealth prototype — scaffolding check.</p>
      </div>
      <HealthStatus />
    </main>
  );
}
