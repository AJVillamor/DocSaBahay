import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { createValidationPipe } from './common/validation';

export interface AppSetupOptions {
  /** The only browser origin allowed to call the API with credentials. */
  webOrigin: string;
}

/**
 * Applies the global HTTP middleware, validation and error handling.
 * Shared by `main.ts` and the Supertest suites so tests exercise the real setup.
 */
export function configureApp(app: INestApplication, options: AppSetupOptions): void {
  app.use(helmet());
  app.enableCors({ origin: options.webOrigin, credentials: true });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
}
