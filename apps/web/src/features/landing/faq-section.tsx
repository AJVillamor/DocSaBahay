import { landingContent } from '@content/landing';

import { Accordion } from '@/components/ui/accordion';

const { faq } = landingContent;

/** FAQ section built on the hand-rolled `Accordion` primitive. */
export function FaqSection() {
  return (
    <section className="border-t px-4 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight">{faq.heading}</h2>
        <div className="mt-10">
          <Accordion items={faq.items} />
        </div>
      </div>
    </section>
  );
}
