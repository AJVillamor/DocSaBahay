import * as shared from '@doksabahay/shared';
import { $Enums } from '@prisma/client';

/**
 * The frontend imports enums from @doksabahay/shared while the API persists the
 * Prisma-generated ones. This guards against the two drifting apart.
 */
describe('shared enums mirror the Prisma schema', () => {
  const sharedEnums = shared as unknown as Record<string, Record<string, string> | undefined>;

  it.each(Object.keys($Enums))('%s has identical values', (name) => {
    const prismaValues = Object.values($Enums[name as keyof typeof $Enums]).sort();
    const sharedEnum = sharedEnums[name];

    expect(sharedEnum).toBeDefined();
    expect(Object.values(sharedEnum ?? {}).sort()).toEqual(prismaValues);
  });
});
