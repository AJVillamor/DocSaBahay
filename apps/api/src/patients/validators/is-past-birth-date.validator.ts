import { MAX_AGE_YEARS } from '@doksabahay/shared';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { DateTime } from 'luxon';

/**
 * Validates that a `YYYY-MM-DD` birth date is a real calendar date, is in the
 * past, and implies an age under {@link MAX_AGE_YEARS} years. Pair with
 * `@IsDateString()` so a structurally invalid value fails with a clearer message.
 */
export function IsPastBirthDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isPastBirthDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          const birthDate = DateTime.fromISO(value, { zone: 'utc' });
          if (!birthDate.isValid) {
            return false;
          }
          const now = DateTime.utc();
          if (birthDate >= now) {
            return false;
          }
          const impliedAgeYears = now.diff(birthDate, 'years').years;
          return impliedAgeYears < MAX_AGE_YEARS;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args?.property ?? 'birthDate'} must be a real date in the past, implying an age under ${MAX_AGE_YEARS} years.`;
        },
      },
    });
  };
}
