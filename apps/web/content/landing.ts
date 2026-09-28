/**
 * All copy for the public landing page (`apps/web/src/app/(public)/page.tsx`).
 * Components render this data; they never hard-code section copy themselves.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface StepCopy {
  title: string;
  description: string;
}

export interface CapabilityGroup {
  id: string;
  title: string;
  description: string;
  items: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const landingContent = {
  meta: {
    title: 'DokSaBahay — see a doctor from home',
    description:
      'DokSaBahay is a fictional telehealth prototype: find a doctor, book a consultation and get notes and prescriptions, all in one application-managed app.',
    ogImage: {
      path: '/og-image.svg',
      width: 1200,
      height: 630,
      alt: 'DokSaBahay — see a doctor from home. Fictional telehealth prototype.',
    },
  },

  brand: 'DokSaBahay',

  nav: {
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'For patients', href: '#for-patients' },
      { label: 'For doctors', href: '#for-doctors' },
      { label: 'Privacy & safety', href: '#privacy-safety' },
    ] satisfies NavLink[],
    signIn: 'Sign in',
    registerPatient: 'Register as patient',
    registerDoctor: 'Register as doctor',
    dashboard: 'Go to dashboard',
    openMenu: 'Open menu',
  },

  hero: {
    headline: 'See a doctor from home, on your schedule.',
    subtext:
      'DokSaBahay connects patients with doctors for online consultations — book a time, message your doctor, and keep your notes and prescriptions in one place.',
    primaryCta: { label: 'Find a doctor', href: '/register/patient' },
    secondaryCta: { label: 'Join as a doctor', href: '/register/doctor' },
  },

  disclaimer: {
    heading: 'Fictional prototype',
    body: 'DokSaBahay is a fictional telehealth prototype built for demonstration purposes. It is not a real medical service and none of the doctors, patients or records shown are real. If you are experiencing a medical emergency, contact your local emergency services immediately — do not use this app.',
  },

  howItWorks: {
    heading: 'How it works',
    subtext: 'From account to consultation in four steps.',
    steps: [
      {
        title: 'Create account',
        description: 'Register as a patient or a doctor with just an email and password.',
      },
      {
        title: 'Find the right doctor',
        description: 'Browse doctors by specialization and availability that fits your schedule.',
      },
      {
        title: 'Book a consultation',
        description: 'Pick an open slot and confirm your booking — no back-and-forth needed.',
      },
      {
        title: 'Get notes & prescriptions',
        description:
          'After your consultation, review your doctor’s notes and prescriptions any time.',
      },
    ] satisfies StepCopy[],
  },

  capabilities: {
    heading: 'Built for patients and doctors',
    groups: [
      {
        id: 'for-patients',
        title: 'For patients',
        description: 'Everything you need to manage your care in one place.',
        items: [
          'Search doctors by specialization',
          'Book and reschedule consultations online',
          'Message your doctor about an upcoming visit',
          'View consultation notes and prescriptions',
          'Get notified when something changes',
        ],
      },
      {
        id: 'for-doctors',
        title: 'For doctors',
        description: 'Tools to run your practice without the overhead.',
        items: [
          'Set your own weekly availability',
          'Manage your consultation schedule',
          'Write consultation notes and issue prescriptions',
          'Keep a history of every patient you have seen',
          'Get verified once by an administrator, then start seeing patients',
        ],
      },
    ] satisfies CapabilityGroup[],
  },

  privacy: {
    heading: 'Privacy & safety',
    subtext: 'Your data stays inside the application you are using right now.',
    points: [
      {
        title: 'Role-based access',
        description:
          'Patients, doctors and administrators each see only the data their role is allowed to see.',
      },
      {
        title: 'Application-managed data',
        description:
          'Accounts, records and messages are stored and managed entirely by DokSaBahay — there is no external identity or data provider involved.',
      },
      {
        title: 'No third-party trackers',
        description:
          'This app loads no external analytics, advertising or tracking scripts of any kind.',
      },
    ],
  },

  faq: {
    heading: 'Frequently asked questions',
    items: [
      {
        question: 'Is DokSaBahay a real medical service?',
        answer:
          'No. DokSaBahay is a fictional prototype built to demonstrate a telehealth application. It is not for real medical use, and no data entered should be real personal or health information.',
      },
      {
        question: 'Who can register as a doctor?',
        answer:
          'Anyone can create a doctor account for demonstration purposes. Doctor profiles go through a review step by an administrator before they can be booked by patients.',
      },
      {
        question: 'How do I book a consultation?',
        answer:
          'Register as a patient, search for a doctor by specialization, and choose an open time slot from their availability. Your booking is confirmed immediately.',
      },
      {
        question: 'What happens after a consultation?',
        answer:
          'Your doctor can write consultation notes and issue prescriptions, which appear in your records for you to review at any time.',
      },
      {
        question: 'Does DokSaBahay share my data with third parties?',
        answer:
          'No. This prototype uses no external analytics, advertising or data-sharing services. All data is stored and managed within the application itself.',
      },
      {
        question: 'What if I have a medical emergency?',
        answer:
          'Do not use this app. Contact your local emergency services immediately. DokSaBahay is a fictional prototype and cannot respond to real emergencies.',
      },
    ] satisfies FaqItem[],
  },

  footer: {
    termsLabel: 'Terms of use',
    privacyLabel: 'Privacy',
    copyrightName: 'DokSaBahay',
    copyrightSuffix: 'A fictional telehealth prototype. All content is invented for demonstration.',
  },
} as const;
