import { landingContent } from '@content/landing';
import { Lock, ShieldCheck, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const { privacy } = landingContent;

const POINT_ICONS: LucideIcon[] = [UserCog, ShieldCheck, Lock];

/** Privacy & safety overview, anchored for the header's "Privacy & safety" nav link. */
export function PrivacySection() {
  return (
    <section id="privacy-safety" className="scroll-mt-16 border-t px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">{privacy.heading}</h2>
          <p className="mt-2 text-muted-foreground">{privacy.subtext}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {privacy.points.map((point, index) => {
            const Icon = POINT_ICONS[index];
            return (
              <div
                key={point.title}
                className="flex flex-col items-start gap-3 rounded-xl border p-5"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
                </span>
                <h3 className="text-base font-medium">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
