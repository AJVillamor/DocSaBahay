import { z } from 'zod';

/** One entry of `GET /specializations`. */
export const specializationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
});

export const specializationListSchema = z.array(specializationSchema);

export type Specialization = z.infer<typeof specializationSchema>;
