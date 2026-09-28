import { apiErrorSchema, type ErrorCode } from '@doksabahay/shared';
import type { z } from 'zod';

/**
 * Error thrown for failed API calls. `statusCode` is 0 when the API could not
 * be reached at all; `code` is the API's machine-readable error code, if any.
 * `details` carries structured, error-specific extras (e.g. the appointments
 * affected by a SCHEDULE_CONFLICT), when the API sent any.
 */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode | undefined,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions<T> {
  method?: Method;
  /** Sent as JSON. */
  body?: unknown;
  /** Validates the response body. Omit for endpoints without a body (e.g. 204). */
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
}

/** A 401 from these means "bad credentials" or "no session", never "access token expired". */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Asks the API to rotate the refresh token. Concurrent callers share one
 * request: sending the same refresh token twice would look like token reuse
 * to the API, which then revokes the whole session.
 *
 * @returns Whether a new access token was issued.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * Calls the API through the same-origin `/api/*` rewrite with cookies. On a
 * 401 it refreshes the session once and retries, so an expired access token
 * is renewed transparently.
 *
 * @throws ApiError for non-2xx responses and network failures.
 */
export async function apiRequest<T = void>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> {
  let response = await send(path, options);

  const mayRefresh = !NO_REFRESH_PATHS.some((prefix) => path.startsWith(prefix));
  if (response.status === 401 && mayRefresh && (await refreshSession())) {
    response = await send(path, options);
  }

  const body = await readJson(response);
  if (!response.ok) {
    throw toApiError(response.status, body);
  }
  return options.schema ? options.schema.parse(body) : (undefined as T);
}

/** Shorthands for {@link apiRequest}. */
export const api = {
  get: <T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) =>
    apiRequest(path, { schema, signal }),
  post: <T = void>(path: string, body?: unknown, schema?: z.ZodType<T>) =>
    apiRequest(path, { method: 'POST', body, schema }),
  put: <T = void>(path: string, body?: unknown, schema?: z.ZodType<T>) =>
    apiRequest(path, { method: 'PUT', body, schema }),
  patch: <T = void>(path: string, body?: unknown, schema?: z.ZodType<T>) =>
    apiRequest(path, { method: 'PATCH', body, schema }),
  delete: <T = void>(path: string, schema?: z.ZodType<T>) =>
    apiRequest(path, { method: 'DELETE', schema }),
};

async function send(path: string, options: ApiRequestOptions<unknown>): Promise<Response> {
  const hasBody = options.body !== undefined;
  try {
    return await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(hasBody && { 'Content-Type': 'application/json' }),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      0,
      undefined,
      'Unable to reach the server. Check your connection and try again.',
    );
  }
}

function toApiError(statusCode: number, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  return parsed.success
    ? new ApiError(statusCode, parsed.data.code, parsed.data.message, parsed.data.details)
    : new ApiError(statusCode, undefined, `Request failed with status ${statusCode}.`);
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
