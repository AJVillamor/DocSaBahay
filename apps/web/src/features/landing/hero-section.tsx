import { landingContent } from '@content/landing';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

const { hero } = landingContent;

/** House-and-heart mark: a hand-authored inline SVG, no external image or icon font. */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-labelledby="hero-illustration-title"
      className="h-auto w-full max-w-sm text-primary"
    >
      <title id="hero-illustration-title">Illustration of a house with a heart</title>
      <rect x="10" y="90" width="220" height="100" rx="12" className="fill-muted" />
      <path d="M20 100 L120 20 L220 100 Z" className="fill-current opacity-80" />
      <rect x="100" y="120" width="40" height="70" rx="4" className="fill-background" />
      <circle cx="120" cy="70" r="22" className="fill-background" />
      <path
        d="M120 82c-9-7-18-13-18-23a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 10-9 16-18 23z"
        className="fill-current"
      />
    </svg>
  );
}

/** Hero: the page's only `<h1>`, value proposition and primary/secondary CTAs. */
export function HeroSection() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col-reverse items-center gap-10 px-4 py-16 lg:flex-row lg:py-24">
      <div className="flex flex-1 flex-col items-center gap-6 text-center lg:items-start lg:text-left">
        <h1 className="text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
          {hero.headline}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-balance">{hero.subtext}</p>
        <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
          <Link href={hero.primaryCta.href} className={buttonVariants({ size: 'lg' })}>
            {hero.primaryCta.label}
          </Link>
          <Link
            href={hero.secondaryCta.href}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {hero.secondaryCta.label}
          </Link>
        </div>
      </div>
      <div className="flex flex-1 justify-center">
        <HeroIllustration />
      </div>
    </section>
  );
}
