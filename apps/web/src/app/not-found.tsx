import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link className="underline underline-offset-4" href="/">
        Back to home
      </Link>
    </main>
  );
}
