import { z } from 'zod';

import { ErrorCode } from './enums';

/** JSON body of every API error response. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  code: z.enum(ErrorCode),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
