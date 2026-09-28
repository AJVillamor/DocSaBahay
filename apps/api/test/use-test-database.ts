import { testDatabaseUrl } from './test-database';

// Point every PrismaClient created in a test worker at the test database.
process.env.DATABASE_URL = testDatabaseUrl();
