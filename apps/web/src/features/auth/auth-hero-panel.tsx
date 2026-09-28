/** Compact house-and-heart mark, matching the landing page's hero illustration. */
function BrandMark() {
  return (
    <svg viewBox="0 0 28 28" role="img" aria-labelledby="auth-brand-mark-title" className="size-7">
      <title id="auth-brand-mark-title">DokSaBahay</title>
      <path
        d="M14 3L25 11V25H3V11L14 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M14 20c-3.5-2.3-5.5-4.2-5.5-6.6 0-1.9 1.5-3.4 3.4-3.4 1.1 0 2.1.5 2.1 1.4 0-.9 1-1.4 2.1-1.4 1.9 0 3.4 1.5 3.4 3.4 0 2.4-2 4.3-5.5 6.6z"
        fill="currentColor"
      />
    </svg>
  );
}

interface AuthHeroContent {
  headline: string;
  subtext: string;
  features: readonly string[];
}

/**
 * Left brand panel shared by the sign-in and both registration pages.
 * Purely presentational — the feature list is short reassurance copy, not a
 * marketing page.
 */
export function AuthHeroPanel({ headline, subtext, features }: AuthHeroContent) {
  return (
    <div className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex lg:w-[420px] xl:w-[480px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-28 size-72 rounded-full bg-white/[0.06]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-14 size-56 rounded-full bg-info/20"
      />

      <div className="relative flex items-center gap-2.5">
        <BrandMark />
        <span className="text-lg font-bold tracking-tight">DokSaBahay</span>
      </div>

      <div className="relative flex max-w-sm flex-col gap-4">
        <h1 className="text-4xl leading-tight font-extrabold tracking-tight">{headline}</h1>
        <p className="text-primary-foreground/85 text-base leading-relaxed">{subtext}</p>
      </div>

      <ul className="relative flex flex-col gap-3.5 border-t border-white/15 pt-5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 text-sm text-primary-foreground/95">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-[18px] shrink-0">
              <circle cx="10" cy="10" r="10" className="fill-white/15" />
              <path
                d="M6 10.2l2.4 2.4L14 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact stand-in for `AuthHeroPanel` below the `lg` breakpoint. */
export function AuthHeroBand({ headline }: Pick<AuthHeroContent, 'headline'>) {
  return (
    <div className="relative overflow-hidden bg-primary px-6 py-9 text-primary-foreground lg:hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-10 size-44 rounded-full bg-info/20"
      />
      <div className="relative flex items-center gap-2">
        <BrandMark />
        <span className="text-base font-bold tracking-tight">DokSaBahay</span>
      </div>
      <h1 className="relative mt-4 max-w-xs text-2xl leading-tight font-extrabold tracking-tight">
        {headline}
      </h1>
    </div>
  );
}
