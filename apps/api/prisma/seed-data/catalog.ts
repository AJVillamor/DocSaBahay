// Reference data for specializations and symptom matching. All fictional.

export type SpecializationSlug =
  | 'general-practice'
  | 'internal-medicine'
  | 'pediatrics'
  | 'dermatology'
  | 'cardiology'
  | 'psychiatry'
  | 'ent'
  | 'orthopedics'
  | 'ob-gyn'
  | 'neurology'
  | 'gastroenterology';

export interface SpecializationSeed {
  slug: SpecializationSlug;
  name: string;
  description: string;
}

export const SPECIALIZATIONS: SpecializationSeed[] = [
  {
    slug: 'general-practice',
    name: 'General Practice',
    description: 'First point of care for common illnesses, check-ups and referrals.',
  },
  {
    slug: 'internal-medicine',
    name: 'Internal Medicine',
    description:
      'Adult medicine, including long-term conditions such as diabetes and hypertension.',
  },
  {
    slug: 'pediatrics',
    name: 'Pediatrics',
    description: 'Care for infants, children and adolescents.',
  },
  {
    slug: 'dermatology',
    name: 'Dermatology',
    description: 'Conditions of the skin, hair and nails.',
  },
  {
    slug: 'cardiology',
    name: 'Cardiology',
    description: 'Heart and blood vessel conditions.',
  },
  {
    slug: 'psychiatry',
    name: 'Psychiatry',
    description: 'Mental health, mood, anxiety and sleep concerns.',
  },
  {
    slug: 'ent',
    name: 'ENT',
    description: 'Ear, nose and throat conditions.',
  },
  {
    slug: 'orthopedics',
    name: 'Orthopedics',
    description: 'Bones, joints, muscles and sports injuries.',
  },
  {
    slug: 'ob-gyn',
    name: 'OB-GYN',
    description: "Women's health, pregnancy and reproductive care.",
  },
  {
    slug: 'neurology',
    name: 'Neurology',
    description: 'Brain, spine and nerve conditions such as migraine and numbness.',
  },
  {
    slug: 'gastroenterology',
    name: 'Gastroenterology',
    description: 'Digestive system conditions, including the stomach, bowel and liver.',
  },
];

/** `[specialization, weight 1–5]`. */
type Rule = [SpecializationSlug, number];

export interface SymptomSeed {
  slug: string;
  name: string;
  category: string;
  isRedFlag?: boolean;
  rules: Rule[];
}

