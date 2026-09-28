import { landingContent } from '@content/landing';
import type { Metadata } from 'next';

import { CapabilitiesSection } from '@/features/landing/capabilities-section';
import { DisclaimerBanner } from '@/features/landing/disclaimer-banner';
import { FaqSection } from '@/features/landing/faq-section';
import { HeroSection } from '@/features/landing/hero-section';
import { HowItWorksSection } from '@/features/landing/how-it-works-section';
import { LandingHeader } from '@/features/landing/landing-header';
import { PrivacySection } from '@/features/landing/privacy-section';

const { meta } = landingContent;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  openGraph: {
    title: meta.title,
    description: meta.description,
    type: 'website',
    images: [
      {
        url: meta.ogImage.path,
        width: meta.ogImage.width,
        height: meta.ogImage.height,
        alt: meta.ogImage.alt,
      },
    ],
  },
};

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main className="flex flex-1 flex-col">
        <HeroSection />
        <DisclaimerBanner />
        <HowItWorksSection />
        <CapabilitiesSection />
        <PrivacySection />
        <FaqSection />
      </main>
    </>
  );
}
