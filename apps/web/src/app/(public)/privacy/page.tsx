import { privacyContent } from '@content/privacy';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: privacyContent.title,
  description: 'Placeholder privacy notice for the DokSaBahay fictional telehealth prototype.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{privacyContent.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: {privacyContent.lastUpdated}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {privacyContent.intro.map((paragraph) => (
          <p key={paragraph} className="text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {privacyContent.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-lg font-medium tracking-tight">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
