// Fictional demo accounts. Emails are on example.com; license numbers start with "FAKE-".
import type { VerificationStatus } from '@prisma/client';

import type { SpecializationSlug } from './catalog';

/** Shared password for every demo (non-admin) account. */
export const DEMO_PASSWORD = 'Password123!';

/** `[dayOfWeek 0=Sun…6=Sat, "HH:mm", "HH:mm"]` in the doctor's timezone. */
export type WeeklySlot = [number, string, string];

const weekdays = (start: string, end: string, days = [1, 2, 3, 4, 5]): WeeklySlot[] =>
  days.map((day) => [day, start, end]);

export type DoctorKey =
  | 'santos'
  | 'reyes'
  | 'lim'
  | 'garcia'
  | 'villanueva'
  | 'tanaka'
  | 'bautista'
  | 'aquino'
  | 'mendoza'
  | 'cruz'
  | 'navarro'
  | 'ocampo';

export interface DoctorSeed {
  key: DoctorKey;
  email: string;
  firstName: string;
  lastName: string;
  /** First entry is the primary specialization. */
  specializations: SpecializationSlug[];
  languages: string[];
  timezone: string;
  yearsExperience: number;
  consultationMinutes: number;
  verificationStatus: VerificationStatus;
  reviewNote?: string;
  bio: string;
  availability: WeeklySlot[];
  /** Whole local days (offset from today) the doctor is unavailable. */
  blockedDayOffsets?: { offset: number; reason: string }[];
}

