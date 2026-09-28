import { landingContent } from '@content/landing';
import { AlertTriangle } from 'lucide-react';

const { disclaimer } = landingContent;

/** Prototype disclaimer, styled like the doctor verification banner (amber, high visibility). */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="border-y border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50"
    >
      <div className="mx-auto flex w-full max-w-6xl items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">
          <strong className="font-semibold">{disclaimer.heading}.</strong> {disclaimer.body}
        </p>
      </div>
    </div>
  );
}
