/** Copy for the `/terms` page. Placeholder legal text for a fictional prototype. */

export interface LegalSection {
  heading: string;
  body: string[];
}

export const termsContent = {
  title: 'Terms of use',
  lastUpdated: 'September 1, 2026',
  intro: [
    'DokSaBahay is a fictional telehealth prototype built for demonstration purposes. These terms are invented placeholder content and do not create a real legal agreement.',
    'By using this prototype you agree that it is not a real medical service, and that you will not enter real personal or health information.',
  ],
  sections: [
    {
      heading: '1. About this prototype',
      body: [
        'DokSaBahay simulates a telehealth application: account registration, doctor discovery, booking, consultation notes and prescriptions. Nothing in the app reflects a real healthcare provider, real medical advice, or a real prescription.',
      ],
    },
    {
      heading: '2. Accounts',
      body: [
        'You may register as a patient or a doctor with an email address and password. Doctor accounts are reviewed by an administrator before they can be booked, to demonstrate the app’s verification flow.',
        'You are responsible for keeping your password confidential. Do not reuse a password from a real account you care about.',
      ],
    },
    {
      heading: '3. Acceptable use',
      body: [
        'Use this prototype only to explore its features. Do not attempt to disrupt the service, access another user’s data without authorization, or use the app for anything other than demonstration.',
      ],
    },
    {
      heading: '4. Fictional content only',
      body: [
        'Every doctor, patient, appointment, note and prescription shown or created in this app is fictional. No content in DokSaBahay should be treated as real medical advice, diagnosis or treatment.',
        'In a medical emergency, contact your local emergency services immediately. Do not use this app.',
      ],
    },
    {
      heading: '5. Availability and changes',
      body: [
        'This prototype may change, be reset, or become unavailable at any time without notice, since it exists only for demonstration.',
      ],
    },
    {
      heading: '6. Contact',
      body: [
        'This is a fictional prototype without a real support channel. There is no real organization behind DokSaBahay to contact.',
      ],
    },
  ] satisfies LegalSection[],
} as const;