export const DOCTORS: DoctorSeed[] = [
  {
    key: 'santos',
    email: 'dr.maria.santos@example.com',
    firstName: 'Maria',
    lastName: 'Santos',
    specializations: ['general-practice', 'internal-medicine', 'pediatrics'],
    languages: ['English', 'Filipino'],
    timezone: 'Asia/Manila',
    yearsExperience: 12,
    consultationMinutes: 30,
    verificationStatus: 'APPROVED',
    bio: 'Family physician who enjoys preventive care and helping families manage everyday illnesses.',
    availability: [...weekdays('09:00', '12:00'), ...weekdays('14:00', '17:00')],
  },
  {
    key: 'reyes',
    email: 'dr.jose.reyes@example.com',
    firstName: 'Jose',
    lastName: 'Reyes',
    specializations: ['internal-medicine', 'gastroenterology'],
    languages: ['English', 'Filipino', 'Cebuano'],
    timezone: 'Asia/Manila',
    yearsExperience: 18,
    consultationMinutes: 30,
    verificationStatus: 'APPROVED',
    bio: 'Internist focused on diabetes, digestive health and long-term care of adults.',
    availability: [...weekdays('08:00', '12:00', [1, 3, 5]), [6, '09:00', '12:00']],
  },
  {
    key: 'lim',
    email: 'dr.kevin.lim@example.com',
    firstName: 'Kevin',
    lastName: 'Lim',
    specializations: ['dermatology'],
    languages: ['English', 'Filipino', 'Mandarin'],
    timezone: 'Asia/Singapore',
    yearsExperience: 7,
    consultationMinutes: 20,
    verificationStatus: 'APPROVED',
    bio: 'Dermatologist treating eczema, acne and other common skin concerns.',
    availability: weekdays('10:00', '13:00', [1, 2, 3, 4]),
  },
  {
    key: 'garcia',
    email: 'dr.isabel.garcia@example.com',
    firstName: 'Isabel',
    lastName: 'Garcia',
    specializations: ['cardiology', 'internal-medicine'],
    languages: ['English', 'Spanish', 'Filipino'],
    timezone: 'America/Los_Angeles',
    yearsExperience: 20,
    consultationMinutes: 45,
    verificationStatus: 'APPROVED',
    bio: 'Cardiologist based in California; evening clinics line up with Philippine mornings.',
    availability: weekdays('17:00', '20:00'),
  },
  {
    key: 'villanueva',
    email: 'dr.paolo.villanueva@example.com',
    firstName: 'Paolo',
    lastName: 'Villanueva',
    specializations: ['psychiatry'],
    languages: ['English', 'Filipino'],
    timezone: 'Asia/Manila',
    yearsExperience: 11,
    consultationMinutes: 45,
    verificationStatus: 'APPROVED',
    bio: 'Psychiatrist supporting adults with anxiety, low mood and sleep problems.',
    availability: [...weekdays('13:00', '18:00', [1, 3]), [4, '18:00', '21:00']],
  },
  {
    key: 'tanaka',
    email: 'dr.hana.tanaka@example.com',
    firstName: 'Hana',
    lastName: 'Tanaka',
    specializations: ['ent'],
    languages: ['English', 'Japanese'],
    timezone: 'Asia/Tokyo',
    yearsExperience: 14,
    consultationMinutes: 30,
    verificationStatus: 'APPROVED',
    bio: 'Ear, nose and throat specialist with an interest in hearing and sinus care.',
    availability: [
      ...weekdays('10:00', '12:30', [2, 3, 4, 5]),
      ...weekdays('13:30', '16:00', [2, 3, 4, 5]),
    ],
  },
  {
    key: 'bautista',
    email: 'dr.ramon.bautista@example.com',
    firstName: 'Ramon',
    lastName: 'Bautista',
    specializations: ['orthopedics'],
    languages: ['English', 'Filipino', 'Hiligaynon'],
    timezone: 'Asia/Manila',
    yearsExperience: 16,
    consultationMinutes: 30,
    verificationStatus: 'APPROVED',
    bio: 'Orthopedic surgeon helping patients with joint pain, back pain and sports injuries.',
    availability: weekdays('13:00', '17:00', [1, 2, 4]),
    blockedDayOffsets: [{ offset: 8, reason: 'Medical conference (fictional)' }],
  },
  {
    key: 'aquino',
    email: 'dr.carmela.aquino@example.com',
    firstName: 'Carmela',
    lastName: 'Aquino',
    specializations: ['ob-gyn'],
    languages: ['English', 'Filipino'],
    timezone: 'Asia/Manila',
    yearsExperience: 13,
    consultationMinutes: 30,
    verificationStatus: 'APPROVED',
    bio: "Obstetrician-gynecologist providing prenatal and women's health consultations.",
    availability: weekdays('09:00', '13:00', [1, 3, 5]),
  },
  {
    key: 'mendoza',
    email: 'dr.luis.mendoza@example.com',
    firstName: 'Luis',
    lastName: 'Mendoza',
    specializations: ['neurology'],
    languages: ['English', 'Filipino'],
    timezone: 'Asia/Manila',
    yearsExperience: 6,
    consultationMinutes: 30,
    verificationStatus: 'APPROVED',
    bio: 'Neurologist seeing patients with headaches, migraine, dizziness and numbness.',
    availability: weekdays('09:00', '12:00', [2, 4]),
  },
  {
    key: 'cruz',
    email: 'dr.ana.cruz@example.com',
    firstName: 'Ana',
    lastName: 'Cruz',
    specializations: ['pediatrics'],
    languages: ['English', 'Filipino', 'Ilocano'],
    timezone: 'Asia/Manila',
    yearsExperience: 9,
    consultationMinutes: 30,
    verificationStatus: 'PENDING',
    bio: 'Pediatrician caring for newborns through teenagers.',
    availability: [...weekdays('09:00', '15:00', [2, 4]), [6, '08:00', '11:00']],
  },
  {
    key: 'navarro',
    email: 'dr.bea.navarro@example.com',
    firstName: 'Bea',
    lastName: 'Navarro',
    specializations: ['gastroenterology'],
    languages: ['English', 'Filipino', 'Cebuano'],
    timezone: 'Asia/Dubai',
    yearsExperience: 8,
    consultationMinutes: 30,
    verificationStatus: 'PENDING',
    bio: 'Gastroenterologist working from Dubai, focused on reflux and bowel health.',
    availability: weekdays('09:00', '13:00', [0, 1, 2, 3, 4]),
  },
  {
    key: 'ocampo',
    email: 'dr.mark.ocampo@example.com',
    firstName: 'Mark',
    lastName: 'Ocampo',
    specializations: ['general-practice'],
    languages: ['English'],
    timezone: 'Asia/Manila',
    yearsExperience: 3,
    consultationMinutes: 30,
    verificationStatus: 'REJECTED',
    reviewNote:
      'License number could not be verified. Please resubmit a valid (fictional) license.',
    bio: 'General practitioner offering consultations for common illnesses.',
    availability: [[6, '09:00', '12:00']],
  },
];

