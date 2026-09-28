/** Copy for the `/privacy` page. Placeholder privacy notice for a fictional prototype. */

import type { LegalSection } from './terms';

export const privacyContent = {
  title: 'Privacy',
  lastUpdated: 'September 1, 2026',
  intro: [
    'DokSaBahay is a fictional telehealth prototype. This page describes, in plain terms, what the app stores and how it is used. It is placeholder content, not a real privacy policy.',
    'Do not enter real personal or health information anywhere in this app.',
  ],
  sections: [
    {
      heading: '1. What we store',
      body: [
        'The app stores the information you type in while using it: your account details, profile information, availability, bookings, messages, consultation notes and prescriptions. All of it is fictional demonstration data.',
      ],
    },
    {
      heading: '2. How it is used',
      body: [
        'Your data is used only to run the features you interact with — for example, showing your appointments to you and to the doctor you booked, or matching you with doctors by specialization.',
        'Access is role-based: patients, doctors and administrators only ever see the data their role needs.',
      ],
    },
    {
      heading: '3. Cookies and sessions',
      body: [
        'Signing in sets two httpOnly cookies that exist only to keep you signed in and to renew your session. They are not used for tracking or advertising.',
      ],
    },
    {
      heading: '4. No third parties',
      body: [
        'This prototype uses no external analytics, advertising, email, SMS, file hosting or other third-party services. Everything is stored and served by the application itself, in its own local database.',
      ],
    },
    {
      heading: '5. Data retention and deletion',
      body: [
        'Because this is a demonstration environment, data may be reset or deleted at any time without notice. There is no guarantee of long-term storage.',
      ],
    },
    {
      heading: '6. Contact',
      body: [
        'This is a fictional prototype without a real organization or support channel behind it.',
      ],
    },
  ] satisfies LegalSection[],
} as const;