export const SYMPTOMS: SymptomSeed[] = [
  // General
  {
    slug: 'fever',
    name: 'Fever',
    category: 'General',
    rules: [
      ['general-practice', 5],
      ['internal-medicine', 4],
      ['pediatrics', 3],
    ],
  },
  {
    slug: 'fatigue',
    name: 'Fatigue',
    category: 'General',
    rules: [
      ['general-practice', 4],
      ['internal-medicine', 4],
    ],
  },
  {
    slug: 'unexplained-weight-loss',
    name: 'Unexplained weight loss',
    category: 'General',
    rules: [
      ['internal-medicine', 5],
      ['gastroenterology', 3],
    ],
  },
  {
    slug: 'dizziness',
    name: 'Dizziness',
    category: 'General',
    rules: [
      ['neurology', 4],
      ['internal-medicine', 3],
      ['ent', 2],
    ],
  },
  {
    slug: 'severe-bleeding',
    name: 'Severe bleeding',
    category: 'General',
    isRedFlag: true,
    rules: [
      ['general-practice', 5],
      ['internal-medicine', 4],
    ],
  },
  // Respiratory
  {
    slug: 'cough',
    name: 'Cough',
    category: 'Respiratory',
    rules: [
      ['general-practice', 5],
      ['internal-medicine', 3],
      ['ent', 2],
    ],
  },
  {
    slug: 'wheezing',
    name: 'Wheezing',
    category: 'Respiratory',
    rules: [
      ['internal-medicine', 4],
      ['pediatrics', 3],
    ],
  },
  {
    slug: 'difficulty-breathing',
    name: 'Difficulty breathing',
    category: 'Respiratory',
    isRedFlag: true,
    rules: [
      ['internal-medicine', 5],
      ['cardiology', 4],
    ],
  },
  // Cardiovascular
  {
    slug: 'chest-pain',
    name: 'Chest pain',
    category: 'Cardiovascular',
    isRedFlag: true,
    rules: [
      ['cardiology', 5],
      ['internal-medicine', 4],
    ],
  },
  {
    slug: 'palpitations',
    name: 'Palpitations',
    category: 'Cardiovascular',
    rules: [
      ['cardiology', 5],
      ['internal-medicine', 3],
    ],
  },
  {
    slug: 'leg-swelling',
    name: 'Leg or ankle swelling',
    category: 'Cardiovascular',
    rules: [
      ['cardiology', 4],
      ['internal-medicine', 3],
    ],
  },
  {
    slug: 'high-blood-pressure',
    name: 'High blood pressure',
    category: 'Cardiovascular',
    rules: [
      ['cardiology', 4],
      ['internal-medicine', 4],
      ['general-practice', 3],
    ],
  },
  // Skin
  {
    slug: 'rash',
    name: 'Rash',
    category: 'Skin',
    rules: [
      ['dermatology', 5],
      ['general-practice', 2],
      ['pediatrics', 2],
    ],
  },
  {
    slug: 'itching',
    name: 'Itching',
    category: 'Skin',
    rules: [
      ['dermatology', 5],
      ['general-practice', 2],
    ],
  },
  { slug: 'acne', name: 'Acne', category: 'Skin', rules: [['dermatology', 5]] },
  {
    slug: 'hair-loss',
    name: 'Hair loss',
    category: 'Skin',
    rules: [
      ['dermatology', 5],
      ['internal-medicine', 2],
    ],
  },
  // Ear, nose and throat
  {
    slug: 'sore-throat',
    name: 'Sore throat',
    category: 'Ear, nose and throat',
    rules: [
      ['ent', 5],
      ['general-practice', 4],
    ],
  },
  {
    slug: 'ear-pain',
    name: 'Ear pain',
    category: 'Ear, nose and throat',
    rules: [
      ['ent', 5],
      ['pediatrics', 2],
    ],
  },
  {
    slug: 'nasal-congestion',
    name: 'Nasal congestion',
    category: 'Ear, nose and throat',
    rules: [
      ['ent', 4],
      ['general-practice', 3],
    ],
  },
  // Digestive
  {
    slug: 'abdominal-pain',
    name: 'Abdominal pain',
    category: 'Digestive',
    rules: [
      ['gastroenterology', 5],
      ['general-practice', 3],
      ['internal-medicine', 3],
    ],
  },
  {
    slug: 'diarrhea',
    name: 'Diarrhea',
    category: 'Digestive',
    rules: [
      ['gastroenterology', 4],
      ['general-practice', 3],
      ['pediatrics', 2],
    ],
  },
  {
    slug: 'heartburn',
    name: 'Heartburn',
    category: 'Digestive',
    rules: [
      ['gastroenterology', 5],
      ['internal-medicine', 2],
    ],
  },
  {
    slug: 'vomiting-blood',
    name: 'Vomiting blood',
    category: 'Digestive',
    isRedFlag: true,
    rules: [
      ['gastroenterology', 5],
      ['internal-medicine', 4],
    ],
  },
  // Neurological
  {
    slug: 'headache',
    name: 'Headache',
    category: 'Neurological',
    rules: [
      ['neurology', 4],
      ['general-practice', 3],
      ['internal-medicine', 2],
    ],
  },
  {
    slug: 'numbness-tingling',
    name: 'Numbness or tingling',
    category: 'Neurological',
    rules: [
      ['neurology', 5],
      ['internal-medicine', 2],
    ],
  },
  {
    slug: 'sudden-weakness-one-side',
    name: 'Sudden weakness on one side',
    category: 'Neurological',
    isRedFlag: true,
    rules: [
      ['neurology', 5],
      ['internal-medicine', 4],
    ],
  },
  // Musculoskeletal
  {
    slug: 'joint-pain',
    name: 'Joint pain',
    category: 'Musculoskeletal',
    rules: [
      ['orthopedics', 5],
      ['internal-medicine', 3],
    ],
  },
  {
    slug: 'back-pain',
    name: 'Back pain',
    category: 'Musculoskeletal',
    rules: [
      ['orthopedics', 5],
      ['general-practice', 3],
    ],
  },
  // Mental health
  {
    slug: 'anxiety',
    name: 'Anxiety',
    category: 'Mental health',
    rules: [
      ['psychiatry', 5],
      ['general-practice', 2],
    ],
  },
  {
    slug: 'low-mood',
    name: 'Low mood',
    category: 'Mental health',
    rules: [
      ['psychiatry', 5],
      ['general-practice', 2],
    ],
  },
  {
    slug: 'insomnia',
    name: 'Trouble sleeping',
    category: 'Mental health',
    rules: [
      ['psychiatry', 4],
      ['internal-medicine', 2],
    ],
  },
  {
    slug: 'thoughts-of-self-harm',
    name: 'Thoughts of self-harm',
    category: 'Mental health',
    isRedFlag: true,
    rules: [['psychiatry', 5]],
  },
  // Women's health
  {
    slug: 'irregular-periods',
    name: 'Irregular periods',
    category: "Women's health",
    rules: [
      ['ob-gyn', 5],
      ['internal-medicine', 2],
    ],
  },
  {
    slug: 'pregnancy-concerns',
    name: 'Pregnancy concerns',
    category: "Women's health",
    rules: [['ob-gyn', 5]],
  },
];