export type PatientKey = 'juan' | 'liza' | 'miguel' | 'sofia' | 'tony';

export interface PatientSeed {
  key: PatientKey;
  email: string;
  firstName: string;
  lastName: string;
  /** ISO date (YYYY-MM-DD). */
  birthDate: string;
  weightKg: string;
  heightCm: string;
  phone: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  pastSurgeries: string;
}

export const PATIENTS: PatientSeed[] = [
  {
    key: 'juan',
    email: 'juan.delacruz@example.com',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    birthDate: '1985-03-14',
    weightKg: '72.50',
    heightCm: '170.00',
    phone: '+63 900 555 0101',
    city: 'Quezon City',
    emergencyContactName: 'Rosa Dela Cruz',
    emergencyContactPhone: '+63 900 555 0102',
    allergies: 'Penicillin',
    chronicConditions: 'Hypertension',
    currentMedications: 'Amlodipine 5 mg once daily',
    pastSurgeries: 'Appendectomy (2010)',
  },
  {
    key: 'liza',
    email: 'liza.ramos@example.com',
    firstName: 'Liza',
    lastName: 'Ramos',
    birthDate: '1992-07-02',
    weightKg: '58.00',
    heightCm: '160.00',
    phone: '+63 900 555 0111',
    city: 'Cebu City',
    emergencyContactName: 'Carlo Ramos',
    emergencyContactPhone: '+63 900 555 0112',
    allergies: 'None known',
    chronicConditions: 'Mild asthma',
    currentMedications: 'Salbutamol inhaler as needed',
    pastSurgeries: 'None',
  },
  {
    key: 'miguel',
    email: 'miguel.torres@example.com',
    firstName: 'Miguel',
    lastName: 'Torres',
    birthDate: '1978-11-23',
    weightKg: '85.00',
    heightCm: '175.00',
    phone: '+63 900 555 0121',
    city: 'Davao City',
    emergencyContactName: 'Elena Torres',
    emergencyContactPhone: '+63 900 555 0122',
    allergies: 'Shellfish',
    chronicConditions: 'Type 2 diabetes; high cholesterol',
    currentMedications: 'Metformin 500 mg twice daily; Atorvastatin 20 mg at night',
    pastSurgeries: 'Right knee arthroscopy (2019)',
  },
  {
    key: 'sofia',
    email: 'sofia.mercado@example.com',
    firstName: 'Sofia',
    lastName: 'Mercado',
    birthDate: '2001-05-09',
    weightKg: '52.00',
    heightCm: '155.00',
    phone: '+63 900 555 0131',
    city: 'Makati City',
    emergencyContactName: 'Teresa Mercado',
    emergencyContactPhone: '+63 900 555 0132',
    allergies: 'Dust mites',
    chronicConditions: 'Atopic eczema; occasional migraine',
    currentMedications: 'Cetirizine 10 mg as needed',
    pastSurgeries: 'None',
  },
  {
    key: 'tony',
    email: 'antonio.lopez@example.com',
    firstName: 'Antonio',
    lastName: 'Lopez',
    birthDate: '1958-01-30',
    weightKg: '68.00',
    heightCm: '165.00',
    phone: '+63 900 555 0141',
    city: 'Iloilo City',
    emergencyContactName: 'Carmen Lopez',
    emergencyContactPhone: '+63 900 555 0142',
    allergies: 'Aspirin',
    chronicConditions: 'Knee osteoarthritis; GERD',
    currentMedications: 'Omeprazole 20 mg daily; Paracetamol 500 mg as needed',
    pastSurgeries: 'Cholecystectomy (2015); cataract surgery, left eye (2021)',
  },
];

/** Builds the fake license number shown on a doctor's profile. */
export function fakeLicenseNumber(index: number): string {
  return `FAKE-PRC-${String(100231 + index * 17).padStart(7, '0')}`;
}
