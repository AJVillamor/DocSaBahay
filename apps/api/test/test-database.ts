import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Returns `DATABASE_URL_TEST` (from the environment or apps/api/.env).
 * Refuses any database whose name does not end in `_test`, so integration
 * tests can never wipe the development or production database.
 */
export function testDatabaseUrl(): string {
  const envFile = resolve(__dirname, '../.env');
  if (!process.env.DATABASE_URL_TEST && existsSync(envFile)) {
    // Not process.loadEnvFile(): it writes to the real process.env, which Jest
    // sandboxes per test file, so later test files would not see the value.
    const { DATABASE_URL_TEST } = parseEnv(readFileSync(envFile, 'utf8'));
    if (DATABASE_URL_TEST) process.env.DATABASE_URL_TEST = DATABASE_URL_TEST;
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
