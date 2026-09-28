import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site-footer';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'DokSaBahay',
  description: 'Fictional telehealth prototype.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers>
          <div className="flex flex-1 flex-col">{children}</div>
        </Providers>
        <SiteFooter />
      </body>
    </html>
  );
}
