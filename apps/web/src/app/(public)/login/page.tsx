import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign in' };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-2 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted-foreground">The sign-in form is coming next.</p>
    </main>
  );
}
