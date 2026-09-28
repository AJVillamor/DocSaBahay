import { landingContent } from '@content/landing';
import { Check } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const { capabilities } = landingContent;

/** Patient and doctor capability columns; each has its own anchor for the header nav links. */
export function CapabilitiesSection() {
  return (
    <section className="border-t px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          {capabilities.heading}
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {capabilities.groups.map((group) => (
            <Card key={group.id} id={group.id} className="scroll-mt-16">
              <CardHeader>
                <CardTitle className="text-xl">{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
