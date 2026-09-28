import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of use' };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of use</h1>
      <p className="text-muted-foreground">
        DokSaBahay is a fictional prototype built for demonstration. It is not a medical service and
        must not be used for real medical advice, diagnosis or treatment.
      </p>
      <p className="text-muted-foreground">
        All doctors, patients, appointments and records in this app are made up. In an emergency,
        contact your local emergency number.
      </p>
    </main>
  );
}
