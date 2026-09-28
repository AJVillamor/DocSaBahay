import { landingContent } from '@content/landing';
import Link from 'next/link';

const { footer } = landingContent;

/** Rendered globally (see `app/layout.tsx`): disclaimer, legal links and copyright. */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Fictional prototype — not for real medical use.</p>
      <nav aria-label="Legal" className="mt-3 flex justify-center gap-4">
        <Link href="/terms" className="underline-offset-4 hover:underline">
          {footer.termsLabel}
        </Link>
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          {footer.privacyLabel}
        </Link>
      </nav>
      <p className="mt-3">
        © {year} {footer.copyrightName}. {footer.copyrightSuffix}
      </p>
    </footer>
  );
}
