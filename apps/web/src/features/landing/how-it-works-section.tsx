import { landingContent } from '@content/landing';
import { CalendarCheck, FileText, Search, UserPlus, type LucideIcon } from 'lucide-react';

const { howItWorks } = landingContent;

const STEP_ICONS: LucideIcon[] = [UserPlus, Search, CalendarCheck, FileText];

/** Four-step "how it works" overview, anchored for the header's "How it works" nav link. */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">{howItWorks.heading}</h2>
          <p className="mt-2 text-muted-foreground">{howItWorks.subtext}</p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.steps.map((step, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <li
                key={step.title}
                className="flex flex-col items-start gap-3 rounded-xl border p-5"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
                </span>
                <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
                <h3 className="text-base font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
