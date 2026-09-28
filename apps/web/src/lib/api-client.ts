import { apiErrorSchema, type ErrorCode } from '@doksabahay/shared';
import type { z } from 'zod';

/** Error thrown for non-2xx API responses, carrying the API's error `code` when present. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * GETs a JSON resource from the API through the same-origin `/api/*` rewrite
 * and validates the body against `schema`.
 */
export async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  const body = await readJson(response);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiRequestError(
      response.status,
      parsed.success ? parsed.data.code : undefined,
      parsed.success ? parsed.data.message : `Request failed with status ${response.status}`,
    );
  }

  return schema.parse(body);
}

/** Returns the parsed JSON body, or `null` when the body is empty or not JSON (e.g. proxy errors). */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
