import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy' };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <p className="text-muted-foreground">
        Do not enter real personal or health information. This prototype stores only the fictional
        data you type in, in its own local database.
      </p>
      <p className="text-muted-foreground">
        The app uses no analytics, third-party trackers or external services. Sign-in uses two
        httpOnly cookies that exist only to keep you signed in.
      </p>
    </main>
  );
}
