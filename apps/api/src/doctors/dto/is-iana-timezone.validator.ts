import { registerDecorator, type ValidationOptions } from 'class-validator';
import { IANAZone } from 'luxon';

/** Validates a string is a real IANA time zone (e.g. "Asia/Manila"), via Luxon. */
export function IsIanaTimezone(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && IANAZone.isValidZone(value);
        },
        defaultMessage(): string {
          return 'timezone must be a valid IANA time zone (e.g. Asia/Manila).';
        },
      },
    });
  };
}
