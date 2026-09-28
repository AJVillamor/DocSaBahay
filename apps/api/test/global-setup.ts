import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { testDatabaseUrl } from './test-database';

/** Rebuilds the test database from the committed migrations before the suite runs. */
export default function globalSetup(): void {
  const url = testDatabaseUrl();
  execFileSync(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'reset', '--force', '--skip-seed', '--skip-generate'],
    {
      cwd: resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'inherit',
    },
  );
}
