import { z } from 'zod';

import { doctorListItemSchema } from './doctor-discovery';

/** One symptom, as returned by `GET /matching/symptoms`. */
export const symptomSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.string(),
  isRedFlag: z.boolean(),
});

export type Symptom = z.infer<typeof symptomSchema>;

/** Response body of `GET /matching/symptoms`: symptoms grouped by category. */
export const symptomsByCategorySchema = z.array(
  z.object({ category: z.string(), symptoms: z.array(symptomSchema) }),
);

export type SymptomsByCategory = z.infer<typeof symptomsByCategorySchema>;

/** Body of `POST /matching/suggest`. */
export const suggestMatchInputSchema = z.object({
  symptomIds: z.array(z.uuid()).max(50, 'Choose at most 50 symptoms.'),
  description: z.string().trim().max(1000, 'Use at most 1000 characters.').optional(),
});

export type SuggestMatchInput = z.infer<typeof suggestMatchInputSchema>;

/** One symptom or matched phrase that contributed to a specialization's score. */
export const matchExplanationEntrySchema = z.object({
  type: z.enum(['symptom', 'phrase']),
  label: z.string(),
  weight: z.number().int(),
});

export type MatchExplanationEntry = z.infer<typeof matchExplanationEntrySchema>;

/** One ranked specialization suggestion, with why it was suggested and doctors to book. */
export const specializationMatchSchema = z.object({
  specializationId: z.uuid(),
  name: z.string(),
  score: z.number().int(),
  explanation: z.array(matchExplanationEntrySchema),
  doctors: z.array(doctorListItemSchema),
});

export type SpecializationMatch = z.infer<typeof specializationMatchSchema>;

/** Response body of `POST /matching/suggest`. */
export const suggestMatchResponseSchema = z.object({
  /** True if any selected symptom or matched phrase is a red flag. */
  urgent: z.boolean(),
  results: z.array(specializationMatchSchema),
});

export type SuggestMatchResponse = z.infer<typeof suggestMatchResponseSchema>;
