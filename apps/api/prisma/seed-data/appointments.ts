// Demo appointment scenarios. Exact times are computed at seed time from each
// doctor's availability (see scheduler.ts), relative to "now".
import type { DoctorKey, PatientKey } from './people';

export interface NoteSeed {
  chiefComplaint: string;
  findings: string;
  diagnosis: string;
  recommendations: string;
  summary: string;
}

export interface PrescriptionItemSeed {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface BaseAppointmentSeed {
  key: string;
  doctor: DoctorKey;
  patient: PatientKey;
  /** Day (relative to today) from which to search for the first free slot. */
  fromDayOffset: number;
  reasonForVisit: string;
}

export interface CompletedAppointmentSeed extends BaseAppointmentSeed {
  status: 'COMPLETED';
  note: NoteSeed;
  prescription?: { notes?: string; items: PrescriptionItemSeed[] };
}

export interface CancelledAppointmentSeed extends BaseAppointmentSeed {
  status: 'CANCELLED';
  cancelledBy: 'doctor' | 'patient';
  cancellationReason: string;
}

export interface ScheduledAppointmentSeed extends BaseAppointmentSeed {
  status: 'SCHEDULED';
}

export type AppointmentSeed =
  CompletedAppointmentSeed | CancelledAppointmentSeed | ScheduledAppointmentSeed;

export const APPOINTMENTS: AppointmentSeed[] = [
  // ---- Past, COMPLETED -------------------------------------------------------
  {
    key: 'c1',
    status: 'COMPLETED',
    doctor: 'santos',
    patient: 'juan',
    fromDayOffset: -40,
    reasonForVisit: 'Follow-up for blood pressure control',
    note: {
      chiefComplaint: 'Routine blood pressure follow-up.',
      findings: 'Home readings average 128/82. No headaches or chest discomfort reported.',
      diagnosis: 'Essential hypertension, controlled',
      recommendations: 'Continue current medication. Reduce salt intake and walk 30 minutes daily.',
      summary: 'Blood pressure well controlled on current treatment. Review in 3 months.',
    },
    prescription: {
      notes: 'Maintenance medication refill.',
      items: [
        {
          medicationName: 'Amlodipine',
          dosage: '5 mg tablet',
          frequency: 'Once daily',
          duration: '90 days',
          instructions: 'Take in the morning.',
        },
      ],
    },
  },
  {
    key: 'c2',
    status: 'COMPLETED',
    doctor: 'garcia',
    patient: 'juan',
    fromDayOffset: -30,
    reasonForVisit: 'Occasional palpitations',
    note: {
      chiefComplaint: 'Brief episodes of a racing heart, mostly after coffee.',
      findings: 'Episodes last under a minute. No fainting or breathlessness.',
      diagnosis: 'Benign palpitations, likely caffeine-related',
      recommendations:
        'Limit caffeine. Keep a symptom diary and seek urgent care if chest pain occurs.',
      summary: 'Low-risk palpitations. Lifestyle advice given; no medication needed.',
    },
  },
  {
    key: 'c3',
    status: 'COMPLETED',
    doctor: 'reyes',
    patient: 'miguel',
    fromDayOffset: -35,
    reasonForVisit: 'Diabetes review',
    note: {
      chiefComplaint: 'Quarterly diabetes check.',
      findings: 'Fasting glucose readings 130–150 mg/dL. Occasional missed evening doses.',
      diagnosis: 'Type 2 diabetes mellitus, suboptimally controlled',
      recommendations: 'Take medication consistently with meals. Repeat HbA1c in 3 months.',
      summary: 'Adherence counselling given; current regimen continued.',
    },
    prescription: {
      items: [
        {
          medicationName: 'Metformin',
          dosage: '500 mg tablet',
          frequency: 'Twice daily with meals',
          duration: '90 days',
        },
      ],
    },
  },
  {
    key: 'c4',
    status: 'COMPLETED',
    doctor: 'lim',
    patient: 'sofia',
    fromDayOffset: -28,
    reasonForVisit: 'Eczema flare on both arms',
    note: {
      chiefComplaint: 'Itchy, dry patches on both forearms for two weeks.',
      findings:
        'Patient describes red, scaly patches worse at night. No signs of infection reported.',
      diagnosis: 'Atopic eczema flare',
      recommendations: 'Moisturise twice daily, use a mild soap and apply the cream for one week.',
      summary: 'Eczema flare treated with a short course of topical steroid.',
    },
    prescription: {
      items: [
        {
          medicationName: 'Hydrocortisone 1% cream',
          dosage: 'Thin layer',
          frequency: 'Twice daily',
          duration: '7 days',
          instructions: 'Apply to affected areas only. Do not use on the face.',
        },
      ],
    },
  },
  {
    key: 'c5',
    status: 'COMPLETED',
    doctor: 'tanaka',
    patient: 'liza',
    fromDayOffset: -21,
    reasonForVisit: 'Sore throat and ear pain',
    note: {
      chiefComplaint: 'Sore throat for four days with right ear pain.',
      findings: 'Fever up to 38.2 °C. Painful swallowing. No breathing difficulty.',
      diagnosis: 'Acute tonsillopharyngitis',
      recommendations: 'Warm fluids, rest and complete the antibiotic course.',
      summary: 'Likely bacterial throat infection; antibiotic prescribed.',
    },
    prescription: {
      items: [
        {
          medicationName: 'Amoxicillin',
          dosage: '500 mg capsule',
          frequency: 'Three times daily',
          duration: '7 days',
          instructions: 'Complete the full course.',
        },
        {
          medicationName: 'Paracetamol',
          dosage: '500 mg tablet',
          frequency: 'Every 6 hours as needed',
          duration: '5 days',
          instructions: 'For pain or fever. Do not exceed 4 tablets a day.',
        },
      ],
    },
  },
  {
    key: 'c6',
    status: 'COMPLETED',
    doctor: 'villanueva',
    patient: 'liza',
    fromDayOffset: -18,
    reasonForVisit: 'Trouble sleeping and work stress',
    note: {
      chiefComplaint: 'Difficulty falling asleep for a month.',
      findings: 'Work-related stress. No thoughts of self-harm. Appetite normal.',
      diagnosis: 'Adjustment-related insomnia',
      recommendations: 'Sleep hygiene routine, limit screens before bed, try breathing exercises.',
      summary: 'Non-medication plan agreed. Follow-up in about a month.',
    },
  },
  {
    key: 'c7',
    status: 'COMPLETED',
    doctor: 'bautista',
    patient: 'tony',
    fromDayOffset: -25,
    reasonForVisit: 'Right knee pain when climbing stairs',
    note: {
      chiefComplaint: 'Right knee pain, worse on stairs and after long walks.',
      findings: 'Morning stiffness under 30 minutes. No recent injury.',
      diagnosis: 'Knee osteoarthritis flare',
      recommendations: 'Low-impact exercise, quadriceps strengthening and weight management.',
      summary: 'Osteoarthritis flare managed with physiotherapy exercises and pain relief.',
    },
    prescription: {
      notes: 'Patient is allergic to aspirin; NSAIDs avoided.',
      items: [
        {
          medicationName: 'Paracetamol',
          dosage: '500 mg tablet',
          frequency: 'Every 8 hours as needed',
          duration: '14 days',
        },
      ],
    },
  },
  {
    key: 'c8',
    status: 'COMPLETED',
    doctor: 'mendoza',
    patient: 'sofia',
    fromDayOffset: -12,
    reasonForVisit: 'Recurring headaches',
    note: {
      chiefComplaint: 'One-sided throbbing headaches twice a month.',
      findings: 'Light sensitivity during episodes. No weakness or vision loss.',
      diagnosis: 'Migraine without aura',
      recommendations: 'Keep a headache diary, stay hydrated and keep regular sleep.',
      summary: 'Typical migraine pattern. Diary review at next visit.',
    },
  },
  {
    key: 'c9',
    status: 'COMPLETED',
    doctor: 'aquino',
    patient: 'liza',
    fromDayOffset: -10,
    reasonForVisit: 'Irregular periods',
    note: {
      chiefComplaint: 'Cycles varying between 24 and 40 days for six months.',
      findings: 'No heavy bleeding or pelvic pain reported.',
      diagnosis: 'Irregular menstrual cycle, cause to be determined',
      recommendations: 'Track cycles for three months and have routine blood work done locally.',
      summary: 'Cycle tracking advised before further evaluation.',
    },
  },
  {
    key: 'c10',
    status: 'COMPLETED',
    doctor: 'reyes',
    patient: 'tony',
    fromDayOffset: -7,
    reasonForVisit: 'Heartburn after meals',
    note: {
      chiefComplaint: 'Burning chest discomfort after large meals and at night.',
      findings: 'Symptoms improve with antacids. No trouble swallowing or weight loss.',
      diagnosis: 'Gastroesophageal reflux disease',
      recommendations: 'Smaller meals, avoid eating 3 hours before bed, raise the head of the bed.',
      summary: 'Reflux symptoms; acid-reducing medication adjusted.',
    },
    prescription: {
      items: [
        {
          medicationName: 'Omeprazole',
          dosage: '20 mg capsule',
          frequency: 'Once daily before breakfast',
          duration: '30 days',
        },
      ],
    },
  },

  // ---- Past, CANCELLED -------------------------------------------------------
  {
    key: 'x1',
    status: 'CANCELLED',
    doctor: 'santos',
    patient: 'miguel',
    fromDayOffset: -20,
    reasonForVisit: 'General check-up',
    cancelledBy: 'patient',
    cancellationReason: 'Schedule conflict at work.',
  },
  {
    key: 'x2',
    status: 'CANCELLED',
    doctor: 'garcia',
    patient: 'tony',
    fromDayOffset: -15,
    reasonForVisit: 'Blood pressure concerns',
    cancelledBy: 'doctor',
    cancellationReason: 'Doctor unavailable due to an emergency.',
  },
  {
    key: 'x3',
    status: 'CANCELLED',
    doctor: 'lim',
    patient: 'juan',
    fromDayOffset: -5,
    reasonForVisit: 'Itchy rash on the back',
    cancelledBy: 'patient',
    cancellationReason: 'Symptoms resolved.',
  },

  // ---- Upcoming, SCHEDULED (within the next 14 days) --------------------------
  {
    key: 's1',
    status: 'SCHEDULED',
    doctor: 'santos',
    patient: 'juan',
    fromDayOffset: 1,
    reasonForVisit: 'Blood pressure check',
  },
  {
    key: 's2',
    status: 'SCHEDULED',
    doctor: 'garcia',
    patient: 'miguel',
    fromDayOffset: 2,
    reasonForVisit: 'Cardiac risk assessment',
  },
  {
    key: 's3',
    status: 'SCHEDULED',
    doctor: 'lim',
    patient: 'sofia',
    fromDayOffset: 3,
    reasonForVisit: 'Eczema follow-up',
  },
  {
    key: 's4',
    status: 'SCHEDULED',
    doctor: 'tanaka',
    patient: 'tony',
    fromDayOffset: 4,
    reasonForVisit: 'Reduced hearing in left ear',
  },
  {
    key: 's5',
    status: 'SCHEDULED',
    doctor: 'villanueva',
    patient: 'liza',
    fromDayOffset: 5,
    reasonForVisit: 'Follow-up on sleep and stress',
  },
  {
    key: 's6',
    status: 'SCHEDULED',
    doctor: 'bautista',
    patient: 'miguel',
    fromDayOffset: 7,
    reasonForVisit: 'Lower back pain',
  },
  {
    key: 's7',
    status: 'SCHEDULED',
    doctor: 'aquino',
    patient: 'liza',
    fromDayOffset: 9,
    reasonForVisit: 'Cycle tracking review',
  },
  {
    key: 's8',
    status: 'SCHEDULED',
    doctor: 'mendoza',
    patient: 'sofia',
    fromDayOffset: 10,
    reasonForVisit: 'Headache diary review',
  },
];
