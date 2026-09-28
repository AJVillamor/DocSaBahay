import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Returns `DATABASE_URL_TEST` (from the environment or apps/api/.env).
 * Refuses any database whose name does not end in `_test`, so integration
 * tests can never wipe the development or production database.
 */
export function testDatabaseUrl(): string {
  const envFile = resolve(__dirname, '../.env');
  if (!process.env.DATABASE_URL_TEST && existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set (see apps/api/.env.example).');
  }
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run integration tests against non-test database "${dbName}".`);
  }
  return url;
}
