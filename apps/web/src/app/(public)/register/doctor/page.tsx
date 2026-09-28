import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Join as a doctor' };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-2 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Join as a doctor</h1>
      <p className="text-muted-foreground">The doctor registration form is coming next.</p>
    </main>
  );
}
