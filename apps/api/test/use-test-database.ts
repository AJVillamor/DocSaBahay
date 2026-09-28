import { testDatabaseUrl } from './test-database';

// Point every PrismaClient created in a test worker at the test database.
process.env.DATABASE_URL = testDatabaseUrl();

// Test-only defaults so AppModule's env validation passes without a .env file (e.g. in CI).
process.env.WEB_ORIGIN ??= 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET ??= 'test-only-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??= 'test-only-refresh-secret-0123456789abcdef';