export interface KeywordSeed {
  /** Lowercase (enforced by a DB CHECK). */
  phrase: string;
  /** `null` for red-flag phrases that apply regardless of specialization. */
  specialization: SpecializationSlug | null;
  weight: number;
  isRedFlag?: boolean;
}

const kw = (
  specialization: SpecializationSlug,
  weight: number,
  ...phrases: string[]
): KeywordSeed[] => phrases.map((phrase) => ({ phrase, specialization, weight }));

const redFlag = (specialization: SpecializationSlug | null, ...phrases: string[]): KeywordSeed[] =>
  phrases.map((phrase) => ({ phrase, specialization, weight: 5, isRedFlag: true }));

export const KEYWORDS: KeywordSeed[] = [
  ...kw(
    'general-practice',
    3,
    'fever',
    'flu',
    'common cold',
    'cough',
    'body aches',
    'check-up',
    'medical certificate',
  ),
  ...kw('internal-medicine', 4, 'diabetes', 'blood sugar', 'thyroid', 'fatigue', 'weight loss'),
  ...kw('pediatrics', 4, 'my child', 'baby', 'toddler', 'teething', 'vaccine schedule'),
  ...kw(
    'dermatology',
    5,
    'rash',
    'itchy skin',
    'acne',
    'pimples',
    'eczema',
    'hives',
    'hair loss',
    'dandruff',
    'mole',
  ),
  ...kw(
    'cardiology',
    5,
    'palpitations',
    'racing heart',
    'high blood pressure',
    'hypertension',
    'swollen ankles',
    'cholesterol',
  ),
  ...kw(
    'psychiatry',
    5,
    'anxiety',
    'depression',
    'panic attack',
    "can't sleep",
    'insomnia',
    'stress',
    'feeling down',
  ),
  ...kw(
    'ent',
    5,
    'sore throat',
    'ear pain',
    'earache',
    'blocked nose',
    'sinus',
    'tonsils',
    'hoarse voice',
    'ringing in ears',
  ),
  ...kw(
    'orthopedics',
    5,
    'back pain',
    'joint pain',
    'knee pain',
    'sprain',
    'neck pain',
    'shoulder pain',
  ),
  ...kw(
    'ob-gyn',
    5,
    'pregnant',
    'missed period',
    'menstrual cramps',
    'irregular period',
    'prenatal',
  ),
  ...kw('neurology', 5, 'migraine', 'headache', 'numbness', 'tingling', 'vertigo', 'tremor'),
  ...kw(
    'gastroenterology',
    5,
    'stomach ache',
    'acid reflux',
    'heartburn',
    'diarrhea',
    'constipation',
    'bloating',
    'nausea',
  ),
  // Red flags: the UI should urge emergency care instead of (or before) booking.
  ...redFlag('cardiology', 'chest pain', 'crushing chest pressure'),
  ...redFlag('internal-medicine', 'difficulty breathing', 'shortness of breath', "can't breathe"),
  ...redFlag('neurology', 'sudden weakness', 'face drooping', 'slurred speech', 'seizure'),
  ...redFlag('gastroenterology', 'vomiting blood'),
  ...redFlag('psychiatry', 'thoughts of self-harm', 'self-harm', 'want to die', 'suicide'),
  ...redFlag(null, 'severe bleeding', 'coughing blood', 'unconscious', 'fainted'),
];
