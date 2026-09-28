import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiError, ErrorCode } from '@doksabahay/shared';
import type { Request, Response } from 'express';

import { DomainException } from './domain.exception';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

/**
 * Maps every thrown error to the API error contract `{ statusCode, message, code }`.
 * Unknown errors become a generic 500 so internals never leak to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const body = toApiError(exception);

    if (body.statusCode >= 500) {
      // Path only (no query string or body) so tokens and clinical content are never logged.
      this.logger.error(
        `${request.method} ${request.path} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }
}

/** Converts a thrown value into the public error body. */
export function toApiError(exception: unknown): ApiError {
  if (exception instanceof DomainException) {
    return { statusCode: exception.statusCode, message: exception.message, code: exception.code };
  }

  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    return {
      statusCode,
      message: httpExceptionMessage(exception),
      code:
        CODE_BY_STATUS[statusCode] ??
        (statusCode >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST),
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    code: ErrorCode.INTERNAL_ERROR,
  };
}

function httpExceptionMessage(exception: HttpException): string {
  const payload = exception.getResponse();
  if (typeof payload === 'string') {
    return payload;
  }
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.map(String).join('; ');
  }
  return typeof message === 'string' ? message : exception.message;
}
