import { ValidationError, ValidationPipe } from '@nestjs/common';

import { ValidationFailedException } from './errors/domain.exception';

/** Global DTO validation: unknown fields are rejected and payloads become DTO instances. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new ValidationFailedException(flattenValidationErrors(errors).join('; ')),
  });
}

/** Collects constraint messages from nested class-validator errors, prefixed with the parent path. */
export function flattenValidationErrors(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const own = Object.values(error.constraints ?? {}).map((text) =>
      parent ? `${parent}.${text}` : text,
    );
    const path = parent ? `${parent}.${error.property}` : error.property;
    return [...own, ...flattenValidationErrors(error.children ?? [], path)];
  });
}
