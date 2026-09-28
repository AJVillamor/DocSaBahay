import { PrismaClient } from '@prisma/client';

/**
 * Seeds fictional development data. Placeholder until the first models exist;
 * the auth change will create the ADMIN_EMAIL / ADMIN_PASSWORD admin here.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Seed: nothing to seed yet.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
