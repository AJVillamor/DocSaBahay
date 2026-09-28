import { z } from 'zod';

import { DbStatus } from './enums';

/** Response body of `GET /health`. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  db: z.enum(DbStatus),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
