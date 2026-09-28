import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@doksabahay/shared';

import { DomainException } from '../common/errors/domain.exception';

/**
 * No such notification, or it does not belong to the caller. Deliberately
 * the same 404 either way (never 403), matching this project's established
 * IDOR philosophy for `AppointmentNotFoundException`: a caller who does not
 * own a notification cannot tell whether it exists at all.
 */
export class NotificationNotFoundException extends DomainException {
  constructor() {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Notification not found.');
  }
}
